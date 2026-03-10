import { and, eq } from "drizzle-orm";
import { transactions } from "../../database/schema";
import { transactionUpdateSchema } from "../../utils/schemas";
import { db, parseDate } from "../../utils/db";
import { requireCompanyAccess } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (!id) throw createError({ statusCode: 400, statusMessage: "Invalid ID" });

  const existing = await db
    .select({
      id: transactions.id,
      companyId: transactions.companyId,
      status: transactions.status,
      isInstallmentParent: transactions.isInstallmentParent,
      parentTransactionId: transactions.parentTransactionId,
    })
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
    const firstIssue = result.error.issues[0];
    const firstField = String(firstIssue?.path?.[0] ?? "");
    const firstMessage =
      firstField === "paymentMethod"
        ? "Forma de pagamento invalida. Selecione uma opcao da lista."
        : firstIssue?.message;

    throw createError({
      statusCode: 400,
      statusMessage: "Dados invalidos",
      message: firstMessage ?? "Revise os campos e tente novamente.",
      data: result.error.format(),
    });
  }

  const data = result.data;

  try {
    const updatedTransaction = await db.transaction(async (tx) => {
      if (existing.isInstallmentParent && data.status) {
        const childInstallments = await tx
          .select({ status: transactions.status })
          .from(transactions)
          .where(eq(transactions.parentTransactionId, existing.id))
          .all();

        const allPaid =
          childInstallments.length > 0 &&
          childInstallments.every((child) => child.status === "paid");

        if (!allPaid && data.status !== "pending") {
          throw createError({
            statusCode: 400,
            statusMessage:
              "Todas as parcelas precisam estar pagas para marcar o agrupador como Pago.",
          });
        }
      }

      const updated = await tx
        .update(transactions)
        .set({
          ...data,
          date: parseDate(data.date),
          dueDate: parseDate(data.dueDate),
        })
        .where(eq(transactions.id, id))
        .returning()
        .get();

      if (!updated) {
        throw createError({
          statusCode: 404,
          statusMessage: "Transaction not found",
        });
      }

      const parentId =
        updated.parentTransactionId ??
        (updated.isInstallmentParent ? updated.id : null);

      if (parentId) {
        const childInstallments = await tx
          .select({ status: transactions.status })
          .from(transactions)
          .where(eq(transactions.parentTransactionId, parentId))
          .all();

        const allPaid =
          childInstallments.length > 0 &&
          childInstallments.every((child) => child.status === "paid");

        const nextParentStatus = allPaid ? "paid" : "pending";

        await tx
          .update(transactions)
          .set({ status: nextParentStatus })
          .where(
            and(
              eq(transactions.id, parentId),
              eq(transactions.isInstallmentParent, true),
            ),
          );

        if (updated.isInstallmentParent && updated.id === parentId) {
          return {
            ...updated,
            status: nextParentStatus,
          };
        }
      }

      return updated;
    });

    return { transaction: updatedTransaction };
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "statusCode" in e &&
      typeof (e as { statusCode?: unknown }).statusCode === "number"
    ) {
      throw e;
    }

    console.error("Update Transaction Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno ao atualizar transacao",
      message: "Nao foi possivel atualizar a transacao. Tente novamente.",
    });
  }
});
