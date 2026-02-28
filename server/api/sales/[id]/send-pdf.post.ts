import { eq } from 'drizzle-orm'
import { sales } from '../../../database/schema'
import { db } from '../../../utils/db'
import { generateDocumentPDF, getPDFContext } from '../../../utils/pdf'
import { sendWhatsappPDF } from '../../../utils/whatsapp'
import { requireCompanyAccess } from '../../../utils/session'
import { createNotification } from '../../../utils/notifications'

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
  requireCompanyAccess(event, sale.companyId)

  // 3. Fetch Company, Seller, and WA Settings
  const { company, seller, waConfig } = await getPDFContext(
    sale.companyId,
    sale.sellerId
  )

  if (!waConfig?.apiUrl || !waConfig?.phoneNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'WhatsApp automation not configured'
    })
  }

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
      state: company.state
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
    seller: seller
      ? {
        name: seller.name,
        phone: seller.phone || null,
        commissionRate: seller.commissionRate
      }
      : null
  })

  // 5. Config
  const config = {
    apiUrl: waConfig.apiUrl,
    apiKey: waConfig.apiKey,
    phoneNumber: waConfig.phoneNumber
  }

  const fileName = `PedidoVenda_${String(sale.id).padStart(5, '0')}.pdf`
  const caption = `📄 Pedido de Venda: ${sale.customerName}\nTotal: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total / 100)}`

  // 6. Collect Recipients based on settings
  const recipients: string[] = []
  const notifications: string[] = []

  if (waConfig.quotePdfToSeller) {
    if (seller?.phone) {
      recipients.push(seller.phone)
    } else {
      notifications.push('Vendedor sem telefone configurado.')
    }
  }

  if (waConfig.quotePdfToCustomer) {
    if (sale.customerPhone) {
      recipients.push(sale.customerPhone)
    } else {
      notifications.push('Cliente sem telefone no pedido.')
    }
  }

  if (recipients.length === 0) {
    return {
      success: false,
      message:
        notifications.length > 0
          ? `Não foi possível enviar: ${notifications.join(' ')}`
          : 'Envio de WhatsApp desativado nas configurações integradas (Vendedor/Cliente)',
      sent: [],
      failed: notifications
    }
  }

  // 7. Send
  const results = await sendWhatsappPDF(
    config,
    recipients,
    pdfBuffer,
    fileName,
    caption
  )

  // 8. System Notification
  if (results.sent.length > 0) {
    await createNotification({
      companyId: sale.companyId,
      type: 'sale',
      title: 'PDF de Pedido Enviado',
      body: `Pedido #${sale.id} enviado para: ${results.sent.join(', ')}`,
      icon: 'i-heroicons-paper-airplane',
      link: '/vendas'
    })
  }

  return {
    success: results.sent.length > 0,
    sent: results.sent,
    failed: results.failed
  }
})
