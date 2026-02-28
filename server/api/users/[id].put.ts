import { eq } from "drizzle-orm";
import { users } from "#server/database/schema";
import { userUpdateSchema } from "#server/utils/schemas";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";
import { createNotification } from "#server/utils/notifications";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID obrigatório" });

  const userToUpdate = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id)))
    .get();

  if (!userToUpdate) {
    throw createError({ statusCode: 404, statusMessage: "Usuário não encontrado" });
  }

  // Security: Admin can update anyone. Users can update themselves.
  // Managers can update users from their company.
  const auth = event.context.auth;
  if (!auth)
    throw createError({ statusCode: 401, statusMessage: "Não autorizado" });

  if (auth.role !== "admin" && auth.userId !== userToUpdate.id) {
    if (userToUpdate.companyId) {
      requireCompanyAccess(event, userToUpdate.companyId);
    } else {
      throw createError({ statusCode: 403, statusMessage: "Proibido" });
    }
  }

  const body = await readBody(event);
  const result = userUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Falha na validação",
      data: result.error.flatten(),
    });
  }

  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updatedUser) {
      throw createError({ statusCode: 404, statusMessage: "Usuário não encontrado" });
    }

    // Notification trigger
    if (updatedUser.companyId) {
      const isStatusChange =
        Object.keys(result.data).length === 1 && "active" in result.data;
      let title = "Usuário atualizado";
      let icon = "i-heroicons-pencil-square";

      if (isStatusChange) {
        title = updatedUser.active ? "Usuário ativado" : "Usuário desativado";
        icon = updatedUser.active
          ? "i-heroicons-check-circle"
          : "i-heroicons-no-symbol";
      }

      await createNotification({
        companyId: updatedUser.companyId,
        type: "user",
        title,
        body: `${updatedUser.name} — perfil: ${updatedUser.role}`,
        link: "/usuarios",
        icon,
      });
    }

    return { user: updatedUser };
  } catch (e: any) {
    // Check for unique constraint violation
    if (
      e.cause?.code === "SQLITE_CONSTRAINT" ||
      e.message?.includes("UNIQUE constraint failed") ||
      e.message?.includes("constraint failed")
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: "Conflito",
        data: { message: "E-mail ou CPF/CNPJ já está em uso" },
      });
    }

    console.error("Database Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: { message: e.message },
    });
  }
});
