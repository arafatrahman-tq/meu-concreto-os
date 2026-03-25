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

  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, id),
    with: {
      user: {
        columns: {
          name: true,
          email: true
        }
      },
      sale: true
    }
  })

  if (!schedule) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Agendamento não encontrado'
    })
  }

  // Security check: Verify user has access to this company
  requireCompanyAccess(event, schedule.companyId)

  return { schedule }
})
