import { db } from "../../utils/db";
import { whatsappSettings } from "../../database/schema";
import { eq } from "drizzle-orm";
import { baileysCall, getWhatsappConfig } from "../../utils/whatsapp";
import { requireCompanyAccess } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = Number(query.companyId);
  if (!companyId)
    throw createError({ statusCode: 400, message: "companyId required" });

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId);

  const config = await getWhatsappConfig(companyId);
  const rows = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.companyId, companyId))
    .limit(1);

  // Find if some other company has set a global connection
  const globalRow = await db
    .select({ companyId: whatsappSettings.companyId })
    .from(whatsappSettings)
    .where(eq(whatsappSettings.isGlobal, true))
    .limit(1)
    .get();

  if (!rows[0] && !config) {
    return {
      settings: {
        companyId,
        apiUrl: "http://localhost:3025",
        apiKey: "",
        phoneNumber: "",
        isConnected: false,
        alertsEnabled: false,
        reportsEnabled: false,
        quotePdfToSeller: false,
        quotePdfToCustomer: false,
        schedulesReminderEnabled: false,
        schedulesReminderLeadTimeHours: 24,
        schedulesReminderRecipients: [],
        alertRecipients: [],
        reportRecipients: [],
        reportSchedule: "daily",
        isGlobal: false,
        useGlobal: false,
      },
      isUsingGlobal: !!globalRow && globalRow.companyId !== companyId,
    };
  }

  // REFRESH: Check live API status if internal DB says we were connected
  // Or if we have a phone number, check it anyway to keep things in sync.
  let isActuallyConnected =
    rows[0]?.isConnected || config?.isConnected || false;
  if (config?.phoneNumber && config?.apiUrl) {
    try {
      const check = await baileysCall(
        config,
        `/connections/${encodeURIComponent(config.phoneNumber)}`,
        {
          method: "GET",
        },
      );
      const apiData = check.data as any;
      const connectedNow =
        apiData?.state === "open" || apiData?.status === "connected";

      if (rows[0] && connectedNow !== rows[0].isConnected) {
        await db
          .update(whatsappSettings)
          .set({ isConnected: connectedNow, updatedAt: new Date() })
          .where(eq(whatsappSettings.id, rows[0].id));
      }
      isActuallyConnected = connectedNow;
    } catch (e) {
      console.warn("Could not verify WhatsApp live status:", e);
    }
  }

  const parseRecipients = (val: unknown): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string" && val.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const isAdmin = event.context.auth?.role === "admin";
  const maskKey = (key: string | null | undefined) => {
    if (!key) return "";
    if (isAdmin) return key; // Admin can see it
    return "••••••••";
  };

  // Use config as the base since it's already merged with global defaults
  const settings = config!;

  return {
    settings: {
      ...settings,
      isConnected: isActuallyConnected,
      apiKey: maskKey(settings.apiKey),
      alertRecipients: parseRecipients(settings.alertRecipients),
      reportRecipients: parseRecipients(settings.reportRecipients),
      schedulesReminderRecipients: parseRecipients(
        settings.schedulesReminderRecipients,
      ),
      quotePdfToSeller: !!settings.quotePdfToSeller,
      quotePdfToCustomer: !!settings.quotePdfToCustomer,
    },
    isUsingGlobal: !!globalRow && globalRow.companyId !== companyId,
  };
});
