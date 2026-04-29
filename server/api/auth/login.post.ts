import { eq } from "drizzle-orm";
import {
  users,
  userAuth,
  userCompanies,
  companies,
} from "../../database/schema";
import { loginSchema } from "../../utils/schemas";
import { db } from "../../utils/db";
import { getAuthSession } from "../../utils/session";
import { checkRateLimit, clearRateLimit } from "../../utils/rateLimit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const HWID_SALT =
  process.env.HWID_SALT || process.env.NUXT_SESSION_SECRET || "";

const hashHwid = (value: string) =>
  crypto.createHash("sha256").update(`${value}:${HWID_SALT}`).digest("hex");

export default defineEventHandler(async (event) => {
  // ─── Rate limiting — by client IP ─────────────────────────────
  const clientIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  checkRateLimit(`login:${clientIp}`);

  const body = await readBody(event);
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: "Falha na validação",
      data: result.error.flatten(),
    });
  }

  const { email, password } = result.data;
  const hwid = getHeader(event, "x-hwid");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    // Timing attack protection
    await bcrypt.hash("dummy", 10);
    throw createError({
      statusCode: 401,
      message: "Credenciais inválidas",
    });
  }

  const auth = await db
    .select()
    .from(userAuth)
    .where(eq(userAuth.userId, user.id))
    .get();

  if (!auth) {
    throw createError({
      statusCode: 500,
      message: "Registro de autenticação ausente",
    });
  }

  const isValid = await bcrypt.compare(password, auth.passwordHash);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: "Credenciais inválidas",
    });
  }

  let hwidHash: string | undefined;
  if (hwid) {
    hwidHash = hashHwid(hwid);

    if (!auth.hwidHash && !auth.hwid) {
      // First login with HWID - bind hash only
      await db
        .update(userAuth)
        .set({ hwidHash, hwid: null, updatedAt: new Date() })
        .where(eq(userAuth.id, auth.id));
    } else if (auth.hwidHash && auth.hwidHash !== hwidHash) {
      throw createError({
        statusCode: 403,
        message: "Aparelho não reconhecido. Acesso negado.",
        data: { reason: "HWID mismatch" },
      });
    } else if (auth.hwid && !auth.hwidHash) {
      if (auth.hwid !== hwid) {
        throw createError({
          statusCode: 403,
          message: "Aparelho não reconhecido. Acesso negado.",
          data: { reason: "HWID mismatch" },
        });
      }

      await db
        .update(userAuth)
        .set({ hwidHash, hwid: null, updatedAt: new Date() })
        .where(eq(userAuth.id, auth.id));
    }
  } else if (auth.hwidHash || auth.hwid) {
    throw createError({
      statusCode: 403,
      message: "Aparelho não reconhecido. Acesso negado.",
    });
  }

  // Update last login
  await db
    .update(userAuth)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(userAuth.id, auth.id));

  // Fetch all companies this user belongs to via junction table
  const userCompanyList = await db
    .select({
      id: companies.id,
      name: companies.name,
      role: userCompanies.role,
    })
    .from(userCompanies)
    .innerJoin(companies, eq(userCompanies.companyId, companies.id))
    .where(eq(userCompanies.userId, user.id))
    .all();

  // Create server-side signed session
  const session = await getAuthSession(event);
  await session.update({
    userId: user.id,
    authorizedCompanyIds: userCompanyList.map((c) => c.id),
    role: user.role,
    hwidHash,
  });

  // Successful login — reset the rate-limit counter for this IP
  clearRateLimit(`login:${clientIp}`);

  return {
    message: "Login realizado com sucesso",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      defaultCompanyId: user.defaultCompanyId,
    },
    companies: userCompanyList,
  };
});
