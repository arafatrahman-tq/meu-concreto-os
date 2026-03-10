import { schedules, companies, whatsappSettings } from '../../database/schema'
import { scheduleUpdateSchema } from '../../utils/schemas'
import { db } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { requireCompanyAccess } from '../../utils/session'
import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID inválido'
    })
  }

  const existing = await db.select().from(schedules).where(eq(schedules.id, id)).get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Agendamento não encontrado'
    })
  }

  // Security check: Verify user has access to this company
  requireCompanyAccess(event, existing.companyId)

  const body = await readBody(event)
  const result = scheduleUpdateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Erro de validação',
      data: result.error.flatten()
    })
  }

  const updateData = result.data

  try {
    const [updated] = await db.update(schedules).set({
      ...updateData,
      date: updateData.date ? new Date(updateData.date) : existing.date,
      updatedAt: new Date()
    }).where(eq(schedules.id, id)).returning()

    if (!updated) {
      throw new Error('Falha ao atualizar agendamento')
    }

    // Se houve mudança significativa, notificar
    const dateChanged = updateData.date && new Date(updateData.date).getTime() !== existing.date.getTime()
    const statusChanged = updateData.status && updateData.status !== existing.status

    if (dateChanged || statusChanged || updateData.title) {
      // Fetch company and WhatsApp settings
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, updated.companyId),
        columns: { name: true }
      })

      const waSettings = await db.query.whatsappSettings.findFirst({
        where: eq(whatsappSettings.companyId, updated.companyId),
        columns: { schedulesReminderRecipients: true }
      })

      const formattedDate = new Date(updated.date).toLocaleDateString('pt-BR')
      const timeStr = updated.startTime ? ` às ${updated.startTime}` : ''

      // WhatsApp Message
      const waMessage = [
        `📅 *Agendamento Atualizado — ${company?.name || 'Meu Concreto'}*`,
        `📌 *${updated.title}*`,
        `📅 Data: ${formattedDate}${timeStr}`,
        `📊 Status: ${updated.status}`,
        updated.customerName ? `👤 Cliente: ${updated.customerName}` : null,
        updated.location ? `📍 Local: ${updated.location}` : null,
        ``,
        `_Enviado por Meu Concreto_`
      ].filter(Boolean).join('\n')

      // Create app notification & WhatsApp alert
      await createNotification({
        companyId: updated.companyId,
        type: 'schedule',
        title: 'Agendamento Atualizado',
        body: `${updated.title} — ${formattedDate}${timeStr}`,
        link: `/agendamentos?id=${updated.id}`,
        icon: 'i-heroicons-calendar-days',
        whatsapp: {
          toNumbers: waSettings?.schedulesReminderRecipients || [],
          message: waMessage
        }
      })
    }

    return { schedule: updated }
  } catch (e: any) {
    console.error('Update Schedule Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro Interno do Servidor',
      data: { message: e.message }
    })
  }
})
