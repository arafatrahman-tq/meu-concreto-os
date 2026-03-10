import { eq } from 'drizzle-orm'
import { companies, users } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireCompanyAccess, requireAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const companyId = parseInt(id)
  requireCompanyAccess(event, companyId)

  try {
    // Check if company exists
    const company = await db.select().from(companies).where(eq(companies.id, companyId)).get()

    if (!company) {
      throw createError({ statusCode: 404, statusMessage: 'Company not found' })
    }

    // Check for associated users
    const existingUsers = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1).get()

    if (existingUsers) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { message: 'Cannot delete company with associated users. Delete users first.' }
      })
    }

    await db.delete(companies).where(eq(companies.id, companyId))

    return { message: 'Company deleted successfully' }
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e
    console.error('Delete Company Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
