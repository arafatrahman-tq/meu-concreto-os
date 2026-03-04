import { eq } from "drizzle-orm";
import { transactions } from "../../database/schema";
import { db } from "../../utils/db";
import { requireCompanyAccess, requireManager } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (!id) throw createError({ statusCode: 400, statusMessage: "Invalid ID" });

  const existing = await db
    .select({ companyId: transactions.companyId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing)
    throw createError({
      statusCode: 404,
      statusMessage: "Transaction not found",
    });

  await requireCompanyAccess(event, existing.companyId);
  requireManager(event); // Only managers can delete transactions

  try {
    const deletedTransaction = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning()
      .get();

    if (!deletedTransaction) {
      throw createError({
        statusCode: 404,
        statusMessage: "Transaction not found",
      });
    }

    return { transaction: deletedTransaction };
  } catch (e: unknown) {
    console.error("Delete Transaction Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
