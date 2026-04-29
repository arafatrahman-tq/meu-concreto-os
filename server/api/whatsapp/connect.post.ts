import { getWhatsappConfig, baileysCall } from '../../utils/whatsapp'
import { db } from '../../utils/db'
import { whatsappSettings } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, requireCompanyAccess } from '../../utils/session'
import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const companyId = Number(query.companyId)
  if (!companyId)
    throw createError({ statusCode: 400, message: 'companyId required' })

  // Security check: Verify user has access to this company
  await requireCompanyAccess(event, companyId)
  requireAdmin(event) // Only admins can trigger new connections

  const config = await getWhatsappConfig(companyId)
  if (!config?.phoneNumber) {
    throw createError({
      statusCode: 400,
      message: 'PhoneNumber not configured. Save settings first.'
    })
  }
  if (!config.apiUrl) {
    throw createError({ statusCode: 400, message: 'API URL not configured.' })
  }

  const result = await baileysCall(
    config,
    `/connections/${encodeURIComponent(config.phoneNumber)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        clientName: 'Meu Concreto ERP',
        webhookUrl: 'http://localhost:3000/api/whatsapp/webhook-dummy',
        webhookVerifyToken: 'meuconcreto-verify-token'
      })
    }
  )

  // Check the actual state returned by the API
  const apiData = result.data as any
  const isNowConnected
    = apiData?.state === 'open' || apiData?.status === 'connected'

  await db
    .update(whatsappSettings)
    .set({
      isConnected: isNowConnected,
      updatedAt: new Date()
    })
    .where(eq(whatsappSettings.companyId, companyId))

  if (isNowConnected) {
    await createNotification({
      companyId,
      type: 'system',
      title: 'WhatsApp Conectado',
      body: 'A instância do WhatsApp foi conectada com sucesso.',
      link: '/configuracoes',
      icon: 'i-heroicons-check-circle'
    })
  }

  return {
    ok: result.ok,
    status: result.status,
    message: isNowConnected
      ? 'WhatsApp conectado com sucesso.'
      : result.ok
        ? 'Conexão iniciada. Aguardando sincronização...'
        : 'Falha ao conectar. Verifique as configurações.',
    data: result.data
  }
})
