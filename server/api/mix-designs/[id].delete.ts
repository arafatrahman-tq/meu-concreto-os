import { eq } from 'drizzle-orm'
import { mixDesigns } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
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

  try {
    // Delete header (cascade should handle items if configured in DB, but Drizzle relations help)
    // Note: Schema defines onDelete: "cascade" for items -> mixDesign relation
    await db.delete(mixDesigns).where(eq(mixDesigns.id, id)).run()
    return { success: true }
  } catch (e: any) {
    console.error('Database Error:', e)
    // Check for foreign key constraint (e.g., used in products)
    if (e.message?.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 409,
        message: 'Cannot delete Mix Design because it is being used by a Product.'
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
