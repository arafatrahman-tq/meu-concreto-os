import { eq, and } from "drizzle-orm";
import { userCompanies, users } from "#server/database/schema";
import { db } from "#server/utils/db";
import { createNotification } from "#server/utils/notifications";

// DELETE /api/user-companies/[id]
// or DELETE /api/user-companies/by?userId=X&companyId=Y
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (id === "by") {
    // Remove by userId + companyId query params
    const query = getQuery(event);
    const userId = query.userId ? parseInt(query.userId as string) : undefined;
    const companyId = query.companyId
      ? parseInt(query.companyId as string)
      : undefined;

    if (!userId || !companyId) {
      throw createError({
        statusCode: 400,
        statusMessage: "userId and companyId required",
      });
    }

    await db
      .delete(userCompanies)
      .where(
        and(
          eq(userCompanies.userId, userId),
          eq(userCompanies.companyId, companyId)
        )
      );

    // Notification
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (user) {
      await createNotification({
        companyId,
        type: "user",
        title: "Usuário removido da empresa",
        body: `${user.name} foi desvinculado`,
        link: "/usuarios",
        icon: "i-heroicons-user-minus",
      });
    }

    return { success: true };
  }

  if (!id || isNaN(parseInt(id))) {
    throw createError({ statusCode: 400, statusMessage: "ID required" });
  }

  const deleted = await db
    .delete(userCompanies)
    .where(eq(userCompanies.id, parseInt(id)))
    .returning()
    .get();

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Entry not found" });
  }

  // Notification
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, deleted.userId))
    .get();
  if (user) {
    await createNotification({
      companyId: deleted.companyId,
      type: "user",
      title: "Usuário removido da empresa",
      body: `${user.name} foi desvinculado`,
      link: "/usuarios",
      icon: "i-heroicons-user-minus",
    });
  }

  return { success: true };
});
