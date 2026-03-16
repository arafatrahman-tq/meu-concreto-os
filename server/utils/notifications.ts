import { notifications } from '../database/schema'
import { db } from './db'
import { getWhatsappConfig, sendWhatsappMessage } from './whatsapp'

type NotificationType = 'sale' | 'quote' | 'quote_updated' | 'transaction' | 'user' | 'product' | 'schedule' | 'customer' | 'system'

interface NotificationPayload {
  companyId: number
  type: NotificationType
  title: string
  body?: string
  link?: string
  icon?: string
  whatsapp?: {
    toNumbers: string[]
    message: string
  }
}

/**
 * Insert a notification record into the database and optionally send WhatsApp alerts.
 * Errors are swallowed so they never break the caller endpoint.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    // 1. App Notification
    await db.insert(notifications).values({
      companyId: payload.companyId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      icon: payload.icon ?? null,
      createdAt: new Date()
    })

    // 2. WhatsApp Notification (if provided and configured)
    if (payload.whatsapp && payload.whatsapp.toNumbers.length > 0) {
      const config = await getWhatsappConfig(payload.companyId)
      if (config && config.isConnected) {
        // Envio condicional baseado no tipo de notificação
        const canSend
          = payload.type === 'schedule'
            ? config.schedulesReminderEnabled
            : config.alertsEnabled

        if (canSend) {
          await sendWhatsappMessage(
            {
              apiUrl: config.apiUrl,
              apiKey: config.apiKey,
              phoneNumber: config.phoneNumber
            },
            payload.whatsapp.toNumbers,
            payload.whatsapp.message
          )
        }
      }
    }
  } catch (e) {
    console.error('[notifications] failed to process:', e)
  }
}
