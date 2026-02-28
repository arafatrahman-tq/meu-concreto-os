import { desc, eq, and, isNull } from 'drizzle-orm'
import { notifications } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = Number(query.companyId)

  if (!companyId || isNaN(companyId)) {
    throw createError({ statusCode: 400, message: 'companyId required' })
  }

  requireCompanyAccess(event, companyId)

  const unreadOnly = query.unread === 'true'

  const conditions = unreadOnly
    ? and(eq(notifications.companyId, companyId), isNull(notifications.readAt))
    : eq(notifications.companyId, companyId)

  const rows = await db
    .select()
    .from(notifications)
    .where(conditions)
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  const unreadCount = rows.filter(n => !n.readAt).length

  return { notifications: rows, unreadCount }
})
