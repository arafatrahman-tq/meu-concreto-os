import { eq } from "drizzle-orm";
import { drivers } from "#server/database/schema";
import { driverUpdateSchema } from "#server/utils/schemas";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const driverId = parseInt(id);

  const body = await readBody(event);
  const result = driverUpdateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: result.error.flatten(),
    });
  }

  const existing = await db
    .select()
    .from(drivers)
    .where(eq(drivers.id, driverId))
    .get();
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: "Driver not found" });

  await requireCompanyAccess(event, existing.companyId);

  try {
    const [updated] = await db
      .update(drivers)
      .set(result.data)
      .where(eq(drivers.id, driverId))
      .returning();
    if (!updated)
      throw createError({ statusCode: 404, statusMessage: "Driver not found" });
    return { driver: updated };
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    console.error("Update Driver Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
