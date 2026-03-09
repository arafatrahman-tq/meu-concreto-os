import { db } from '../../utils/db'
import { schedules, whatsappSettings, companies } from '../../database/schema'
import { eq, and, lte, gte } from 'drizzle-orm'
import { getWhatsappConfig, sendWhatsappMessage } from '../../utils/whatsapp'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default defineEventHandler(async (_event) => {
  // A small security token would be good here if this is public,
  // but for now we rely on the host's firewall or secret route.

  const results: any[] = []

  try {
    // 1. Fetch all companies that have reminders enabled
    const companiesWithReminders = await db
      .select()
      .from(whatsappSettings)
      .where(eq(whatsappSettings.schedulesReminderEnabled, true))
      .all()

    for (const setting of companiesWithReminders) {
      const now = new Date()
      const leadTimeMs
        = (setting.schedulesReminderLeadTimeHours || 24) * 60 * 60 * 1000
      const targetDate = new Date(now.getTime() + leadTimeMs)

      // 2. Find schedules for this company that haven't sent WA yet and are within the window
      // We look for schedules between NOW and NOW + LEAD_TIME
      const pendingSchedules = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.companyId, setting.companyId),
            eq(schedules.whatsappSent, false),
            // We ignore completed/cancelled
            gte(schedules.date, now),
            lte(schedules.date, targetDate)
          )
        )
        .all()

      if (pendingSchedules.length === 0) continue

      const company = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, setting.companyId))
        .get()

      const config = await getWhatsappConfig(setting.companyId)
      if (!config || !config.isConnected) {
        console.warn(
          `[Reminders] Skipping company ${setting.companyId}: WA not connected.`
        )
        continue
      }

      for (const schedule of pendingSchedules) {
        const formattedDate = format(new Date(schedule.date), 'dd \'de\' MMMM', {
          locale: ptBR
        })
        const timeStr = schedule.startTime ? ` às ${schedule.startTime}` : ''

        const message = [
          `🔔 *LEMBRETE DE AGENDAMENTO — ${company?.name || 'Meu Concreto'}*`,
          ``,
          `Olá! Passando para lembrar do agendamento:`,
          `📌 *${schedule.title}*`,
          `📅 Data: ${formattedDate}${timeStr}`,
          schedule.location ? `📍 Local: ${schedule.location}` : null,
          ``,
          `_Por favor, confirme se houver qualquer alteração._`,
          `_Enviado por Meu Concreto_`
        ]
          .filter(Boolean)
          .join('\n')

        // Send to list of recipients (internal) AND to the customer specifically
        const recipients = [...(setting.schedulesReminderRecipients || [])]
        if (schedule.customerPhone) {
          recipients.push(schedule.customerPhone)
        }

        // De-duplicate numbers
        const uniqueRecipients = [...new Set(recipients)]

        if (uniqueRecipients.length > 0) {
          try {
            const sendResult = await sendWhatsappMessage(
              {
                apiUrl: config.apiUrl,
                apiKey: config.apiKey,
                phoneNumber: config.phoneNumber
              },
              uniqueRecipients,
              message
            )

            // 3. Mark as sent so we don't spam
            if (sendResult.sent.length > 0) {
              await db
                .update(schedules)
                .set({ whatsappSent: true, updatedAt: new Date() })
                .where(eq(schedules.id, schedule.id))

              results.push({
                scheduleId: schedule.id,
                sent: true,
                recipients: uniqueRecipients.length
              })
            }
          } catch (err) {
            console.error(
              `[Reminders] Failed to send reminders for schedule ${schedule.id}:`,
              err
            )
          }
        }
      }
    }

    return {
      success: true,
      processed: results.length,
      details: results
    }
  } catch (err: any) {
    console.error('[Reminders] Global task error:', err)
    throw createError({
      statusCode: 500,
      message: 'Error processing reminders',
      data: { message: err.message }
    })
  }
})
