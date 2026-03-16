import { db } from "../../utils/db";
import { getHeader } from "h3";
import { whatsappSettings } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  getWhatsappConfig,
  normalizeRecipientList,
  sendWhatsappMessage,
  buildReportMessage,
} from "../../utils/whatsapp";
import {
  loadReportMetrics,
  getBrasiliaNow,
  type ReportSchedule,
} from "../../utils/report-metrics";

export default defineEventHandler(async (_event) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw createError({
      statusCode: 500,
      message: "CRON_SECRET não configurado no ambiente.",
    });
  }

  const authHeader = getHeader(_event, "authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: "Não autorizado" });
  }

  // Cron-only endpoint — authenticated by bearer token.
  // Configure in Coolify Scheduled Tasks to run once per day at the desired hour.
  // Schedule logic:
  //   daily   → sends every day
  //   weekly  → sends only on Mondays (dayOfWeek === 1)
  //   monthly → sends only on the 1st of the month

  const results: Array<{ companyId: number; ok: boolean; reason?: string }> =
    [];

  try {
    const now = new Date();
    const brasiliaNow = getBrasiliaNow(now);
    const dayOfWeek = brasiliaNow.getDay(); // 0 = Sunday, 1 = Monday
    const dayOfMonth = brasiliaNow.getDate(); // 1–31

    // 1. Fetch all companies with reports enabled
    const settings = await db
      .select()
      .from(whatsappSettings)
      .where(eq(whatsappSettings.reportsEnabled, true))
      .all();

    for (const setting of settings) {
      const companyId = setting.companyId;
      const schedule = (setting.reportSchedule ?? "daily") as ReportSchedule;

      // 2. Check if today is the right day to send for this schedule
      if (schedule === "weekly" && dayOfWeek !== 1) {
        results.push({
          companyId,
          ok: false,
          reason: "not Monday — skipping weekly report",
        });
        continue;
      }
      if (schedule === "monthly" && dayOfMonth !== 1) {
        results.push({
          companyId,
          ok: false,
          reason: "not 1st of month — skipping monthly report",
        });
        continue;
      }

      // 3. Verify WhatsApp is connected
      const config = await getWhatsappConfig(companyId);
      if (!config?.isConnected || !config.phoneNumber) {
        console.warn(
          `[Reports] Skipping company ${companyId}: WA not connected or no phone number.`,
        );
        results.push({ companyId, ok: false, reason: "WA not connected" });
        continue;
      }

      // 4. Check recipients
      const recipients = normalizeRecipientList(config.reportRecipients);
      if (recipients.length === 0) {
        console.warn(
          `[Reports] Skipping company ${companyId}: no report recipients configured.`,
        );
        results.push({ companyId, ok: false, reason: "no recipients" });
        continue;
      }

      try {
        const metrics = await loadReportMetrics(companyId, schedule, now);

        // 7. Build and send message
        const text = buildReportMessage({
          companyName: metrics.companyName,
          schedule,
          salesTotal: metrics.salesTotal,
          salesCount: metrics.salesCount,
          pendingQuotes: metrics.pendingQuotes,
          pendingQuotesTotal: metrics.pendingQuotesTotal,
          incomeTotal: metrics.incomeTotal,
          expenseTotal: metrics.expenseTotal,
          sentAt: now,
        });

        const sendResult = await sendWhatsappMessage(
          {
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            phoneNumber: config.phoneNumber,
          },
          recipients,
          text,
        );

        results.push({
          companyId,
          ok: sendResult.sent.length > 0,
          reason:
            sendResult.sent.length > 0
              ? `sent to ${sendResult.sent.length} recipient(s)`
              : `failed — ${sendResult.failed.length} recipient(s) not reached`,
        });
      } catch (err: unknown) {
        console.error(`[Reports] Error processing company ${companyId}:`, err);
        results.push({
          companyId,
          ok: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: true,
      processed: results.filter((r) => r.ok).length,
      skipped: results.filter((r) => !r.ok).length,
      details: results,
    };
  } catch (err: unknown) {
    console.error("[Reports] Global task error:", err);
    throw createError({
      statusCode: 500,
      message: "Error processing reports",
      data: { message: err instanceof Error ? err.message : String(err) },
    });
  }
});
