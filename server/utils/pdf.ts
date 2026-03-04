import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { companies, sellers, paymentMethods } from "../database/schema";
import { getWhatsappConfig } from "./whatsapp";

export interface DocumentPDFData {
  id: number;
  customerName: string;
  customerDocument?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  date: Date;
  validUntil?: Date | null;
  deliveryDate?: Date | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  company: {
    name: string;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    logo?: string | null;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    totalPrice: number;
    fck?: number | null;
    slump?: number | null;
    stoneSize?: string | null;
  }>;
  paymentMethod?: {
    name: string;
    type: string;
    details?: any;
  } | null;
  seller?: {
    name: string;
    phone?: string | null;
    commissionRate?: number | null;
  } | null;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );

/** Fetches common context for PDF generation (Company, Seller, WA Config). */
export async function getPDFContext(
  companyId: number,
  sellerId?: number | null
) {
  const [company, seller, waConfig, defaultPaymentMethod] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).get(),
    sellerId
      ? db.select().from(sellers).where(eq(sellers.id, sellerId)).get()
      : Promise.resolve(null),
    getWhatsappConfig(companyId),
    db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.isDefault, true)
        )
      )
      .get(),
  ]);

  if (!company) {
    throw new Error("Company not found");
  }

  return { company, seller, waConfig, defaultPaymentMethod };
}

