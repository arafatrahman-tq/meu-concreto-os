import { products } from '../database/schema'
import { db } from '../utils/db'
import { productSchema } from '../utils/schemas'
import { createNotification } from '../utils/notifications'
import { requireCompanyAccess } from '../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const validation = productSchema.safeParse(body)

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
    const newProduct = await db
      .insert(products)
      .values(validation.data)
      .returning()
      .get()

    // Notification trigger
    await createNotification({
      companyId: newProduct.companyId,
      type: 'product',
      title: 'Novo produto cadastrado',
      body: `${newProduct.name}${newProduct.sku ? ` — SKU: ${newProduct.sku}` : ''}`,
      link: '/produtos',
      icon: 'i-lucide-package'
    })

    return { product: newProduct }
  } catch (e: any) {
    console.error('Database Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { message: e.message }
    })
  }
})
