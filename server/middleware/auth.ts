import { eq } from "drizzle-orm";
import { getAuthSession } from "../utils/session";
import { userAuth } from "../database/schema";
import { db } from "../utils/db";

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/mobile-login",
  "/api/auth/mobile-companies",
  "/api/setup-admin",
];

const CRON_PATHS = [
  "/api/whatsapp/process-reminders",
  "/api/whatsapp/process-reports",
];

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // Only enforce on server API routes
  if (!path.startsWith("/api/")) return;

  // Allow public endpoints through
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return;

  // Allow cron endpoints only with valid bearer token
  if (CRON_PATHS.some((p) => path.startsWith(p))) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = getHeader(event, "authorization");

    if (!cronSecret) {
      throw createError({
        statusCode: 500,
        message: "CRON_SECRET não configurado no ambiente.",
      });
    }

    if (authHeader === `Bearer ${cronSecret}`) {
      return;
    }
  }

  const session = await getAuthSession(event);

  if (!session.data?.userId) {
    throw createError({
      statusCode: 401,
      message: "Não autorizado. Por favor, faça login.",
    });
  }

  if (!session.data.isQuickAccess) {
    const authRecord = await db
      .select({ hwidHash: userAuth.hwidHash })
      .from(userAuth)
      .where(eq(userAuth.userId, session.data.userId))
      .get();

    const hwidHeader = getHeader(event, "x-hwid");
    const ssrSecretHeader = getHeader(event, "x-ssr-secret");
    const hwidSalt =
      process.env.HWID_SALT || process.env.NUXT_SESSION_SECRET || "";
    const isInternalSSR =
      ssrSecretHeader ===
      (process.env.NUXT_SESSION_SECRET ||
        "meu-concreto-dev-only-secret-change-in-production!!");

    let requestHwidHash: string | undefined;

    if (hwidHeader) {
      const crypto = await import("crypto");
      requestHwidHash = crypto.default
        .createHash("sha256")
        .update(`${hwidHeader}:${hwidSalt}`)
        .digest("hex");
    }

    // Only enforce HWID strictly if it's not an internal SSR data fetching call
    if (authRecord?.hwidHash && !isInternalSSR) {
      if (
        authRecord.hwidHash !== session.data.hwidHash ||
        authRecord.hwidHash !== requestHwidHash
      ) {
        throw createError({
          statusCode: 403,
          message:
            "Acesso negado: dispositivo não autorizado. Por favor, refaça o login.",
        });
      }
    }
  }

  // Inject into event context for all downstream handlers
  event.context.auth = {
    userId: session.data.userId,
    authorizedCompanyIds: session.data.authorizedCompanyIds ?? [],
    role: session.data.role,
    hwidHash: session.data.hwidHash,
  };
});
