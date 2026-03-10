import { eq } from 'drizzle-orm'
import { products } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const product = await db.select().from(products).where(eq(products.id, parseInt(id))).get()

  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  await requireCompanyAccess(event, product.companyId)

  return { product }
})
