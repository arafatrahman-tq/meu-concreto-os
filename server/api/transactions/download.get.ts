import { eq, and, gte, lte } from 'drizzle-orm'
import { transactions, sales, saleItems, companies } from '../../database/schema'
import { db } from '../../utils/db'
import { requireCompanyAccess } from '../../utils/session'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatInAppTime } from '../../utils/timezone'

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100
  )

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = parseInt(query.companyId as string)
  const startDate = query.startDate ? new Date(query.startDate as string) : null
  const endDate = query.endDate ? new Date(query.endDate as string) : null

  if (!companyId || isNaN(companyId)) {
    throw createError({ statusCode: 400, statusMessage: 'Company ID required' })
  }

  // Auth Check
  await requireCompanyAccess(event, companyId)

  // Fetch Company
  const company = await db.select().from(companies).where(eq(companies.id, companyId)).get()
  if (!company) {
    throw createError({ statusCode: 404, statusMessage: 'Company not found' })
  }

  // Build query filters
  let whereClause = eq(transactions.companyId, companyId)

  if (startDate && endDate) {
    whereClause = and(
      whereClause,
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ) as any
  }

  // Fetch transactions with their related sales and items
  const txs = await db.query.transactions.findMany({
    where: whereClause,
    with: {
      sale: {
        with: {
          items: true
        }
      }
    },
    orderBy: (transactions, { desc }) => [desc(transactions.date)]
  })

  // Calculate volume M³ for each transaction based on linked sale
  const transactionsWithVolume = txs.map(tx => {
    let volumeM3 = 0
    if (tx.sale && tx.sale.items) {
      volumeM3 = tx.sale.items
        .filter((item: any) => item.countAsConcreteVolume)
        .reduce((sum: number, item: any) => sum + item.quantity, 0)
    }
    return {
      ...tx,
      volumeM3: volumeM3 > 0 ? volumeM3 : null
    }
  })

  // Calculate totals
  const totalIncome = transactionsWithVolume
    .filter(tx => tx.type === 'income' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpense = transactionsWithVolume
    .filter(tx => tx.type === 'expense' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalVolumeM3 = transactionsWithVolume
    .filter(tx => tx.type === 'income' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + (tx.volumeM3 || 0), 0)

  // Generate PDF
  const doc = new jsPDF() as any
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // 1. Watermark
  doc.setTextColor(244, 244, 245)
  doc.setFontSize(40)
  doc.setFont('helvetica', 'bold')
  doc.saveGraphicsState()
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
  doc.text(
    (company.name || 'MEU CONCRETO').toUpperCase(),
    pageWidth / 2,
    pageHeight / 2,
    { align: 'center', angle: 45 }
  )
  doc.restoreGraphicsState()

  // 2. Header
  doc.setFillColor(34, 197, 94)
  doc.roundedRect(15, 12, 10, 10, 3, 3, 'F')

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.6)
  doc.line(17, 18.5, 23, 18.5)
  doc.line(18.5, 18.5, 18, 15)
  doc.line(21.5, 18.5, 22, 15)
  doc.line(17.5, 15, 22.5, 15)
  doc.line(22.5, 15, 21.5, 14.5)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(24, 24, 27)
  doc.text('MEU', 28, 17.5, { charSpace: -0.5 })
  doc.setTextColor(34, 197, 94)
  doc.text('CONCRETO', 37.5, 17.5, { charSpace: -0.5 })

  // 3. Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(24, 24, 27)
  doc.text('RELATÓRIO DE TRANSAÇÕES', pageWidth - 15, 18, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)
  const periodText = startDate && endDate
    ? `Período: ${formatInAppTime(startDate, 'dd/MM/yyyy')} a ${formatInAppTime(endDate, 'dd/MM/yyyy')}`
    : `Data: ${formatInAppTime(new Date(), 'dd/MM/yyyy')}`
  doc.text(periodText, pageWidth - 15, 23, { align: 'right' })

  // 4. Company Info
  doc.setDrawColor(244, 244, 245)
  doc.setLineWidth(0.5)
  doc.line(15, 28, pageWidth - 15, 28)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(161, 161, 170)
  doc.text('EMPRESA', 15, 35, { charSpace: 0.5 })

  doc.setFontSize(9)
  doc.setTextColor(24, 24, 27)
  doc.text(company.name.toUpperCase(), 15, 41)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(113, 113, 122)
  if (company.document) {
    doc.text(`CNPJ: ${company.document}`, 15, 46)
  }

  // 5. Summary Cards
  const cardY = 55
  const cardWidth = (pageWidth - 40) / 3

  // Income Card
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(15, cardY, cardWidth, 20, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 197, 94)
  doc.text('RECEITAS', 20, cardY + 6)
  doc.setFontSize(10)
  doc.text(fmt(totalIncome), 20, cardY + 15)

  // Expense Card
  doc.setFillColor(254, 242, 242)
  doc.roundedRect(20 + cardWidth, cardY, cardWidth, 20, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(239, 68, 68)
  doc.text('DESPESAS', 25 + cardWidth, cardY + 6)
  doc.setFontSize(10)
  doc.text(fmt(totalExpense), 25 + cardWidth, cardY + 15)

  // Balance Card
  const balance = totalIncome - totalExpense
  const balanceBgColor = balance >= 0 ? [240, 253, 244] : [254, 242, 242]
  const balanceTextColor = balance >= 0 ? [34, 197, 94] : [239, 68, 68]
  doc.setFillColor(balanceBgColor[0], balanceBgColor[1], balanceBgColor[2])
  doc.roundedRect(25 + cardWidth * 2, cardY, cardWidth, 20, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(balanceTextColor[0], balanceTextColor[1], balanceTextColor[2])
  doc.text('SALDO', 30 + cardWidth * 2, cardY + 6)
  doc.setFontSize(10)
  doc.text(fmt(balance), 30 + cardWidth * 2, cardY + 15)

  // Volume Card (if there's volume)
  let tableStartY = cardY + 30
  if (totalVolumeM3 > 0) {
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(15, cardY + 25, cardWidth, 18, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(59, 130, 246)
    doc.text('VOLUME TOTAL (M³)', 20, cardY + 31)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${totalVolumeM3.toFixed(2)} m³`, 20, cardY + 39)
    tableStartY = cardY + 50
  }

  // 6. Transactions Table
  const tableRows = transactionsWithVolume.map(tx => [
    String(tx.id).padStart(5, '0'),
    formatInAppTime(new Date(tx.date as any), 'dd/MM/yyyy'),
    tx.description,
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.volumeM3 ? `${tx.volumeM3.toFixed(2)}` : '-',
    fmt(tx.amount),
    tx.status === 'paid' ? 'Pago' : tx.status === 'pending' ? 'Pendente' : 'Cancelado'
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['ID', 'DATA', 'DESCRIÇÃO', 'TIPO', 'M³', 'VALOR', 'STATUS']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: 'helvetica',
      textColor: [82, 82, 91],
      lineColor: [244, 244, 245],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 22, halign: 'center' }
    },
    didParseCell: function(data: any) {
      // Color code rows by type
      if (data.row.section === 'body') {
        const type = data.row.raw[3]
        if (type === 'Receita') {
          data.cell.styles.textColor = [34, 197, 94]
        } else if (type === 'Despesa') {
          data.cell.styles.textColor = [239, 68, 68]
        }
      }
    }
  })

  // 7. Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(161, 161, 170)
  doc.text(
    `Gerado em ${formatInAppTime(new Date(), 'dd/MM/yyyy HH:mm')} - Meu Concreto OS`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  const fileName = `Transacoes_${companyId}_${formatInAppTime(new Date(), 'yyyyMMdd')}.pdf`

  setHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`
  })

  return pdfBuffer
})
