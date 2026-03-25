import { eq } from 'drizzle-orm'
import { notifications } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const notifId = parseInt(id)
  const existing = await db
    .select({ companyId: notifications.companyId })
    .from(notifications)
    .where(eq(notifications.id, notifId))
    .get()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Notification not found' })

  requireCompanyAccess(event, existing.companyId)

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notifId))
    .returning()

  return { notification: updated }
})
