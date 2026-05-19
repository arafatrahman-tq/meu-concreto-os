import { eq } from 'drizzle-orm'
import { mixDesigns } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  // Fetch mix design with items and materials
  const mixDesign = await db.query.mixDesigns.findFirst({
    where: eq(mixDesigns.id, id),
    with: {
      items: {
        with: {
          material: true
        }
      }
    }
  })

  if (!mixDesign) {
    throw createError({ statusCode: 404, message: 'Mix Design not found' })
  }

  // Secure: check if user has access to this specific company
  requireCompanyAccess(event, mixDesign.companyId)

  return {
    mixDesign
  }
})
