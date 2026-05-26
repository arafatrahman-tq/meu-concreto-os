import { eq, and } from 'drizzle-orm'
import { drivers } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined
  const activeOnly = query.active === 'true'

  if (!companyId) {
    throw createError({ statusCode: 400, message: 'companyId is required' })
  }

  await requireCompanyAccess(event, companyId)

  try {
    let whereClause = eq(drivers.companyId, companyId)
    if (activeOnly) {
      whereClause = and(whereClause, eq(drivers.active, true))!
    }
    const result = await db.select().from(drivers).where(whereClause).all()
    return { drivers: result }
  } catch (e: unknown) {
    console.error('Get Drivers Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
