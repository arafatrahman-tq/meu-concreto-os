import { eq, and, isNull } from 'drizzle-orm'
import { notifications } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const companyId = Number(body?.companyId)

  if (!companyId || isNaN(companyId)) {
    throw createError({ statusCode: 400, message: 'companyId required' })
  }

  requireCompanyAccess(event, companyId)

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.companyId, companyId), isNull(notifications.readAt)))

  return { ok: true }
})
