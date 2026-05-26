import { eq } from 'drizzle-orm'
import { products } from '../../database/schema'
import { db } from '../../utils/db'
import { productUpdateSchema } from '../../utils/schemas'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const existing = await db.select({ companyId: products.companyId })
    .from(products).where(eq(products.id, parseInt(id))).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  requireCompanyAccess(event, existing.companyId)

  const body = await readBody(event)

  const validation = productUpdateSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: validation.error.flatten()
    })
  }

  try {
    const updatedProduct = await db.update(products)
      .set(validation.data)
      .where(eq(products.id, parseInt(id)))
      .returning()
      .get()

    if (!updatedProduct) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }

    return { product: updatedProduct }
  } catch (e: unknown) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
