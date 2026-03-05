import { eq } from "drizzle-orm";
import { transactions } from "../../database/schema";
import { transactionUpdateSchema } from "../../utils/schemas";
import { db, parseDate } from "../../utils/db";
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
  // requireManager(event); // REMOVED: Allowance for any user with company access to edit transactions

  const body = await readBody(event);
  const result = transactionUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: result.error.format(),
    });
  }

  const data = result.data;

  try {
    const updatedTransaction = await db
      .update(transactions)
      .set({
        ...data,
        date: parseDate(data.date),
        dueDate: parseDate(data.dueDate),
      })
      .where(eq(transactions.id, id))
      .returning()
      .get();

    if (!updatedTransaction) {
      throw createError({
        statusCode: 404,
        statusMessage: "Transaction not found",
      });
    }

    return { transaction: updatedTransaction };
  } catch (e: unknown) {
    console.error("Update Transaction Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
