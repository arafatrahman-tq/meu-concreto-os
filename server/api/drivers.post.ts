import { drivers } from "#server/database/schema";
import { driverSchema } from "#server/utils/schemas";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = driverSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Falha na validação",
      data: result.error.flatten(),
    });
  }

  await requireCompanyAccess(event, result.data.companyId);

  try {
    const [newDriver] = await db
      .insert(drivers)
      .values(result.data)
      .returning();
    return { driver: newDriver };
  } catch (e: unknown) {
    console.error("Create Driver Error:", e);
    throw createError({
      statusCode: 500,
      message: "Erro interno do servidor",
      data: { message: e instanceof Error ? e.message : "Erro desconhecido" },
    });
  }
});
