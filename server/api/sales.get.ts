import { eq, desc, and, gte, lte } from "drizzle-orm";
import { sales } from "../database/schema";
import { db } from "../utils/db";
import { requireCompanyAccess } from "../utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined;
  const status = query.status as string;
  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : undefined;
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined;
  const minimal = query.minimal === "true";

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: "Missing companyId parameter",
    });
  }

  // Secure: verify multi-tenant access
  requireCompanyAccess(event, companyId);

  try {
    const conditions = [eq(sales.companyId, companyId)];

    if (status) conditions.push(eq(sales.status, status as any));
    if (startDate) conditions.push(gte(sales.date, startDate));
    if (endDate) conditions.push(lte(sales.date, endDate));

    const allSales = await db.query.sales.findMany({
      where: conditions.length > 1 ? and(...conditions) : conditions[0],
      orderBy: [desc(sales.createdAt)],
      // Dashboard needs minimal data, but we need items for concrete volume
      with: minimal
        ? { seller: true, items: { columns: { quantity: true, unit: true } } }
        : { seller: true, items: true, transactions: true, drivers: true },
    });

    return { sales: allSales };
  } catch (e: any) {
    console.error("Get Sales Error:", e);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error",
      data: { message: e.message },
    });
  }
});
