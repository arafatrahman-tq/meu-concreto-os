import { schedules } from '../../database/schema'
import { db } from '../../utils/db'
import { eq } from 'drizzle-orm'
import { requireCompanyAccess } from '../../utils/session'

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

  try {
    await db.delete(schedules).where(eq(schedules.id, id))
    return { success: true }
  } catch (e: any) {
    console.error('Delete Schedule Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro Interno do Servidor',
      data: { message: e.message }
    })
  }
})
