import { and, eq } from "drizzle-orm";
import { companies, quotes, sales } from "../../database/schema";
import { db } from "../../utils/db";
import { requireCompanyAccess } from "../../utils/session";
import { unscopeCustomerDocument } from "../../utils/customer";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "ID required" });
  const customerId = parseInt(id);

  // 1. Fetch Customer as a Company record
  const customer = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, customerId), eq(companies.isCustomer, true)))
    .get();

  if (!customer) {
    throw createError({ statusCode: 404, message: "Customer not found" });
  }

  // 2. Tenant isolation
  if (customer.ownerCompanyId) {
    requireCompanyAccess(event, customer.ownerCompanyId);
  }

  // 3. Fetch activity summary (optional but helpful if the UI expects it)
  const [customerQuotes, customerSales] = await Promise.all([
    db
      .select()
      .from(quotes)
      .where(eq(quotes.customerName, customer.name))
      .all(),
    db.select().from(sales).where(eq(sales.customerName, customer.name)).all(),
  ]);

  return {
    customer: {
      ...customer,
      // Always return the clean CPF/CNPJ regardless of internal scoped format.
      document: unscopeCustomerDocument(customer.document),
      quotes: customerQuotes,
      sales: customerSales,
      stats: {
        quotesCount: customerQuotes.length,
        salesCount: customerSales.length,
        totalSpent: customerSales.reduce(
          (acc, s) => acc + (s.status === "completed" ? s.total : 0),
          0,
        ),
      },
    },
  };
});
