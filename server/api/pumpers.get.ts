import { eq, and } from "drizzle-orm";
import { pumpers } from "#server/database/schema";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined;
  const activeOnly = query.active === "true";

  if (!companyId) {
    throw createError({ statusCode: 400, message: "O ID da empresa é obrigatório" });
  }

  await requireCompanyAccess(event, companyId);

  try {
    let whereClause = eq(pumpers.companyId, companyId);
    if (activeOnly) {
      whereClause = and(whereClause, eq(pumpers.active, true))!;
    }
    const result = await db.select().from(pumpers).where(whereClause).all();
    return { pumpers: result };
  } catch (e: unknown) {
    console.error("Get Pumpers Error:", e);
    throw createError({
      statusCode: 500,
      message: "Erro interno do servidor",
      data: { message: e instanceof Error ? e.message : "Erro desconhecido" },
    });
  }
});
