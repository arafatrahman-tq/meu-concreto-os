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
    pdfNotes?: string | null;
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
  paymentMethod2?: {
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
    cents / 100,
  );

/** Fetches common context for PDF generation (Company, Seller, WA Config). */
export async function getPDFContext(
  companyId: number,
  sellerId?: number | null,
) {
  const { company, seller, waConfig } = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).get(),
    sellerId
      ? db.select().from(sellers).where(eq(sellers.id, sellerId)).get()
      : Promise.resolve(null),
    getWhatsappConfig(companyId),
  ]).then(([c, s, w]) => ({ company: c, seller: s, waConfig: w }));

  if (!company) {
    throw new Error("Company not found");
  }

  return { company, seller, waConfig };
}

export async function getPaymentMethodDetails(
  companyId: number,
  methodName: string | null,
) {
  if (!methodName) {
    return db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.isDefault, true),
        ),
      )
      .get();
  }

  return db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.companyId, companyId),
        eq(paymentMethods.name, methodName),
      ),
    )
    .get();
}

function drawDefaultBranding(doc: any) {
  // Anvil box (rounded-xl styled)
  doc.setFillColor(34, 197, 94); // primary-500
  doc.roundedRect(15, 12, 10, 10, 3, 3, "F");

  // Simplified "Anvil" logo (similar to i-lucide-anvil)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  // Anvil shape
  doc.line(17, 18.5, 23, 18.5); // bottom
  doc.line(18.5, 18.5, 18, 15); // stand left
  doc.line(21.5, 18.5, 22, 15); // stand right
  doc.line(17.5, 15, 22.5, 15); // top left to right
  doc.line(22.5, 15, 21.5, 14.5); // top tip

  // Brand Name
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text("MEU", 28, 17.5, { charSpace: -0.5 });
  doc.setTextColor(34, 197, 94); // primary-500
  doc.text("CONCRETO", 37.5, 17.5, { charSpace: -0.5 });

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("OPERATIONAL SYSTEM", 28, 21.5, { charSpace: 0.5 });
}

