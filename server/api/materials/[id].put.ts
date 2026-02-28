import { eq, and } from 'drizzle-orm'
import { materials } from '../../database/schema'
import { db } from '../../utils/db'
import { materialUpdateSchema } from '../../utils/schemas'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const body = await readBody(event)
  const validation = materialUpdateSchema.safeParse(body)

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
    .from(materials)
    .where(eq(materials.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Material not found' })
  }

  requireCompanyAccess(event, existing.companyId)

  try {
    const updated = await db
      .update(materials)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(eq(materials.id, id))
      .returning()
      .get()

    return { material: updated }
  } catch (e: any) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
