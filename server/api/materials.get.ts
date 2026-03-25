import { eq } from 'drizzle-orm'
import { materials } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: 'Missing companyId parameter'
    })
  }

  // Secure: check if user has access to this specific company
  requireCompanyAccess(event, companyId)

  const allMaterials = await db
    .select()
    .from(materials)
    .where(eq(materials.companyId, companyId))
    .all()

  return {
    materials: allMaterials
  }
})
