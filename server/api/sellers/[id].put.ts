import { eq } from 'drizzle-orm'
import { sellers } from '#server/database/schema'
import { sellerUpdateSchema } from '#server/utils/schemas'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })
  const sellerId = parseInt(id)

  const body = await readBody(event)
  const result = sellerUpdateSchema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Validation Error', data: result.error.flatten() })
  }

  const existing = await db.select().from(sellers).where(eq(sellers.id, sellerId)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })

  await requireCompanyAccess(event, existing.companyId)

  try {
    const [updated] = await db.update(sellers).set(result.data).where(eq(sellers.id, sellerId)).returning()
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })
    return { seller: updated }
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e
    console.error('Update Seller Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
