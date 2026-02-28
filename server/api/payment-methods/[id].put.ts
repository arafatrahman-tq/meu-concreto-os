import { paymentMethods } from "../../database/schema";
import { paymentMethodUpdateSchema } from "../../utils/schemas";
import { db } from "../../utils/db";
import { eq } from "drizzle-orm";
import { requireCompanyAccess, requireManager } from "../../utils/session";
import { createNotification } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const paymentMethodId = parseInt(id);

  const body = await readBody(event);
  const result = paymentMethodUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: result.error.flatten(),
    });
  }

  const data = result.data;

  // Auditing: Tenant isolation for edits
  // We first fetch or use a compound where clause if companyId is available,
  // but since we need to check access before update, let's find the current record.
  const currentPayment = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, paymentMethodId))
    .get();

  if (!currentPayment) {
    throw createError({
      statusCode: 404,
      statusMessage: "Payment Method not found",
    });
  }

  requireCompanyAccess(event, currentPayment.companyId);

  try {
    const [updatedPaymentMethod] = await db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning();

    if (updatedPaymentMethod) {
      const isStatusChange = Object.keys(data).length === 1 && "active" in data;
      let title = "Forma de pagamento atualizada";
      let icon = "i-heroicons-pencil-square";

      if (isStatusChange) {
        title = updatedPaymentMethod.active
          ? "Forma de pagamento ativada"
          : "Forma de pagamento desativada";
        icon = updatedPaymentMethod.active
          ? "i-heroicons-check-circle"
          : "i-heroicons-no-symbol";
      }

      await createNotification({
        companyId: updatedPaymentMethod.companyId,
        type: "transaction",
        title,
        body: `${updatedPaymentMethod.name} foi atualizada`,
        link: "/formas-de-pagamento",
        icon,
      });
    }

    return { paymentMethod: updatedPaymentMethod };
  } catch (e: any) {
    console.error("Update Payment Method Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e.message },
    });
  }
});
