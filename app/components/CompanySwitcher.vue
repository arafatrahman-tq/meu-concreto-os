<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types'

const { companies, activeCompany, switchCompany, user } = useAuth()

defineProps<{
  collapsed?: boolean
}>()

const companySwitcherItems = computed<DropdownMenuItem[]>(() => {
  const sorted = [...(companies.value ?? [])].sort((a, b) => {
    // 1. Default company always first
    const isDefaultA = a.id === user.value?.defaultCompanyId
    const isDefaultB = b.id === user.value?.defaultCompanyId
    if (isDefaultA && !isDefaultB) return -1
    if (!isDefaultA && isDefaultB) return 1

    // 2. Alphabetical by name
    return a.name.localeCompare(b.name)
  })

  return sorted.map(c => ({
    label: c.name,
    icon:
      c.id === activeCompany.value?.id
        ? 'i-heroicons-check'
        : c.id === user.value?.defaultCompanyId
          ? 'i-heroicons-star'
          : 'i-heroicons-building-office-2',
    onSelect: () => switchCompany(c.id)
  }))
})
</script>

<template>
  <div v-if="companies && companies.length > 0">
    <UDropdownMenu
      :items="[companySwitcherItems]"
      :content="{ align: 'start', sideOffset: 4 }"
      :ui="{ content: 'w-64' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        class="w-full h-auto px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-primary-500/40 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-all group/company justify-start"
      >
        <template #leading>
          <div
            class="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-building-office-2"
              class="w-4 h-4 text-primary-600 dark:text-primary-400"
            />
          </div>
        </template>

        <div
          v-if="!collapsed"
          class="flex flex-col min-w-0 flex-1 text-left"
        >
          <span
            class="text-xs font-black text-zinc-700 dark:text-zinc-200 truncate leading-tight"
          >
            {{ activeCompany?.name ?? "Selecionar Empresa" }}
          </span>
          <span
            class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5"
          >
            {{ activeCompany?.role ?? "—" }}
          </span>
        </div>

        <template #trailing>
          <UIcon
            v-if="!collapsed"
            name="i-heroicons-chevron-up-down"
            class="w-4 h-4 text-zinc-400 group-hover/company:text-primary-500 shrink-0"
          />
        </template>
      </UButton>
    </UDropdownMenu>
  </div>
</template>
