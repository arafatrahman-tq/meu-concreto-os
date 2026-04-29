import { eq } from 'drizzle-orm'
import { sellers } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireCompanyAccess } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const seller = await db.select().from(sellers).where(eq(sellers.id, parseInt(id))).get()
  if (!seller) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })

  await requireCompanyAccess(event, seller.companyId)

  return { seller }
})
