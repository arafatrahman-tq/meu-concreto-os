import { eq } from 'drizzle-orm'
import { products } from '../database/schema'
import { db } from '../utils/db'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined

  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: 'O ID da empresa é obrigatório'
    })
  }

  // Secure: check if user has access to this specific company
  requireCompanyAccess(event, companyId)

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .all()

  return {
    products: allProducts
  }
})
