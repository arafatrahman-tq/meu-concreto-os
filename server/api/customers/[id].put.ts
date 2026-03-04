import { and, eq, or } from "drizzle-orm";
import { companies } from "../../database/schema";
import { db } from "../../utils/db";
import { z } from "zod";
import { requireCompanyAccess } from "../../utils/session";
import {
  scopeCustomerDocument,
  unscopeCustomerDocument,
} from "../../utils/customer";

const customerUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  document: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),
  active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "ID required" });
  const customerId = parseInt(id);

  const body = await readBody(event);
  const result = customerUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Validation Error",
      data: result.error.flatten(),
    });
  }

  // 1. Fetch current to check ownership
  const existing = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, customerId), eq(companies.isCustomer, true)))
    .get();

  if (!existing) {
    throw createError({ statusCode: 404, message: "Customer not found" });
  }

  if (existing.ownerCompanyId) {
    requireCompanyAccess(event, existing.ownerCompanyId);
  }

  // Check for duplicate document within the same company.
  // Compare against the unscoped existing value so a legacy record (raw CPF)
  // and a scoped record both produce the same comparison target.
  const existingDocUnscoped = unscopeCustomerDocument(existing.document);
  if (
    result.data.document &&
    result.data.document !== existingDocUnscoped &&
    existing.ownerCompanyId
  ) {
    const scopedDoc = scopeCustomerDocument(
      result.data.document,
      existing.ownerCompanyId,
    );
    const duplicate = await db
      .select()
      .from(companies)
      .where(
        and(
          or(
            eq(companies.document, result.data.document), // legacy unscoped
            eq(companies.document, scopedDoc), // new scoped format
          ),
          eq(companies.isCustomer, true),
          eq(companies.ownerCompanyId, existing.ownerCompanyId),
        ),
      )
      .get();

    if (duplicate) {
      throw createError({
        statusCode: 409,
        message: "Já existe um cliente com este documento.",
      });
    }
  }

  // 2. Update — scope the document so the same CPF/CNPJ can exist in
  // multiple companies without violating the global UNIQUE constraint.
  const scopedData = { ...result.data };
  if (scopedData.document && existing.ownerCompanyId) {
    scopedData.document = scopeCustomerDocument(
      scopedData.document,
      existing.ownerCompanyId,
    );
  }
  const updated = await db
    .update(companies)
    .set({
      ...scopedData,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, customerId))
    .returning()
    .get();

  // Always return the clean CPF/CNPJ regardless of internal scoped format.
  return {
    customer: {
      ...updated,
      document: unscopeCustomerDocument(updated.document),
    },
  };
});
