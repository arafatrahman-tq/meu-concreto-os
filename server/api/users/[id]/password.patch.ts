import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { userAuth, users } from "#server/database/schema";
import { db } from "#server/utils/db";
import { createNotification } from "#server/utils/notifications";
import { z } from "zod";

const selfChangeSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

const adminResetSchema = z.object({
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") ?? "");
  if (isNaN(id))
    throw createError({ statusCode: 400, statusMessage: "ID inválido" });

  const auth = event.context.auth;
  if (!auth)
    throw createError({ statusCode: 401, statusMessage: "Não autenticado" });

  const isSelf = auth.userId === id;
  const isAdmin = auth.role === "admin";

  // Only allow self or admin
  if (!isSelf && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Sem permissão para alterar a senha deste usuário",
    });
  }

  const body = await readBody(event);

  // Find current auth record
  const [authRecord] = await db
    .select()
    .from(userAuth)
    .where(eq(userAuth.userId, id))
    .limit(1);

  if (!authRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: "Usuário não encontrado",
    });
  }

  let newPasswordHash: string;

  if (isSelf && !isAdmin) {
    // Self-change: require current password verification
    const parsed = selfChangeSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Dados inválidos",
        data: parsed.error.flatten(),
      });
    }

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      authRecord.passwordHash
    );
    if (!valid) {
      throw createError({
        statusCode: 401,
        statusMessage: "Senha atual incorreta",
      });
    }

    newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  } else {
    // Admin reset: no current password required
    const parsed = adminResetSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Dados inválidos",
        data: parsed.error.flatten(),
      });
    }

    newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  await db
    .update(userAuth)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(userAuth.userId, id));

  // Notification
  const user = await db.select().from(users).where(eq(users.id, id)).get();
  if (user && user.companyId) {
    await createNotification({
      companyId: user.companyId,
      type: "user",
      title: "Senha alterada",
      body: `A senha de ${user.name} foi alterada`,
      link: "/usuarios",
      icon: "i-heroicons-key",
    });
  }

  return { ok: true };
});
