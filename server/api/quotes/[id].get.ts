import { eq } from "drizzle-orm";
import { quotes } from "../../database/schema";
import { db } from "../../utils/db";
import { requireCompanyAccess } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });

  const quoteId = parseInt(id);

  const quote = await db.query.quotes.findFirst({
    where: eq(quotes.id, quoteId),
    with: {
      items: true,
      seller: true,
      drivers: true,
      company: true,
    },
  });

  if (!quote) {
    throw createError({ statusCode: 404, statusMessage: "Quote not found" });
  }

  await requireCompanyAccess(event, quote.companyId);

  return { quote };
});