function drawDefaultBranding(doc: any) {
  // Anvil box
  doc.setFillColor(34, 197, 94); // primary-500
  doc.roundedRect(15, 15, 10, 10, 2, 2, "F");

  // Simplified "Anvil" icon
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(17.5, 20.5, 22.5, 20.5); // base
  doc.line(19.5, 18.5, 20.5, 18.5); // top
  doc.line(19, 18, 21, 18); // top cap

  // Brand Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text("MEU", 28, 20.5);
  doc.setTextColor(34, 197, 94); // primary-500
  doc.text("CONCRETO", 40.5, 20.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("OPERATIONAL SYSTEM", 28, 24.5, { charSpace: 0.5 });
}

export async function generateDocumentPDF(
  data: DocumentPDFData
): Promise<Buffer> {
  const doc = new jsPDF() as any;

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Watermark (Background)
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.text((data.company.name || "MEU CONCRETO").toUpperCase(), pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();

  // 2. Header / Logo
  if (data.company.logo) {
    try {
      // Add Company Logo
      // Calculate aspect ratio if possible, or fit to a box.
      // Assuming square-ish logo or fit in 20x20 box
      doc.addImage(data.company.logo, "PNG", 15, 12, 20, 20, undefined, 'FAST');
    } catch (e) {
      console.error("Error adding logo to PDF", e);
      // Fallback to default branding if logo fails
      drawDefaultBranding(doc);
    }
  } else {
    drawDefaultBranding(doc);
  }

  // 3. Document Info (Right side)
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const docTitle = data.validUntil ? "ORÇAMENTO" : "PEDIDO DE VENDA";
  doc.text(
    `${docTitle} #${String(data.id).padStart(5, "0")}`,
    pageWidth - 15,
    20.5,
    {
      align: "right",
    }
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text(`Data: ${format(data.date, "dd/MM/yyyy")}`, pageWidth - 15, 25.5, {
    align: "right",
  });
  if (data.validUntil) {
    doc.text(
      `Válido até: ${format(data.validUntil, "dd/MM/yyyy")}`,
      pageWidth - 15,
      30,
      { align: "right" }
    );
  } else if (data.deliveryDate) {
    doc.setTextColor(34, 197, 94); // primary-500
    doc.setFont("helvetica", "bold");
    doc.text(
      `Entrega prevista: ${format(data.deliveryDate, "dd/MM/yyyy")}`,
      pageWidth - 15,
      30,
      { align: "right" }
    );
    doc.setTextColor(113, 113, 122);
    doc.setFont("helvetica", "normal");
  }

  // 4. Information Blocks (Three columns)
  doc.setDrawColor(228, 228, 231); // zinc-200
  doc.setLineWidth(0.1);
  doc.line(15, 38, pageWidth - 15, 38);

  const colWidth = (pageWidth - 30) / 3;

  // A. Company (Left)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("EMPRESA", 15, 46);
  doc.setFontSize(8);
  doc.text(data.company.name, 15, 52);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122);
  let compY = 56;
  if (data.company.document) {
    doc.text(`CNPJ: ${data.company.document}`, 15, compY);
    compY += 4;
  }
  if (data.company.phone) {
    doc.text(`Tel: ${data.company.phone}`, 15, compY);
    compY += 4;
  }
  if (data.company.email) {
    doc.text(`E-mail: ${data.company.email}`, 15, compY);
    compY += 4;
  }
  const compAddr = [data.company.address, data.company.city, data.company.state]
    .filter(Boolean)
    .join(", ");
  if (compAddr) {
    const splitCompAddr = doc.splitTextToSize(compAddr, colWidth - 5);
    doc.text(splitCompAddr, 15, compY);
  }

  // B. Seller (Middle)
  if (data.seller) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("VENDEDOR", 15 + colWidth, 46);
    doc.setFontSize(8);
    doc.text(data.seller.name, 15 + colWidth, 52);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    if (data.seller.phone) {
      doc.text(`Tel: ${data.seller.phone}`, 15 + colWidth, 56);
    }
    if (
      data.seller.commissionRate !== undefined &&
      data.seller.commissionRate !== null
    ) {
      doc.text(`Comissão: ${data.seller.commissionRate}%`, 15 + colWidth, 60);
    }
  }

  // C. Client (Right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("CLIENTE", 15 + colWidth * 2, 46);
  doc.setFontSize(8);
  doc.text(data.customerName, 15 + colWidth * 2, 52);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122);
  let cliY = 56;
  if (data.customerDocument) {
    doc.text(`CPF/CNPJ: ${data.customerDocument}`, 15 + colWidth * 2, cliY);
    cliY += 4;
  }
  if (data.customerPhone) {
    doc.text(`Tel: ${data.customerPhone}`, 15 + colWidth * 2, cliY);
    cliY += 4;
  }
  if (data.customerAddress) {
    const splitCliAddr = doc.splitTextToSize(data.customerAddress, colWidth);
    doc.text(splitCliAddr, 15 + colWidth * 2, cliY);
  }

  // 5. Items Table
  const tableRows = data.items.map((item) => {
    let desc = item.productName;
    const specs = [];
    if (item.fck) specs.push(`FCK ${item.fck}MPa`);
    if (item.slump) specs.push(`Slump ${item.slump}cm`);
    if (item.stoneSize) specs.push(`Brita ${item.stoneSize}`);
    if (specs.length > 0) desc += `\n(${specs.join(" | ")})`;

    return [
      desc,
      `${item.quantity} ${item.unit || ""}`,
      fmt(item.unitPrice),
      fmt(item.totalPrice),
    ];
  });

  autoTable(doc, {
    startY: 85,
    head: [["Descrição do Produto/Serviço", "Qtd", "Preço Unit.", "Total"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 8, cellPadding: 4, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
  });

  // 6. Summary & Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Observações:", 15, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    const splitNotes = doc.splitTextToSize(data.notes, 100);
    doc.text(splitNotes, 15, finalY + 5);
  }

  // Payment Method Block
  if (data.paymentMethod) {
    const pmY = finalY + (data.notes ? 20 : 0); // Shift down if notes exist
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("DADOS PARA PAGAMENTO:", 15, pmY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(`${data.paymentMethod.name}`, 15, pmY + 5);

    let detailsY = pmY + 9;
    const d = data.paymentMethod.details || {};

    if (data.paymentMethod.type === "pix" && d.pixKey) {
      doc.text(`Chave Pix: ${d.pixKey}`, 15, detailsY);
      detailsY += 4;
      if (d.bankName) {
        doc.text(`Banco: ${d.bankName}`, 15, detailsY);
        detailsY += 4;
      }
    } else if (
      (data.paymentMethod.type === "transfer" ||
        data.paymentMethod.type === "boleto") &&
      d.bankName
    ) {
      doc.text(`Banco: ${d.bankName}`, 15, detailsY);
      detailsY += 4;
      if (d.accountInfo) {
        doc.text(`Ag/Conta: ${d.accountInfo}`, 15, detailsY);
        detailsY += 4;
      }
    }

    if (d.instructions) {
      const splitInst = doc.splitTextToSize(d.instructions, 100);
      doc.text(splitInst, 15, detailsY);
    }
  }

  const summaryX = pageWidth - 65;
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text("Subtotal:", summaryX, finalY, { align: "right" });
  doc.text(fmt(data.subtotal), pageWidth - 15, finalY, { align: "right" });

  if (data.discount > 0) {
    doc.text("Desconto:", summaryX, finalY + 6, { align: "right" });
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(`- ${fmt(data.discount)}`, pageWidth - 15, finalY + 6, {
      align: "right",
    });
    doc.setTextColor(113, 113, 122);
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("TOTAL:", summaryX, finalY + 14, { align: "right" });
  doc.text(fmt(data.total), pageWidth - 15, finalY + 14, { align: "right" });

  // 7. Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(161, 161, 170); // zinc-400
  const footerText =
    "Este documento não garante reserva de agenda. Sujeito a confirmação.";
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
