import { eq } from 'drizzle-orm'
import { sales } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const saleId = parseInt(id)

  try {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
      with: {
        items: true,
        seller: true,
        transactions: true
      }
    })

    if (!sale) {
      throw createError({ statusCode: 404, statusMessage: 'Sale not found' })
    }

    await requireCompanyAccess(event, sale.companyId)

    return { sale }
  } catch (e: any) {
    console.error('Get Sale Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
