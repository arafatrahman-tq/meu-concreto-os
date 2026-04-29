import { ref, watch, onUnmounted } from 'vue'
import type { NotificationType } from '~/types/notifications'

export interface Notification {
  id: number
  companyId: number
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  icon: string | null
  readAt: string | null // API dates come as ISO strings
  createdAt: string // API dates come as ISO strings
}

export const useNotifications = () => {
  const { companyId } = useAuth()
  const toast = useToast()

  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)

  // ─────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────
  const {
    refresh: refreshNotifications,
    pending: loading,
    error: fetchError
  } = useAsyncData(
    `notifications-${companyId.value}`,
    async () => {
      if (!companyId.value) return { notifications: [], unreadCount: 0 }

      return await $fetch<{
        notifications: Notification[]
        unreadCount: number
      }>('/api/notifications', {
        query: { companyId: companyId.value }
      })
    },
    {
      watch: [companyId],
      immediate: true,
      transform: (data) => {
        notifications.value = data.notifications || []
        unreadCount.value = data.unreadCount || 0
        return data
      }
    }
  )

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────
  const markAsRead = async (id: number) => {
    const notif = notifications.value.find(n => n.id === id)
    if (!notif || notif.readAt) return

    // Optimistic update
    const previousReadAt = notif.readAt
    notif.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)

    try {
      await $fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    } catch (e: any) {
      // Revert on failure
      notif.readAt = previousReadAt
      unreadCount.value++
      toast.add({
        title: 'Erro ao marcar como lida',
        description: getApiError(e),
        color: 'error'
      })
    }
  }

  const markAllAsRead = async () => {
    if (!companyId.value || unreadCount.value === 0) return

    // Snapshot for possible revert
    const previousNotifications = JSON.parse(JSON.stringify(notifications.value))
    const previousUnreadCount = unreadCount.value

    // Optimistic update
    const now = new Date().toISOString()
    notifications.value.forEach((n) => {
      if (!n.readAt) n.readAt = now
    })
    unreadCount.value = 0

    try {
      await $fetch('/api/notifications/read-all', {
        method: 'PATCH',
        body: { companyId: companyId.value }
      })
    } catch (e: any) {
      // Revert on failure
      notifications.value = previousNotifications
      unreadCount.value = previousUnreadCount
      toast.add({
        title: 'Erro ao marcar todas como lidas',
        description: getApiError(e),
        color: 'error'
      })
    }
  }

  // ─────────────────────────────────────────────
  // Polling
  // ─────────────────────────────────────────────
  let pollInterval: any = null

  const startPolling = (intervalMs = 60_000) => {
    stopPolling() // Ensure no duplicate intervals
    pollInterval = setInterval(() => {
      if (!loading.value) refreshNotifications()
    }, intervalMs)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling
  }
}
