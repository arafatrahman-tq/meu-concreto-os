import { db } from "../../utils/db";
import { whatsappSettings } from "../../database/schema";
import { eq, not } from "drizzle-orm";
import { whatsappSettingsUpdateSchema } from "../../utils/schemas";
import { requireAdmin, requireCompanyAccess } from "../../utils/session";
import { createNotification } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const query = getQuery(event);
  const companyId = Number(query.companyId);
  if (!companyId)
    throw createError({ statusCode: 400, message: "companyId required" });

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId);

  const parsed = whatsappSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "WhatsApp Validation Failed:",
      JSON.stringify(parsed.error.format(), null, 2)
    );
    throw createError({
      statusCode: 422,
      message: parsed.error.issues[0]?.message ?? "Validation error",
      data: parsed.error.format(),
    });
  }

  const data = parsed.data;

  // Admin-only check for Connection & Global settings
  const isAdminOnlyFieldChanged =
    data.isGlobal !== undefined ||
    data.apiUrl !== undefined ||
    data.apiKey !== undefined ||
    data.phoneNumber !== undefined;

  if (isAdminOnlyFieldChanged) {
    requireAdmin(event);
  }

  // If this record is being set to global, unset any other global
  if (data.isGlobal === true) {
    await db
      .update(whatsappSettings)
      .set({ isGlobal: false, updatedAt: new Date() })
      .where(not(eq(whatsappSettings.companyId, companyId)));
  }

  // Build update payload
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  // Update fields if provided in request body
  if (data.apiUrl !== undefined) updatePayload.apiUrl = data.apiUrl;
  if (data.phoneNumber !== undefined)
    updatePayload.phoneNumber = data.phoneNumber;
  if (data.alertsEnabled !== undefined)
    updatePayload.alertsEnabled = data.alertsEnabled;
  if (data.reportsEnabled !== undefined)
    updatePayload.reportsEnabled = data.reportsEnabled;
  if (data.alertRecipients !== undefined)
    updatePayload.alertRecipients = data.alertRecipients;
  if (data.reportRecipients !== undefined)
    updatePayload.reportRecipients = data.reportRecipients;
  if (data.reportSchedule !== undefined)
    updatePayload.reportSchedule = data.reportSchedule;
  if (data.quotePdfToSeller !== undefined)
    updatePayload.quotePdfToSeller = data.quotePdfToSeller;
  if (data.quotePdfToCustomer !== undefined)
    updatePayload.quotePdfToCustomer = data.quotePdfToCustomer;
  if (data.schedulesReminderEnabled !== undefined)
    updatePayload.schedulesReminderEnabled = data.schedulesReminderEnabled;
  if (data.schedulesReminderLeadTimeHours !== undefined)
    updatePayload.schedulesReminderLeadTimeHours =
      data.schedulesReminderLeadTimeHours;
  if (data.schedulesReminderRecipients !== undefined)
    updatePayload.schedulesReminderRecipients =
      data.schedulesReminderRecipients;
  if (data.isGlobal !== undefined) updatePayload.isGlobal = data.isGlobal;
  if (data.useGlobal !== undefined) updatePayload.useGlobal = data.useGlobal;

  // Only update apiKey if a real value was provided (not the masked placeholder)
  if (data.apiKey && !data.apiKey.startsWith("••")) {
    updatePayload.apiKey = data.apiKey;
  }

  const existing = await db
    .select({ id: whatsappSettings.id })
    .from(whatsappSettings)
    .where(eq(whatsappSettings.companyId, companyId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(whatsappSettings)
      .set(updatePayload)
      .where(eq(whatsappSettings.companyId, companyId));
  } else {
    await db.insert(whatsappSettings).values({
      companyId,
      apiUrl: (data.apiUrl ?? "http://localhost:3025") as string,
      apiKey: data.apiKey && !data.apiKey.startsWith("••") ? data.apiKey : null,
      phoneNumber: data.phoneNumber ?? null,
      isConnected: false,
      alertsEnabled: data.alertsEnabled ?? false,
      reportsEnabled: data.reportsEnabled ?? false,
      quotePdfToSeller: data.quotePdfToSeller ?? false,
      quotePdfToCustomer: data.quotePdfToCustomer ?? false,
      schedulesReminderEnabled: data.schedulesReminderEnabled ?? false,
      schedulesReminderRecipients: data.schedulesReminderRecipients ?? [],
      isGlobal: data.isGlobal ?? false,
      useGlobal: data.useGlobal ?? false,
      alertRecipients: data.alertRecipients ?? [],
      reportRecipients: data.reportRecipients ?? [],
      reportSchedule: (data.reportSchedule ?? "daily") as
        | "daily"
        | "weekly"
        | "monthly",
    });
  }

  await createNotification({
    companyId,
    type: "system",
    title: "Configurações do WhatsApp",
    body: "As configurações de integração com WhatsApp foram atualizadas.",
    link: "/configuracoes",
    icon: "i-heroicons-chat-bubble-left-right",
  });

  return { ok: true };
});
