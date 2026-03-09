import { mixDesigns, mixDesignItems } from '../database/schema'
import { db } from '../utils/db'
import { mixDesignSchema } from '../utils/schemas'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const validation = mixDesignSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation Error',
      data: validation.error.flatten()
    })
  }

  const { items, ...mixDesignData } = validation.data

  // Secure: check if user has access to this company before inserting
  requireCompanyAccess(event, mixDesignData.companyId)

  try {
    // Transaction ensures atomic creation of Mix Design and its Items
    const result = await db.transaction(async (tx) => {
      // 1. Insert Mix Design Header
      const newMixDesign = await tx
        .insert(mixDesigns)
        .values(mixDesignData)
        .returning()
        .get()

      // 2. Insert Items if present
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          mixDesignId: newMixDesign.id,
          materialId: item.materialId,
          quantity: item.quantity
        }))
        await tx.insert(mixDesignItems).values(itemsToInsert)
      }

      // 3. Return complete object
      return await tx.query.mixDesigns.findFirst({
        where: (mixDesigns, { eq }) => eq(mixDesigns.id, newMixDesign.id),
        with: {
          items: {
            with: {
              material: true
            }
          }
        }
      })
    })

    return { mixDesign: result }
  } catch (e: any) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
