import { eq } from "drizzle-orm";
import { drivers } from "#server/database/schema";
import { db } from "#server/utils/db";
import { requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  const driverId = parseInt(id);

  const driver = await db
    .select()
    .from(drivers)
    .where(eq(drivers.id, driverId))
    .get();
  if (!driver)
    throw createError({ statusCode: 404, statusMessage: "Driver not found" });

  await requireCompanyAccess(event, driver.companyId);

  try {
    const [deleted] = await db
      .delete(drivers)
      .where(eq(drivers.id, driverId))
      .returning();
    if (!deleted)
      throw createError({ statusCode: 404, statusMessage: "Driver not found" });
    return { success: true, id: driverId };
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    console.error("Delete Driver Error:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: e instanceof Error ? e.message : "Unknown error" },
    });
  }
});
