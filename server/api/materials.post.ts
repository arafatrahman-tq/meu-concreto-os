import { materials } from '../database/schema'
import { db } from '../utils/db'
import { materialSchema } from '../utils/schemas'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const validation = materialSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation Error',
      data: validation.error.flatten()
    })
  }

  // Secure: check if user has access to this company before inserting
  requireCompanyAccess(event, validation.data.companyId)

  try {
    const newMaterial = await db
      .insert(materials)
      .values(validation.data)
      .returning()
      .get()

    return { material: newMaterial }
  } catch (e: any) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
