import { and, eq, or } from "drizzle-orm";
import { companies } from "../database/schema";
import { db } from "../utils/db";
import { z } from "zod";
import { createNotification } from "../utils/notifications";
import { requireCompanyAccess } from "../utils/session";
import { scopeCustomerDocument } from "../utils/customer";

const customerUpsertSchema = z.object({
  companyId: z.number().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z
    .string()
    .email({ message: "Invalid email" })
    .optional()
    .or(z.literal("")),
  document: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "") || undefined),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "") || undefined),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional().or(z.literal("")),
  zip: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "") || undefined),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = customerUpsertSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Validation Error",
      data: result.error.flatten(),
    });
  }

  const data = result.data;

  // Secure: check if user has access to this company before processing
  if (data.companyId) {
    requireCompanyAccess(event, data.companyId);
  }

  try {
    // If a document is provided, try to find an existing company record to update.
    // We check both the raw CPF/CNPJ (legacy records) and the scoped format
    // ({doc}@{ownerCompanyId}) used by new records, so the same document is
    // found regardless of which format it was stored in.
    if (data.document && data.companyId) {
      const scopedDoc = scopeCustomerDocument(data.document, data.companyId);
      const existing = await db
        .select()
        .from(companies)
        .where(
          and(
            or(
              eq(companies.document, data.document), // legacy unscoped
              eq(companies.document, scopedDoc), // new scoped format
            ),
            eq(companies.isCustomer, true),
            eq(companies.ownerCompanyId, data.companyId),
          ),
        )
        .get();

      if (existing) {
        // UPDATE — preserve document (immutable) and createdAt
        const updated = await db
          .update(companies)
          .set({
            name: data.name,
            email: data.email !== undefined ? data.email : existing.email,
            phone: data.phone ?? existing.phone,
            address: data.address ?? existing.address,
            city: data.city ?? existing.city,
            state: data.state || existing.state,
            zip: data.zip ?? existing.zip,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, existing.id))
          .returning()
          .get();

        // Notification trigger
        if (data.companyId) {
          await createNotification({
            companyId: data.companyId,
            type: "customer",
            title: "Cliente atualizado",
            body: `${updated.name}${updated.document ? ` — Doc: ${updated.document}` : ""}`,
            link: "/clientes",
            icon: "i-heroicons-user",
          });
        }

        return { customer: updated, action: "updated" };
      }
    }

    // CREATE — new company record for this customer, flagged so it never
    // appears in the Empresas tenant management view.
    const created = await db
      .insert(companies)
      .values({
        name: data.name,
        // Scope real documents to ownerCompanyId so the same CPF/CNPJ can be
        // registered in multiple tenant companies without violating the global
        // UNIQUE constraint on companies.document. Synthetic placeholders are
        // used as-is when no document is provided.
        document:
          data.document && data.companyId
            ? scopeCustomerDocument(data.document, data.companyId)
            : `_cust_${Date.now()}`,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state || undefined,
        zip: data.zip,
        active: true,
        isCustomer: true,
        ownerCompanyId: data.companyId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .get();

    // Notification trigger
    if (data.companyId) {
      await createNotification({
        companyId: data.companyId,
        type: "customer",
        title: "Novo cliente cadastrado",
        body: `${created.name}${created.document ? ` — Doc: ${created.document}` : ""}`,
        link: "/clientes",
        icon: "i-heroicons-user-plus",
      });
    }

    return { customer: created, action: "created" };
  } catch (e: any) {
    if (
      e.cause?.code === "SQLITE_CONSTRAINT" ||
      e.message?.includes("UNIQUE constraint failed")
    ) {
      throw createError({
        statusCode: 409,
        message: "Customer already registered with this document",
      });
    }

    console.error("Customer upsert error:", e);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error",
      data: { message: e.message },
    });
  }
});