export async function generateDocumentPDF(
  data: DocumentPDFData,
): Promise<Buffer> {
  const doc = new jsPDF() as any;

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Watermark (Background)
  doc.setTextColor(244, 244, 245); // zinc-100
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  doc.text(
    (data.company.name || "MEU CONCRETO").toUpperCase(),
    pageWidth / 2,
    pageHeight / 2,
    {
      align: "center",
      angle: 45,
    },
  );
  doc.restoreGraphicsState();

  // 2. Header / Logo
  if (data.company.logo) {
    try {
      // Add Company Logo
      doc.addImage(data.company.logo, "PNG", 15, 12, 20, 20, undefined, "FAST");
    } catch (e) {
      console.error("Error adding logo to PDF", e);
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
    },
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
      { align: "right" },
    );
  } else if (data.deliveryDate) {
    doc.setTextColor(34, 197, 94); // primary-500
    doc.setFont("helvetica", "bold");
    doc.text(
      `Entrega prevista: ${format(data.deliveryDate, "dd/MM/yyyy")}`,
      pageWidth - 15,
      30,
      { align: "right" },
    );
    doc.setTextColor(113, 113, 122);
    doc.setFont("helvetica", "normal");
  }

  // 4. Information Blocks (Three columns)
  doc.setDrawColor(244, 244, 245); // zinc-100
  doc.setLineWidth(0.5);
  doc.line(15, 38, pageWidth - 15, 38);

  const colWidth = (pageWidth - 30) / 3;

  // A. Company (Left)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("EMPRESA", 15, 46, { charSpace: 0.5 });

  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text(data.company.name.toUpperCase(), 15, 52);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122); // zinc-500
  let compY = 57;
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
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text("VENDEDOR", 15 + colWidth, 46, { charSpace: 0.5 });

    doc.setFontSize(9);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(data.seller.name.toUpperCase(), 15 + colWidth, 52);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122); // zinc-500
    if (data.seller.phone) {
      doc.text(`Tel: ${data.seller.phone}`, 15 + colWidth, 57);
    }
  }

  // C. Client (Right)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("CLIENTE", 15 + colWidth * 2, 46, { charSpace: 0.5 });

  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text(data.customerName.toUpperCase(), 15 + colWidth * 2, 52);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122); // zinc-500
  let cliY = 57;
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
      fillColor: [34, 197, 94], // primary-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      font: "helvetica",
      textColor: [82, 82, 91], // zinc-600
      lineColor: [244, 244, 245], // zinc-100
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: {
        cellWidth: 30,
        halign: "right",
        fontStyle: "bold",
        textColor: [24, 24, 27],
      },
    },
  });

  // 6. Summary & Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  if (data.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text("OBSERVAÇÕES DO PEDIDO:", 15, finalY, { charSpace: 0.5 });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122); // zinc-500
    const splitNotes = doc.splitTextToSize(data.notes, 100);
    doc.text(splitNotes, 15, finalY + 5);
  }

  // Payment Method Block
  if (data.paymentMethod) {
    const pmY =
      finalY +
      (data.notes ? doc.splitTextToSize(data.notes, 100).length * 4 + 8 : 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text("DADOS PARA PAGAMENTO:", 15, pmY, { charSpace: 0.5 });

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(`${data.paymentMethod.name.toUpperCase()}`, 15, pmY + 5);

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
      detailsY += splitInst.length * 4;
    }

    // Payment Method 2 Block — rendered inline if present
    if (data.paymentMethod2) {
      detailsY += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text(`${data.paymentMethod2.name}`, 15, detailsY);
      detailsY += 4;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(113, 113, 122);
      const d2 = data.paymentMethod2.details || {};

      if (data.paymentMethod2.type === "pix" && d2.pixKey) {
        doc.text(`Chave Pix: ${d2.pixKey}`, 15, detailsY);
        detailsY += 4;
        if (d2.bankName) {
          doc.text(`Banco: ${d2.bankName}`, 15, detailsY);
          detailsY += 4;
        }
      } else if (
        (data.paymentMethod2.type === "transfer" ||
          data.paymentMethod2.type === "boleto") &&
        d2.bankName
      ) {
        doc.text(`Banco: ${d2.bankName}`, 15, detailsY);
        detailsY += 4;
        if (d2.accountInfo) {
          doc.text(`Ag/Conta: ${d2.accountInfo}`, 15, detailsY);
          detailsY += 4;
        }
      }

      if (d2.instructions) {
        const splitInst2 = doc.splitTextToSize(d2.instructions, 100);
        doc.text(splitInst2, 15, detailsY);
      }
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

  // 7. Company PDF Notes (if exists)
  let currentY = finalY + 20;
  if (data.company.pdfNotes) {
    // Calculate position after payment method block
    if (data.paymentMethod) {
      const pmY = finalY + (data.notes ? 20 : 0);
      let detailsY = pmY + 9;
      const d = data.paymentMethod.details || {};

      if (data.paymentMethod.type === "pix" && d.pixKey) {
        detailsY += 4;
        if (d.bankName) detailsY += 4;
      } else if (
        (data.paymentMethod.type === "transfer" ||
          data.paymentMethod.type === "boleto") &&
        d.bankName
      ) {
        detailsY += 4;
        if (d.accountInfo) detailsY += 4;
      }

      if (d.instructions) {
        const splitInst = doc.splitTextToSize(d.instructions, 100);
        detailsY += splitInst.length * 4;
      }

      if (data.paymentMethod2) {
        detailsY += 4;
        const d2 = data.paymentMethod2.details || {};
        if (data.paymentMethod2.type === "pix" && d2.pixKey) {
          detailsY += 4;
          if (d2.bankName) detailsY += 4;
        } else if (
          (data.paymentMethod2.type === "transfer" ||
            data.paymentMethod2.type === "boleto") &&
          d2.bankName
        ) {
          detailsY += 4;
          if (d2.accountInfo) detailsY += 4;
        }
        if (d2.instructions) {
          const splitInst2 = doc.splitTextToSize(d2.instructions, 100);
          detailsY += splitInst2.length * 4;
        }
      }
      currentY = detailsY + 10;
    }

    // Check if there's enough space, otherwise add new page
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 30;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.setDrawColor(244, 244, 245); // zinc-100
    doc.setLineWidth(0.5);
    doc.line(15, currentY - 3, pageWidth - 15, currentY - 3);
    doc.text("OBSERVAÇÕES E TERMOS:", 15, currentY + 2, { charSpace: 0.5 });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122); // zinc-500
    const splitPdfNotes = doc.splitTextToSize(
      data.company.pdfNotes,
      pageWidth - 30,
    );
    doc.text(splitPdfNotes, 15, currentY + 8);

    currentY = currentY + 8 + splitPdfNotes.length * 4 + 5;
  }

  // 8. Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(161, 161, 170); // zinc-400
  const footerText =
    "Este documento não garante reserva de agenda. Sujeito a confirmação.";
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
