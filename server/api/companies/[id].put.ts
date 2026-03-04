import { eq } from "drizzle-orm";
import { companies } from "../../database/schema";
import { companyUpdateSchema } from "../../utils/schemas";
import { db } from "../../utils/db";
import { requireCompanyAccess, requireManager } from "../../utils/session";
import { createNotification } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, "id");
  if (!idParam)
    throw createError({ statusCode: 400, statusMessage: "ID required" });
  const idValue = parseInt(idParam);

  requireCompanyAccess(event, idValue);
  requireManager(event);

  const body = await readBody(event);
  const result = companyUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: result.error.flatten(),
    });
  }

  let updatedCompany: any = null;
  try {
    console.log(`[PUT] Updating company ID: ${idValue}`, result.data);

    // Separation of update/check to be more robust with drivers
    const updateRes = await db
      .update(companies)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, idValue))
      .run();

    console.log(
      `[PUT] Update executed. Rows affected: ${updateRes.rowsAffected}`,
    );

    updatedCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, idValue))
      .get();

    if (!updatedCompany) {
      console.warn(`[PUT] Company ID ${idValue} not found after update.`);
    } else {
      const isStatusChange =
        Object.keys(result.data).length === 1 && "active" in result.data;
      let title = "Dados da empresa atualizados";
      let icon = "i-heroicons-building-office-2";

      if (isStatusChange) {
        title = updatedCompany.active
          ? "Empresa ativada"
          : "Empresa desativada";
        icon = updatedCompany.active
          ? "i-heroicons-check-circle"
          : "i-heroicons-no-symbol";
      }

      await createNotification({
        companyId: updatedCompany.id,
        type: "system",
        title,
        body: `As informações da empresa ${updatedCompany.name} foram atualizadas`,
        link: "/configuracoes",
        icon,
      });
    }
  } catch (e: unknown) {
    console.error("Database Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }

  if (!updatedCompany) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  return { company: updatedCompany };
});
