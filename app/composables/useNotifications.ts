interface Notification {
  id: number
  companyId: number
  type: 'sale' | 'quote' | 'quote_updated' | 'transaction' | 'user' | 'product'
  title: string
  body: string | null
  link: string | null
  icon: string | null
  readAt: Date | null
  createdAt: Date
}

export const useNotifications = () => {
  const { companyId } = useAuth()

  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  const fetch = async () => {
    if (!companyId.value) return
    loading.value = true
    try {
      const data = await $fetch<{ notifications: Notification[], unreadCount: number }>(
        `/api/notifications?companyId=${companyId.value}`
      )
      notifications.value = data.notifications
      unreadCount.value = data.unreadCount
    } catch (e) {
      console.error('[useNotifications] fetch error:', e)
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (id: number) => {
    const notif = notifications.value.find(n => n.id === id)
    if (!notif || notif.readAt) return
    // Optimistic update
    notif.readAt = new Date()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    try {
      await $fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    } catch {
      // Revert on failure
      notif.readAt = null
      unreadCount.value++
    }
  }

  const markAllAsRead = async () => {
    if (!companyId.value || unreadCount.value === 0) return
    // Optimistic update
    const now = new Date()
    notifications.value.forEach((n) => {
      if (!n.readAt) n.readAt = now
    })
    unreadCount.value = 0
    try {
      await $fetch('/api/notifications/read-all', {
        method: 'PATCH',
        body: { companyId: companyId.value }
      })
    } catch {
      // Re-fetch on failure
      await fetch()
    }
  }

  const startPolling = (intervalMs = 60_000) => {
    fetch()
    pollInterval = setInterval(fetch, intervalMs)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetch,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling
  }
}
