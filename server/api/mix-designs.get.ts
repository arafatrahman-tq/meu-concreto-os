import { eq } from 'drizzle-orm'
import { mixDesigns } from '../database/schema'
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

  // Fetch mix designs with their items and related materials
  const allMixDesigns = await db.query.mixDesigns.findMany({
    where: eq(mixDesigns.companyId, companyId),
    with: {
      items: {
        with: {
          material: true
        }
      }
    }
  })

  return {
    mixDesigns: allMixDesigns
  }
})
