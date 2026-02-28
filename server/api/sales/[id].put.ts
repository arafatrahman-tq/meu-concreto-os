import { eq } from "drizzle-orm";
import { sales, saleItems } from "../../database/schema";
import { saleUpdateSchema } from "../../utils/schemas";
import { db, parseDate } from "../../utils/db";
import { requireCompanyAccess } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const saleId = parseInt(id);

  const existing = await db
    .select({ companyId: sales.companyId, status: sales.status })
    .from(sales)
    .where(eq(sales.id, saleId))
    .get();
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });
  requireCompanyAccess(event, existing.companyId);

  // Guard: Completed sales can only have their status changed (e.g. re-open), not their data/items
  // UNLESS user is admin/manager
  const auth = event.context.auth;
  const body = await readBody(event);
  const isStatusOnlyUpdate =
    body && Object.keys(body).length === 1 && body.status;

  if (existing.status === "completed" && !isStatusOnlyUpdate) {
    if (auth?.role !== "admin" && auth?.role !== "manager") {
      throw createError({
        statusCode: 422,
        statusMessage:
          "Vendas concluídas não podem ser editadas. Apenas administradores e gerentes têm permissão.",
      });
    }
  }

  const result = saleUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: result.error.flatten(),
    });
  }

  const { items, ...saleData } = result.data;

  try {
    const updatedSale = await db.transaction(async (tx) => {
      // 1. Get current sale to get current subtotal/discount if needed
      const [currentSale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, saleId))
        .limit(1);

      if (!currentSale) {
        throw createError({ statusCode: 404, statusMessage: "Sale not found" });
      }

      let newSubtotal = currentSale.subtotal;

      // 2. Handle Items if provided
      if (items) {
        // Delete old items
        await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));

        // Insert new items and calc subtotal
        let subtotal = 0;
        const processedItems = items.map((item) => {
          const lineTotal = Math.round(item.quantity * item.unitPrice);
          subtotal += lineTotal;
          return {
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: lineTotal,
            fck: item.fck,
            slump: item.slump,
            stoneSize: item.stoneSize,
            mixDesignId: item.mixDesignId,
            saleId: saleId,
          };
        });

        if (processedItems.length > 0) {
          await tx.insert(saleItems).values(processedItems);
        }

        newSubtotal = subtotal;
      }

      // 3. Calculate new total
      const discount = saleData.discount ?? currentSale.discount;
      const total = Math.max(0, newSubtotal - discount);

      // 4. Update Sale
      await tx
        .update(sales)
        .set({
          ...saleData,
          subtotal: newSubtotal,
          total,
          updatedAt: new Date(),
          date: parseDate(saleData.date),
          deliveryDate: parseDate(saleData.deliveryDate),
        })
        .where(eq(sales.id, saleId));

      const updated = await tx.query.sales.findFirst({
        where: eq(sales.id, saleId),
        with: { items: true, seller: true },
      });

      return updated;
    });

    return { sale: updatedSale };
  } catch (e: unknown) {
    const err = e as {
      statusCode?: number;
      statusMessage?: string;
      message?: string;
    };
    console.error("Update Sale Error:", e);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || "Internal Server Error",
      data: { message: err.message },
    });
  }
});
