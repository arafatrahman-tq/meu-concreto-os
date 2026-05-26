import { eq, or } from 'drizzle-orm'
import { products, quoteItems, saleItems } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const productId = parseInt(id)
  const existing = await db.select({ companyId: products.companyId })
    .from(products).where(eq(products.id, productId)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  requireCompanyAccess(event, existing.companyId)

  try {
    // 1. Check for dependencies in Quotes and Sales
    const [hasQuoteItems, hasSaleItems] = await Promise.all([
      db.select({ id: quoteItems.id }).from(quoteItems).where(eq(quoteItems.productId, productId)).limit(1).get(),
      db.select({ id: saleItems.id }).from(saleItems).where(eq(saleItems.productId, productId)).limit(1).get()
    ])

    if (hasQuoteItems || hasSaleItems) {
      // 2. SOFT DELETE (Deactivate) if product is used historically
      const deactivated = await db.update(products)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(products.id, productId))
        .returning()
        .get()

      return {
        message: 'Product is in use. Deactivated instead of deleted to preserve history.',
        product: deactivated,
        strategy: 'soft-delete'
      }
    }

    // 3. HARD DELETE if product is not used
    const deletedProduct = await db.delete(products)
      .where(eq(products.id, productId))
      .returning()
      .get()

    if (!deletedProduct) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }

    return {
      message: 'Product deleted successfully',
      product: deletedProduct,
      strategy: 'hard-delete'
    }
  } catch (e: unknown) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e instanceof Error ? e.message : 'Unknown error' }
    })
  }
})
