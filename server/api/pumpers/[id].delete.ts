import { eq } from "drizzle-orm";
import { pumpers } from "#server/database/schema";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const pumperId = parseInt(id);

  const pumper = await db
    .select()
    .from(pumpers)
    .where(eq(pumpers.id, pumperId))
    .get();
  if (!pumper)
    throw createError({ statusCode: 404, statusMessage: "Pumper not found" });

  await requireCompanyAccess(event, pumper.companyId);

  try {
    const [deleted] = await db
      .delete(pumpers)
      .where(eq(pumpers.id, pumperId))
      .returning();
    if (!deleted)
      throw createError({ statusCode: 404, statusMessage: "Pumper not found" });
    return { success: true, id: pumperId };
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    console.error("Delete Pumper Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: { message: e instanceof Error ? e.message : "Erro desconhecido" },
    });
  }
});
