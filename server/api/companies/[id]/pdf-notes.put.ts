import { eq } from "drizzle-orm";
import { z } from "zod";
import { companies } from "../../../database/schema";
import { db } from "../../../utils/db";
import { requireCompanyAccess } from "../../../utils/session";

const updatePdfNotesSchema = z.object({
  pdfNotes: z
    .string()
    .max(5000, {
      message: "As observações não podem ultrapassar 5000 caracteres.",
    })
    .nullable()
    .optional(),
});

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, "id");
  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: "ID required" });
  }

  const companyId = parseInt(idParam);
  requireCompanyAccess(event, companyId);

  const body = await readBody(event);
  const parsed = updatePdfNotesSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: parsed.error.flatten(),
    });
  }

  const nextPdfNotes = parsed.data.pdfNotes?.trim() || null;

  await db
    .update(companies)
    .set({
      pdfNotes: nextPdfNotes,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .run();

  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .get();

  if (!company) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  return { company };
});
