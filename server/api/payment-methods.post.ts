import { paymentMethods } from "../database/schema";
import { paymentMethodSchema } from "../utils/schemas";
import { db } from "../utils/db";
import { requireCompanyAccess, requireManager } from "../utils/session";
import { createNotification } from "../utils/notifications";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = paymentMethodSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Validation Error",
      data: result.error.flatten(),
    });
  }

  const data = result.data;

  // Auditing: Tenant isolation check for creation
  requireCompanyAccess(event, data.companyId);

  try {
    const [newPaymentMethod] = await db
      .insert(paymentMethods)
      .values({
        ...data,
        details: data.details,
      })
      .returning();

    if (newPaymentMethod) {
      await createNotification({
        companyId: newPaymentMethod.companyId,
        type: "transaction",
        title: "Nova forma de pagamento",
        body: `${newPaymentMethod.name} foi adicionada`,
        link: "/formas-de-pagamento",
        icon: "i-heroicons-credit-card",
      });
    }

    return { paymentMethod: newPaymentMethod };
  } catch (e: any) {
    console.error("Create Payment Method Error:", e);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error",
      data: { message: e.message },
    });
  }
});
