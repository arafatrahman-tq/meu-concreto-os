import { eq } from 'drizzle-orm'
import { sales } from '../../../database/schema'
import { db } from '../../../utils/db'
import { generateDocumentPDF, getPDFContext } from '../../../utils/pdf'
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

    const fileName = `PedidoVenda_${String(sale.id).padStart(5, '0')}.pdf`

    // 5. Send PDF
    setHeaders(event, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
    })

    return pdfBuffer
})
