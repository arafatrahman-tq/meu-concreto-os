import { and, eq, ne } from "drizzle-orm";
import { transactions } from "../../../database/schema";
import { db, parseDate } from "../../../utils/db";
import { transactionInstallmentsSchema } from "../../../utils/schemas";
import { createNotification } from "../../../utils/notifications";
import { requireCompanyAccess } from "../../../utils/session";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID inválido" });

  const body = await readBody(event);
  const result = transactionInstallmentsSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Validation Error",
      data: result.error.format(),
    });
  }

  const data = result.data;
  await requireCompanyAccess(event, data.companyId);

  const original = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.companyId, data.companyId),
        ne(transactions.status, "cancelled"),
      ),
    )
    .get();

  if (!original) {
    throw createError({
      statusCode: 404,
      statusMessage:
        "Lançamento não encontrado ou indisponível para parcelamento",
    });
  }

  if (original.isInstallmentParent) {
    throw createError({
      statusCode: 400,
      statusMessage: "Este lançamento já é um agrupador de parcelas",
    });
  }

  if (original.parentTransactionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Não é permitido parcelar uma parcela existente",
    });
  }

  if ((original.amount ?? 0) <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valor inválido para parcelamento",
    });
  }

  const firstDueDate =
    parseDate(data.firstDueDate) ??
    original.dueDate ??
    original.date ??
    new Date();

  const totalAmount = original.amount;
  const baseInstallmentAmount = Math.floor(totalAmount / data.installments);
  const remainder = totalAmount - baseInstallmentAmount * data.installments;

  try {
    const createdInstallments = await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({
          isInstallmentParent: true,
          installmentNumber: null,
          installmentTotal: data.installments,
          parentTransactionId: null,
          status: "pending",
          description: `${original.description} (Parcelado em ${data.installments}x)`,
        })
        .where(eq(transactions.id, original.id));

      const values = Array.from({ length: data.installments }).map(
        (_, index) => {
          const installmentNumber = index + 1;
          const installmentAmount =
            installmentNumber === data.installments
              ? baseInstallmentAmount + remainder
              : baseInstallmentAmount;

          return {
            companyId: original.companyId,
            userId: original.userId,
            saleId: original.saleId,
            description: `${original.description} (${installmentNumber}/${data.installments})`,
            amount: installmentAmount,
            type: original.type,
            category: original.category,
            status: "pending" as const,
            date: original.date,
            dueDate: addDays(firstDueDate, index * data.intervalDays),
            paymentMethod: original.paymentMethod,
            parentTransactionId: original.id,
            installmentNumber,
            installmentTotal: data.installments,
            isInstallmentParent: false,
          };
        },
      );

      return await tx.insert(transactions).values(values).returning().all();
    });

    await createNotification({
      companyId: original.companyId,
      type: "transaction",
      title: "Parcelamento gerado",
      body: `${createdInstallments.length} parcelas criadas para ${original.description}`,
      link: "/transacoes",
      icon: "i-heroicons-receipt-percent",
    });

    return {
      parentTransactionId: original.id,
      installments: createdInstallments,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Create Transaction Installments Error:", error);
    throw createError({
      statusCode: 500,
      message: "Erro interno do servidor",
      data: { message: err.message ?? "Erro desconhecido" },
    });
  }
});
