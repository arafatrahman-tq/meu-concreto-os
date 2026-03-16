import { eq } from 'drizzle-orm'
import { materials } from '../../database/schema'
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
    .from(materials)
    .where(eq(materials.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Material not found' })
  }

  requireCompanyAccess(event, existing.companyId)

  try {
    await db.delete(materials).where(eq(materials.id, id)).run()
    return { success: true }
  } catch (e: any) {
    console.error('Database Error:', e)
    // Check for foreign key constraint (e.g., used in mix designs)
    if (e.message?.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 409,
        message: 'Cannot delete material because it is being used in a Mix Design.'
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
