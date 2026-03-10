import { useSession } from 'h3'
import type { H3Event } from 'h3'

// ─── Session shape stored server-side (signed/encrypted cookie) ───────────────
export interface SessionData {
  userId: number
  authorizedCompanyIds: number[]
  role: string
  isQuickAccess?: boolean
}

// Set NUXT_SESSION_SECRET in .env — must be ≥32 chars in production
const FALLBACK_SECRET = 'meu-concreto-dev-only-secret-change-in-production!!'
if (process.env.NODE_ENV === 'production' && !process.env.NUXT_SESSION_SECRET) {
  throw new Error(
    '[Security] NUXT_SESSION_SECRET env var is required in production. Set a random ≥32-char string.'
  )
}
const SESSION_PASSWORD = process.env.NUXT_SESSION_SECRET || FALLBACK_SECRET

export const getAuthSession = (event: H3Event) =>
  useSession<SessionData>(event, {
    password: SESSION_PASSWORD,
    name: 'mc_session',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })

// ─── Ownership guard ──────────────────────────────────────────────────────────
// Call after fetching a resource — throws 403 if the resource's companyId
// is not in the authenticated user's authorized list.
export const requireCompanyAccess = (event: H3Event, companyId: number) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado. Por favor, faça login.'
    })
  }
  if (!auth.authorizedCompanyIds.includes(companyId)) {
    throw createError({
      statusCode: 403,
      message: 'Acesso negado: você não tem permissão para os dados desta empresa'
    })
  }
}

// ─── Role guards ──────────────────────────────────────────────────────────────
export const requireAdmin = (event: H3Event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado. Por favor, faça login.'
    })
  }
  if (auth.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Acesso negado: privilégios administrativos necessários'
    })
  }
}

export const requireManager = (event: H3Event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado. Por favor, faça login.'
    })
  }
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    throw createError({
      statusCode: 403,
      message: 'Acesso negado: privilégios de gerente ou administrador necessários'
    })
  }
}
