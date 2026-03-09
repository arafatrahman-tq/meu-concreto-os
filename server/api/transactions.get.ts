import { eq, desc, and, gte, lte } from "drizzle-orm";
import { transactions } from "../database/schema";
import { db } from "../utils/db";
import { requireCompanyAccess } from "../utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined;
  const type = query.type as string;
  const status = query.status as string;
  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : undefined;
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined;

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: "O ID da empresa é obrigatório",
    });
  }

  await requireCompanyAccess(event, companyId);

  try {
    const conditions = [];

    conditions.push(eq(transactions.companyId, companyId));
    if (type) conditions.push(eq(transactions.type, type as any));
    if (status) conditions.push(eq(transactions.status, status as any));
    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));

    const allTransactions = await db.query.transactions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      with: {
        sale: {
          with: {
            items: true,
          },
        },
        user: true, // Include creator
      },
    });

    return { transactions: allTransactions };
  } catch (e: any) {
    console.error("Get Transactions Error:", e);
    throw createError({
      statusCode: 500,
      message: "Erro interno do servidor",
      data: { message: e.message },
    });
  }
});
