import { getWhatsappConfig, baileysCall } from "../../utils/whatsapp";
import { db } from "../../utils/db";
import { whatsappSettings } from "../../database/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, requireCompanyAccess } from "../../utils/session";
import { createNotification } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = Number(query.companyId);
  if (!companyId)
    throw createError({ statusCode: 400, message: "companyId required" });

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId);
  requireAdmin(event); // Only admins can trigger disconnections

  const config = await getWhatsappConfig(companyId);
  if (!config?.phoneNumber) {
    throw createError({
      statusCode: 400,
      message: "PhoneNumber not configured.",
    });
  }

  const result = await baileysCall(
    config,
    `/connections/${encodeURIComponent(config.phoneNumber)}`,
    {
      method: "DELETE",
    }
  );

  await db
    .update(whatsappSettings)
    .set({ isConnected: false, updatedAt: new Date() })
    .where(eq(whatsappSettings.companyId, companyId));

  if (result.ok || result.status === 404) {
    await createNotification({
      companyId,
      type: "system",
      title: "WhatsApp Desconectado",
      body: "A instância do WhatsApp foi desconectada.",
      link: "/configuracoes",
      icon: "i-heroicons-no-symbol",
    });
  }

  return {
    ok: result.ok || result.status === 404,
    message: "Desconectado.",
  };
});
