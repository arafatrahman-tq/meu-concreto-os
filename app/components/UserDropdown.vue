<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DropdownMenuItem } from '#ui/types'

const { user, clearUser } = useAuth()
const router = useRouter()

const props = defineProps<{
  collapsed?: boolean
}>()

const handleLogout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  clearUser()
  await router.push('/login')
}

const userInitials = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
})

// Type correctly for DropdownMenuItem[][]
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Sair',
      icon: 'i-heroicons-arrow-right-start-on-rectangle',
      color: 'error',
      onSelect: handleLogout
    }
  ]
])
</script>

<template>
  <UDropdownMenu
    v-if="user"
    :items="menuItems"
    :content="{
      align: collapsed ? 'center' : 'start',
      side: collapsed ? 'right' : 'top',
      sideOffset: 12
    }"
    :ui="{ content: 'w-48' }"
  >
    <!-- GATILHO (Trigger) do Dropdown -->
    <div
      class="flex items-center rounded-2xl group transition-all duration-300 cursor-pointer shadow-sm border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
      :class="[collapsed ? 'p-2 justify-center' : 'p-3 gap-3 w-full']"
    >
      <!-- Avatar com indicador de status -->
      <div class="relative shrink-0 flex">
        <UAvatar
          :alt="user?.name ?? 'Usuário'"
          :text="userInitials"
          size="sm"
          class="ring-2 ring-primary-500/20"
        />
        <div
          class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-zinc-50 dark:border-zinc-900 rounded-full"
        />
      </div>

      <!-- Informações do Usuário (Ocultas quando colapsado) -->
      <div
        v-if="!collapsed"
        class="flex flex-col min-w-0 flex-1 text-left"
      >
        <span class="text-xs font-black text-zinc-900 dark:text-white truncate">
          {{ user?.name ?? "Usuário" }}
        </span>
        <span
          class="text-[10px] font-bold text-zinc-400 truncate uppercase tracking-widest leading-none mt-0.5"
        >
          {{ user?.role ?? "Meu Concreto" }}
        </span>
      </div>

      <!-- Ícone indicador (Substitui o botão de logout solto anterior) -->
      <UIcon
        v-if="!collapsed"
        name="i-heroicons-ellipsis-vertical"
        class="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      />
    </div>
  </UDropdownMenu>
</template>
