import { eq } from 'drizzle-orm'
import { companies } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const companyId = parseInt(id)
  // Secure: check if user has access to this specific company
  requireCompanyAccess(event, companyId)

  const company = await db.select().from(companies).where(eq(companies.id, companyId)).get()

  if (!company) {
    throw createError({ statusCode: 404, statusMessage: 'Company not found' })
  }

  return { company }
})
