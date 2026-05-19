import { getAuthSession } from '../utils/session'

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/mobile-login',
  '/api/auth/mobile-companies',
  '/api/setup-admin'
]

const CRON_PATHS = [
  '/api/whatsapp/process-reminders',
  '/api/whatsapp/process-reports'
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only enforce on server API routes
  if (!path.startsWith('/api/')) return

  // Allow public endpoints through
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return

  // Allow cron endpoints only with valid bearer token
  if (CRON_PATHS.some(p => path.startsWith(p))) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = getHeader(event, 'authorization')

    if (!cronSecret) {
      throw createError({
        statusCode: 500,
        message: 'CRON_SECRET não configurado no ambiente.'
      })
    }

    if (authHeader === `Bearer ${cronSecret}`) {
      return
    }
  }

  const session = await getAuthSession(event)

  if (!session.data?.userId) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado. Por favor, faça login.'
    })
  }

  // Inject into event context for all downstream handlers
  event.context.auth = {
    userId: session.data.userId,
    authorizedCompanyIds: session.data.authorizedCompanyIds ?? [],
    role: session.data.role
  }
})
