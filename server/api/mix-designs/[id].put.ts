import { eq } from 'drizzle-orm'
import { mixDesigns, mixDesignItems } from '../../database/schema'
import { db } from '../../utils/db'
import { mixDesignUpdateSchema, mixDesignItemSchema } from '../../utils/schemas'
import { requireCompanyAccess } from '../../utils/session'
import { z } from 'zod'

// Schema for PUT includes optional items array
const updateSchemaWithItems = mixDesignUpdateSchema.extend({
  items: z.array(mixDesignItemSchema).optional()
})

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const body = await readBody(event)
  const validation = updateSchemaWithItems.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation Error',
      data: validation.error.flatten()
    })
  }

  // Check existence and permission
  const existing = await db
    .select()
    .from(mixDesigns)
    .where(eq(mixDesigns.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Mix Design not found' })
  }

  requireCompanyAccess(event, existing.companyId)

  const { items, ...updateData } = validation.data

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Update Header
      await tx
        .update(mixDesigns)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(mixDesigns.id, id))

      // 2. Update Items (Delete all and re-insert if items provided)
      if (items !== undefined) {
        // Delete existing items
        await tx.delete(mixDesignItems).where(eq(mixDesignItems.mixDesignId, id))

        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item) => ({
            mixDesignId: id,
            materialId: item.materialId,
            quantity: item.quantity
          }))
          await tx.insert(mixDesignItems).values(itemsToInsert)
        }
      }

      // 3. Return updated object
      return await tx.query.mixDesigns.findFirst({
        where: (mixDesigns, { eq }) => eq(mixDesigns.id, id),
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
