import {
  getWhatsappConfig,
  normalizeRecipientList,
  sendWhatsappMessage,
  buildReportMessage,
} from "../../utils/whatsapp";
import { requireCompanyAccess } from "../../utils/session";
import {
  loadReportMetrics,
  type ReportSchedule,
} from "../../utils/report-metrics";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = Number(query.companyId);
  if (!companyId)
    throw createError({ statusCode: 400, message: "companyId required" });

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId);

  const config = await getWhatsappConfig(companyId);
  if (!config)
    throw createError({
      statusCode: 404,
      message: "WhatsApp não configurado.",
    });
  if (!config.reportsEnabled)
    throw createError({
      statusCode: 400,
      message: "Relatórios automáticos não estão habilitados.",
    });
  if (!config.phoneNumber)
    throw createError({
      statusCode: 400,
      message: "Número de WhatsApp não configurado.",
    });

  const recipients = normalizeRecipientList(config.reportRecipients);
  if (recipients.length === 0) {
    throw createError({
      statusCode: 400,
      message: "Nenhum destinatário de relatório configurado.",
    });
  }

  // ── Determine report date range based on schedule
  const schedule = (config.reportSchedule ?? "daily") as ReportSchedule;
  const sendTimestamp = new Date();
  const metrics = await loadReportMetrics(companyId, schedule, sendTimestamp);

  const text = buildReportMessage({
    companyName: metrics.companyName,
    schedule,
    salesTotal: metrics.salesTotal,
    salesCount: metrics.salesCount,
    pendingQuotes: metrics.pendingQuotes,
    pendingQuotesTotal: metrics.pendingQuotesTotal,
    incomeTotal: metrics.incomeTotal,
    expenseTotal: metrics.expenseTotal,
    sentAt: sendTimestamp,
  });

  const result = await sendWhatsappMessage(config, recipients, text);

  return {
    ok: result.sent.length > 0,
    sent: result.sent,
    failed: result.failed,
    message:
      result.sent.length > 0
        ? `Relatório enviado para ${result.sent.length} destinatário(s).`
        : "Falha ao enviar relatório.",
  };
});
