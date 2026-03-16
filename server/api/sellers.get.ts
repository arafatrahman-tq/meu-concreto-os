import { eq, and } from 'drizzle-orm'
import { sellers } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId ? parseInt(query.companyId as string) : undefined
  const activeOnly = query.active === 'true'

  if (!companyId) {
    throw createError({ statusCode: 400, message: 'companyId is required' })
  }

  await requireCompanyAccess(event, companyId)

  try {
    let whereClause = eq(sellers.companyId, companyId)
    if (activeOnly) {
      whereClause = and(whereClause, eq(sellers.active, true))!
    }
    const result = await db.select().from(sellers).where(whereClause).all()
    return { sellers: result }
  } catch (e: unknown) {
    console.error('Get Sellers Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
