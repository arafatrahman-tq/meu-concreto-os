import { eq } from 'drizzle-orm'
import { userCompanies, companies } from '#server/database/schema'
import { db } from '#server/utils/db'

// GET /api/user-companies?userId=X
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId ? parseInt(query.userId as string) : undefined

  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const rows = await db
    .select({
      id: userCompanies.id,
      companyId: companies.id,
      companyName: companies.name,
      role: userCompanies.role,
      active: companies.active
    })
    .from(userCompanies)
    .innerJoin(companies, eq(userCompanies.companyId, companies.id))
    .where(eq(userCompanies.userId, userId))
    .all()

  return { userCompanies: rows }
})
