import { eq } from "drizzle-orm";
import { users } from "#server/database/schema";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";
import { createNotification } from "#server/utils/notifications";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID obrigatório" });

  try {
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!userToDelete) {
      throw createError({ statusCode: 404, statusMessage: "Usuário não encontrado" });
    }

    // Security: Admin can delete anyone.
    // Managers can only delete users that belong to their company.
    const auth = event.context.auth;
    if (!auth)
      throw createError({ statusCode: 401, statusMessage: "Não autorizado" });

    if (auth.role !== "admin") {
      if (!userToDelete.companyId) {
        throw createError({ statusCode: 403, statusMessage: "Proibido" });
      }
      requireCompanyAccess(event, userToDelete.companyId);
    }

    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning()
      .get();

    if (deletedUser && deletedUser.companyId) {
      await createNotification({
        companyId: deletedUser.companyId,
        type: "user",
        title: "Usuário excluído",
        body: `${deletedUser.name} (${deletedUser.email})`,
        link: "/usuarios",
        icon: "i-heroicons-trash",
      });
    }

    return { success: true, user: deletedUser };
  } catch (e: any) {
    console.error("Database Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: { message: e.message },
    });
  }
});
