import { eq } from 'drizzle-orm'
import { quotes } from '../../../database/schema'
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
  const quoteId = parseInt(id)

  // 1. Fetch Quote with its items
  const quote = await db.query.quotes.findFirst({
    where: eq(quotes.id, quoteId),
    with: {
      items: true
    }
  })

  if (!quote) {
    throw createError({ statusCode: 404, statusMessage: 'Quote not found' })
  }

  // 2. Auth Check
  await requireCompanyAccess(event, quote.companyId)

  // 3. Fetch Context
  const { company, seller } = await getPDFContext(
    quote.companyId,
    quote.sellerId
  )

  const targetPaymentMethod = await getPaymentMethodDetails(
    quote.companyId,
    quote.paymentMethod
  )

  const targetPaymentMethod2 = quote.paymentMethod2
    ? await getPaymentMethodDetails(quote.companyId, quote.paymentMethod2)
    : null

  // 4. Generate PDF
  const pdfBuffer = await generateDocumentPDF({
    id: quote.id,
    customerName: quote.customerName,
    customerDocument: quote.customerDocument || null,
    customerPhone: quote.customerPhone || null,
    customerAddress: quote.customerAddress || null,
    date: new Date(quote.date as any),
    validUntil: quote.validUntil ? new Date(quote.validUntil as any) : null,
    deliveryDate: null,
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    notes: quote.notes || null,
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
    items: quote.items.map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      fck: i.fck || null,
      slump: i.slump || null,
      stoneSize: i.stoneSize || null
    })),
    paymentMethod: targetPaymentMethod
      ? {
          name: targetPaymentMethod.name,
          type: targetPaymentMethod.type,
          details: targetPaymentMethod.details
        }
      : null,
    paymentMethod2: targetPaymentMethod2
      ? {
          name: targetPaymentMethod2.name,
          type: targetPaymentMethod2.type,
          details: targetPaymentMethod2.details
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

  const fileName = `Orcamento_${String(quote.id).padStart(5, '0')}.pdf`

  // 5. Send PDF
  setHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`
  })

  return pdfBuffer
})
