import { pumpers } from "#server/database/schema";
import { pumperSchema } from "#server/utils/schemas";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = pumperSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Validation Error",
      data: result.error.flatten(),
    });
  }

  await requireCompanyAccess(event, result.data.companyId);

  try {
    const [newPumper] = await db
      .insert(pumpers)
      .values(result.data)
      .returning();
    return { pumper: newPumper };
  } catch (e: unknown) {
    console.error("Create Pumper Error:", e);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
