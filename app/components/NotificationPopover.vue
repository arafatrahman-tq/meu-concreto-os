<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const router = useRouter()
const {
  notifications,
  unreadCount,
  loading,
  markAsRead,
  markAllAsRead,
  startPolling,
  stopPolling
} = useNotifications()

onMounted(() => startPolling(60_000))
onUnmounted(() => stopPolling())

// Logic for notification colors
const notifIconColor: Record<string, string> = {
  sale: 'text-primary-500',
  quote: 'text-blue-500',
  quote_updated: 'text-amber-500',
  transaction: 'text-violet-500',
  user: 'text-teal-500',
  product: 'text-orange-500'
}

// Relative time helper
const timeAgo = (date: Date | string) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const handleNotifClick = async (notif: { id: number, link: string | null }, close: () => void) => {
  await markAsRead(notif.id)
  if (notif.link) await router.push(notif.link)
  close()
}
</script>

<template>
  <UPopover
    :content="{ align: 'end', sideOffset: 8 }"
    :ui="{
      content: 'w-80 sm:w-96 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-xl dark:shadow-zinc-900/60'
    }"
  >
    <UTooltip
      text="Notificações"
      :content="{ sideOffset: 8 }"
    >
      <UButton
        icon="i-heroicons-bell"
        color="neutral"
        variant="ghost"
        class="hover:bg-primary-500/10 hover:text-primary-500 transition-colors rounded-xl p-2.5 relative"
      >
        <span
          v-if="unreadCount > 0"
          class="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 flex items-center justify-center bg-primary-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-zinc-950 leading-none"
        >{{ unreadCount > 99 ? "99+" : unreadCount }}</span>
        <span
          v-else
          class="absolute top-2 right-2 w-2 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full"
        />
      </UButton>
    </UTooltip>

    <template #content="{ close }">
      <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-black uppercase tracking-widest text-zinc-400">Notificações</span>
          <span
            v-if="unreadCount > 0"
            class="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-primary-500 text-white leading-none"
          >{{ unreadCount }}</span>
        </div>
        <button
          v-if="unreadCount > 0"
          class="text-[10px] font-bold text-primary-500 hover:text-primary-600 transition-colors uppercase tracking-widest"
          @click="markAllAsRead"
        >
          Marcar tudo como lido
        </button>
      </div>

      <div
        v-if="loading && notifications.length === 0"
        class="p-3 space-y-2"
      >
        <USkeleton
          v-for="i in 3"
          :key="i"
          class="h-14 rounded-xl"
        />
      </div>

      <div
        v-else-if="notifications.length === 0"
        class="flex flex-col items-center justify-center py-10 text-zinc-400"
      >
        <UIcon
          name="i-heroicons-bell-slash"
          class="w-8 h-8 mb-2 opacity-40"
        />
        <p class="text-xs font-bold">
          Nenhuma notificação ainda
        </p>
      </div>

      <ul
        v-else
        class="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 custom-scrollbar"
      >
        <li
          v-for="notif in notifications"
          :key="notif.id"
          class="group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
          :class="
            notif.readAt
              ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              : 'bg-primary-50/60 dark:bg-primary-500/5 hover:bg-primary-50 dark:hover:bg-primary-500/10'
          "
          @click="handleNotifClick(notif, close)"
        >
          <div
            v-if="!notif.readAt"
            class="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"
          />

          <div class="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <UIcon
              :name="notif.icon ?? 'i-heroicons-bell'"
              class="w-4 h-4"
              :class="notifIconColor[notif.type] ?? 'text-zinc-400'"
            />
          </div>

          <div class="flex-1 min-w-0">
            <p
              class="text-xs font-bold text-zinc-900 dark:text-white truncate"
              :class="{ 'font-black': !notif.readAt }"
            >
              {{ notif.title }}
            </p>
            <p
              v-if="notif.body"
              class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5"
            >
              {{ notif.body }}
            </p>
          </div>

          <span class="text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">
            {{ timeAgo(notif.createdAt) }}
          </span>
        </li>
      </ul>

      <div class="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800">
        <NuxtLink
          to="/configuracoes"
          class="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary-500 transition-colors"
          @click="close"
        >
          Gerenciar preferências →
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
