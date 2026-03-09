import { eq } from "drizzle-orm";
import { sales, transactions } from "../../database/schema";
import { db } from "../../utils/db";
import { requireCompanyAccess } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const saleId = parseInt(id);

  const existing = await db
    .select({ companyId: sales.companyId, status: sales.status })
    .from(sales)
    .where(eq(sales.id, saleId))
    .get();
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });
  requireCompanyAccess(event, existing.companyId);

  const auth = event.context.auth;

  // Guard: Cannot delete completed sales (financial integrity).
  // Only admins are allowed — managers and regular users are blocked.
  if (existing.status === "completed") {
    if (auth?.role !== "admin") {
      throw createError({
        statusCode: 403,
        statusMessage:
          "Apenas administradores podem excluir vendas concluídas.",
      });
    }
  }

  // Guard: Cannot delete sales that have been billed (have transactions)
  const hasBilling = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.saleId, saleId))
    .get();
  if (hasBilling) {
    throw createError({
      statusCode: 422,
      statusMessage:
        "Esta venda já possui transações financeiras e não pode ser excluída.",
    });
  }

  try {
    const [deletedSale] = await db
      .delete(sales)
      .where(eq(sales.id, saleId))
      .returning();

    if (!deletedSale) {
      throw createError({ statusCode: 404, statusMessage: "Sale not found" });
    }

    return { message: "Sale deleted", sale: deletedSale };
  } catch (e: unknown) {
    console.error("Delete Sale Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
