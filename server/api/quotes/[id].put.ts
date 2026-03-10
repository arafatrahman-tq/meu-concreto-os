import { eq } from "drizzle-orm";
import { quotes, quoteItems, quotesDrivers } from "../../database/schema";
import { db, parseDate } from "../../utils/db";
import { quoteUpdateSchema } from "../../utils/schemas";
import { requireCompanyAccess } from "../../utils/session";
import { createNotification } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "ID obrigatório" });

  const quoteId = parseInt(id);

  const existing = await db
    .select({
      companyId: quotes.companyId,
      status: quotes.status,
      customerName: quotes.customerName,
    })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .get();
  if (!existing)
    throw createError({
      statusCode: 404,
      statusMessage: "Orçamento não encontrado",
    });

  requireCompanyAccess(event, existing.companyId);

  const body = await readBody(event);

  // Validation
  const validation = quoteUpdateSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Falha na validação",
      data: validation.error.flatten(),
    });
  }

  const { items, driverIds, ...quoteData } = validation.data;
  const isManagerOrAdmin =
    event.context.auth?.role === "admin" ||
    event.context.auth?.role === "manager";

  const normalizedItems = isManagerOrAdmin ? items : undefined;
  const normalizedQuoteData = { ...quoteData };
  if (!isManagerOrAdmin) {
    delete normalizedQuoteData.status;
    delete normalizedQuoteData.discount;
  }

  try {
    await db.transaction(async (tx) => {
      // Fetch current quote to get existing values for calculations
      const currentQuote = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .get();
      if (!currentQuote)
        throw createError({
          statusCode: 404,
          statusMessage: "Orçamento não encontrado",
        });

      let subtotal = currentQuote.subtotal;
      const discount =
        normalizedQuoteData.discount !== undefined
          ? normalizedQuoteData.discount
          : currentQuote.discount;

      // If items are being updated, recalculate subtotal
      if (normalizedItems) {
        // Delete existing items
        await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));

        // Insert new items and sum subtotal
        subtotal = 0;
        const itemsToInsert = normalizedItems.map((item) => {
          const itemTotal = item.quantity * item.unitPrice;
          subtotal += itemTotal;
          return {
            quoteId: quoteId,
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal,
            fck: item.fck,
            slump: item.slump,
            stoneSize: item.stoneSize,
          };
        });

        if (itemsToInsert.length > 0) {
          await tx.insert(quoteItems).values(itemsToInsert);
        }
      }

      const total = subtotal - discount;

      // Update Drivers if provided
      if (driverIds !== undefined) {
        await tx
          .delete(quotesDrivers)
          .where(eq(quotesDrivers.quoteId, quoteId));
        if (driverIds.length > 0) {
          await tx.insert(quotesDrivers).values(
            driverIds.map((driverId) => ({
              quoteId: quoteId,
              driverId,
            })),
          );
        }
      }

      // Update Quote Header
      await tx
        .update(quotes)
        .set({
          ...normalizedQuoteData,
          subtotal,
          discount,
          total,
          validUntil: parseDate(normalizedQuoteData.validUntil),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId));
    });

    // Return full object
    const fullQuote = await db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId),
      with: { items: true, seller: true, drivers: true },
    });

    // Notification trigger — only when status changes to approved or rejected
    if (
      normalizedQuoteData.status &&
      normalizedQuoteData.status !== existing.status &&
      (normalizedQuoteData.status === "approved" ||
        normalizedQuoteData.status === "rejected")
    ) {
      const statusLabel =
        normalizedQuoteData.status === "approved" ? "aprovado" : "rejeitado";
      await createNotification({
        companyId: existing.companyId,
        type: "quote_updated",
        title: `Orçamento ${statusLabel}`,
        body: `${existing.customerName} — status atualizado para ${statusLabel}`,
        link: "/orcamentos",
        icon:
          normalizedQuoteData.status === "approved"
            ? "i-heroicons-check-circle"
            : "i-heroicons-x-circle",
      });
    }

    return { quote: fullQuote };
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    console.error("Database Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: { message: e instanceof Error ? e.message : "Erro desconhecido" },
    });
  }
});
