import { eq } from "drizzle-orm";
import {
  schedules,
  companies,
  whatsappSettings,
} from "../../../database/schema";
import { db } from "../../../utils/db";
import {
  getWhatsappConfig,
  sendWhatsappMessage,
} from "../../../utils/whatsapp";
import { requireCompanyAccess } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const scheduleId = parseInt(id);

  // 1. Fetch Schedule
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, scheduleId),
  });

  if (!schedule) {
    throw createError({
      statusCode: 404,
      statusMessage: "Agendamento não encontrado",
    });
  }

  // 2. Auth Check
  requireCompanyAccess(event, schedule.companyId);

  // 3. Fetch Company and WhatsApp settings
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, schedule.companyId),
    columns: { name: true },
  });

  const config = await getWhatsappConfig(schedule.companyId);
  if (!config || !config.apiUrl || !config.phoneNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: "WhatsApp não configurado ou desconectado",
    });
  }

  const recipients = config.schedulesReminderRecipients || [];
  if (recipients.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nenhum destinatário configurado para agendamentos",
    });
  }

  // 4. Format Message (Reused from schedules.post.ts)
  const formattedDate = new Date(schedule.date).toLocaleDateString("pt-BR");
  const timeStr = schedule.startTime ? ` às ${schedule.startTime}` : "";

  const waMessage = [
    `📅 *Agendamento — ${company?.name || "Meu Concreto"}*`,
    `📌 *${schedule.title}*`,
    `📅 Data: ${formattedDate}${timeStr}`,
    schedule.customerName ? `👤 Cliente: ${schedule.customerName}` : null,
    schedule.location ? `📍 Local: ${schedule.location}` : null,
    schedule.description ? `📝 Obs: ${schedule.description}` : null,
    ``,
    `_Enviado manualmente via Meu Concreto_`,
  ]
    .filter(Boolean)
    .join("\n");

  // 5. Send Message
  const result = await sendWhatsappMessage(
    {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      phoneNumber: config.phoneNumber,
    },
    recipients,
    waMessage,
  );

  // 6. Update whatsappSent status if successful
  if (result.sent.length > 0) {
    await db
      .update(schedules)
      .set({ whatsappSent: true })
      .where(eq(schedules.id, scheduleId));
  }

  return {
    ok: result.sent.length > 0,
    sent: result.sent,
    failed: result.failed,
    message:
      result.sent.length > 0
        ? `Agendamento enviado para ${result.sent.length} destinatários!`
        : "Falha ao enviar. Verifique a conexão do WhatsApp.",
  };
});
