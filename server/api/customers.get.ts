import { and, eq } from "drizzle-orm";
import { companies } from "../database/schema";
import { db } from "../utils/db";
import { requireCompanyAccess } from "../utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined;

  if (!companyId) {
    throw createError({ statusCode: 400, message: "companyId required" });
  }

  requireCompanyAccess(event, companyId);

  // Fetch quotes and sales scoped to the company — no global company listing
  // to avoid exposing data from unrelated tenants.
  const [allQuotes, allSales] = await Promise.all([
    db.query.quotes.findMany({
      where: (q, { eq }) => eq(q.companyId, companyId),
      orderBy: (q, { desc }) => [desc(q.createdAt)],
    }),
    db.query.sales.findMany({
      where: (s, { eq }) => eq(s.companyId, companyId),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
  ]);

  // Aggregate unique customers derived from quotes and sales for this company.
  const customerMap = new Map<
    string,
    {
      id?: number;
      key: string;
      name: string;
      document: string;
      phone: string;
      address: string;
      quotesCount: number;
      salesCount: number;
      totalSpent: number; // cents
      totalQuoted: number; // cents
      lastActivityAt: number; // unix ms
      createdAt: number; // unix ms (first seen)
      pendingQuotes: number;
      approvedQuotes: number;
      completedSales: number;
      cancelledSales: number;
    }
  >();

  // ── Process quotes ────────────────────────────────────────────────
  for (const q of allQuotes) {
    const key =
      q.customerDocument?.trim() || q.customerName.trim().toLowerCase();
    const ts =
      q.createdAt instanceof Date
        ? q.createdAt.getTime()
        : Number(q.createdAt) * 1000;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        key,
        name: q.customerName,
        document: q.customerDocument ?? "",
        phone: q.customerPhone ?? "",
        address: q.customerAddress ?? "",
        quotesCount: 0,
        salesCount: 0,
        totalSpent: 0,
        totalQuoted: 0,
        lastActivityAt: ts,
        createdAt: ts,
        pendingQuotes: 0,
        approvedQuotes: 0,
        completedSales: 0,
        cancelledSales: 0,
      });
    }

    const c = customerMap.get(key)!;
    c.quotesCount++;
    c.totalQuoted += q.total;
    c.lastActivityAt = Math.max(c.lastActivityAt, ts);
    c.createdAt = Math.min(c.createdAt || ts, ts);
    if (q.status === "sent" || q.status === "draft") c.pendingQuotes++;
    if (q.status === "approved") c.approvedQuotes++;
    // Use most complete contact data available
    if (q.customerPhone && !c.phone) c.phone = q.customerPhone;
    if (q.customerAddress && !c.address) c.address = q.customerAddress;
  }

  // ── Process sales ─────────────────────────────────────────────────
  for (const s of allSales) {
    const key =
      s.customerDocument?.trim() || s.customerName.trim().toLowerCase();
    const ts =
      s.createdAt instanceof Date
        ? s.createdAt.getTime()
        : Number(s.createdAt) * 1000;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        key,
        name: s.customerName,
        document: s.customerDocument ?? "",
        phone: s.customerPhone ?? "",
        address: s.customerAddress ?? "",
        quotesCount: 0,
        salesCount: 0,
        totalSpent: 0,
        totalQuoted: 0,
        lastActivityAt: ts,
        createdAt: ts,
        pendingQuotes: 0,
        approvedQuotes: 0,
        completedSales: 0,
        cancelledSales: 0,
      });
    }

    const c = customerMap.get(key)!;
    c.salesCount++;
    c.lastActivityAt = Math.max(c.lastActivityAt, ts);
    c.createdAt = Math.min(c.createdAt || ts, ts);
    if (s.status === "completed") {
      c.totalSpent += s.total;
      c.completedSales++;
    }
    if (s.status === "cancelled") c.cancelledSales++;
    if (s.customerPhone && !c.phone) c.phone = s.customerPhone;
    if (s.customerAddress && !c.address) c.address = s.customerAddress;
  }

  // ── Include pre-registered customers (companies with isCustomer=true) ─
  // These are customers created via the Clientes form that may not yet have
  // any quotes or sales. Scoped to ownerCompanyId to preserve tenant isolation.
  const standaloneCustomers = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.isCustomer, true),
        eq(companies.ownerCompanyId, companyId)
      )
    )
    .all();

  for (const sc of standaloneCustomers) {
    const key = sc.document?.trim() || sc.name.trim().toLowerCase();
    const ts =
      sc.createdAt instanceof Date
        ? sc.createdAt.getTime()
        : Number(sc.createdAt) * 1000;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: sc.id,
        key,
        name: sc.name,
        document: sc.document ?? "",
        phone: sc.phone ?? "",
        address: sc.address ?? "",
        quotesCount: 0,
        salesCount: 0,
        totalSpent: 0,
        totalQuoted: 0,
        lastActivityAt: ts,
        createdAt: ts,
        pendingQuotes: 0,
        approvedQuotes: 0,
        completedSales: 0,
        cancelledSales: 0,
      });
    } else {
      const c = customerMap.get(key)!;
      c.createdAt = Math.min(c.createdAt, ts);
      if (!c.id) c.id = sc.id;
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt
  );

  return { customers };
});
