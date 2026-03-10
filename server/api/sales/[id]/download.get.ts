import { eq } from 'drizzle-orm'
import { sales } from '../../../database/schema'
import { db } from '../../../utils/db'
import {
  generateDocumentPDF,
  getPDFContext,
  getPaymentMethodDetails
} from '../../../utils/pdf'
import { requireCompanyAccess } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })
  const saleId = parseInt(id)

  // 1. Fetch Sale with its items
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: {
      items: true
    }
  })

  if (!sale) {
    throw createError({ statusCode: 404, statusMessage: 'Sale not found' })
  }

  // 2. Auth Check
  await requireCompanyAccess(event, sale.companyId)

  // 3. Fetch Context
  const { company, seller } = await getPDFContext(
    sale.companyId,
    sale.sellerId
  )

  // Resolve payment methods by stored name (same approach as Quotes)
  const paymentMethodToUse = await getPaymentMethodDetails(
    sale.companyId,
    sale.paymentMethod ?? null
  )

  const paymentMethod2ToUse = sale.paymentMethod2
    ? await getPaymentMethodDetails(sale.companyId, sale.paymentMethod2)
    : null

  // 4. Generate PDF
  const pdfBuffer = await generateDocumentPDF({
    id: sale.id,
    customerName: sale.customerName,
    customerDocument: sale.customerDocument || null,
    customerPhone: sale.customerPhone || null,
    customerAddress: sale.customerAddress || null,
    date: new Date(sale.date as any),
    deliveryDate: sale.deliveryDate ? new Date(sale.deliveryDate as any) : null,
    validUntil: null,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    notes: sale.notes || null,
    company: {
      name: company.name,
      document: company.document,
      phone: company.phone,
      email: company.email,
      address: company.address,
      city: company.city,
      state: company.state,
      logo: company.logo
    },
    items: sale.items.map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit || 'm3',
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      fck: i.fck || null,
      slump: i.slump || null,
      stoneSize: i.stoneSize || null
    })),
    paymentMethod: paymentMethodToUse
      ? {
          name: paymentMethodToUse.name,
          type: paymentMethodToUse.type,
          details: paymentMethodToUse.details
        }
      : null,
    paymentMethod2: paymentMethod2ToUse
      ? {
          name: paymentMethod2ToUse.name,
          type: paymentMethod2ToUse.type,
          details: paymentMethod2ToUse.details
        }
      : null,
    seller: seller
      ? {
          name: seller.name,
          phone: seller.phone || null,
          commissionRate: seller.commissionRate
        }
      : null
  })

  const fileName = `PedidoVenda_${String(sale.id).padStart(5, '0')}.pdf`

  // 5. Send PDF
  setHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`
  })

  return pdfBuffer
})
