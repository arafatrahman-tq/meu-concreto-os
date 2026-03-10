<script setup lang="ts">
const props = defineProps<{
  user: any
  companyName?: string
  city?: string | null
  state?: string | null
}>()

const initials = computed(() => {
  if (!props.user?.name) return 'U'
  return props.user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const userRoleLabel = computed(() => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    user: 'Usuário'
  }
  return roles[props.user?.role ?? 'user'] ?? 'Usuário'
})
</script>

<template>
  <UCard class="overflow-hidden">
    <div
      class="relative h-20 -mx-6 -mt-6 bg-linear-to-br from-primary-500 to-emerald-500 opacity-90"
    />

    <div
      class="relative flex flex-col items-center -mt-10 px-4 pb-4 text-center"
    >
      <div
        class="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 p-1 shadow-xl border border-white/20"
      >
        <div
          class="w-full h-full rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-black text-primary-500"
        >
          {{ initials }}
        </div>
      </div>

      <div class="mt-4">
        <h2
          class="text-lg font-black text-zinc-900 dark:text-white leading-tight"
        >
          {{ user?.name }}
        </h2>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {{ user?.email }}
        </p>
        <div class="flex items-center justify-center gap-1.5 mt-2">
          <UBadge
            color="primary"
            variant="subtle"
            size="xs"
            class="font-bold uppercase tracking-widest text-[10px] px-2 py-0.5"
          >
            {{ userRoleLabel }}
          </UBadge>
        </div>
      </div>

      <div class="w-full mt-6 space-y-3">
        <div
          class="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
        >
          <div
            class="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm shrink-0"
          >
            <UIcon
              name="i-heroicons-building-office"
              class="w-4 h-4 text-zinc-400"
            />
          </div>
          <div class="text-left overflow-hidden">
            <p
              class="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none"
            >
              Empresa Ativa
            </p>
            <p
              class="text-sm font-bold text-zinc-900 dark:text-white truncate mt-1.5"
            >
              {{ companyName || "---" }}
            </p>
          </div>
        </div>

        <div
          v-if="city || state"
          class="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
        >
          <div
            class="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm shrink-0"
          >
            <UIcon
              name="i-heroicons-map-pin"
              class="w-4 h-4 text-zinc-400"
            />
          </div>
          <div class="text-left">
            <p
              class="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none"
            >
              Localização
            </p>
            <p class="text-sm font-bold text-zinc-900 dark:text-white mt-1.5">
              {{ city && state ? `${city}, ${state}` : city || state || "---" }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
