<script setup lang="ts">
import type { DashboardPeriod } from '~/composables/dashboard/useDashboardFilters'

defineProps<{
  lastUpdatedLabel: string
  isRefreshing: boolean
  canFilter: boolean
  companies: any[]
  periodOptions: any[]
}>()

const activeCompanyId = defineModel<number | null>('activeCompanyId')
const selectedPeriod = defineModel<DashboardPeriod>('selectedPeriod')
const customStart = defineModel<string>('customStart')
const customEnd = defineModel<string>('customEnd')

const emit = defineEmits<{
  (e: 'refresh'): void
}>()
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Visão Geral
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Acompanhe o desempenho da sua concreteira em tempo real
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-zinc-400 hidden md:block">
          às {{ lastUpdatedLabel }}
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :class="{ 'animate-spin': isRefreshing }"
          :disabled="isRefreshing"
          @click="emit('refresh')"
        />
        <UBadge
          color="success"
          variant="subtle"
          class="text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5"
        >
          <span
            class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"
            :class="isRefreshing ? 'opacity-50' : 'animate-pulse'"
          />
          Ao vivo
        </UBadge>

        <USelectMenu
          v-if="canFilter"
          v-model="activeCompanyId"
          :items="companies"
          value-key="id"
          label-key="name"
          class="hidden md:flex min-w-44"
          variant="soft"
          size="sm"
          color="neutral"
          icon="i-heroicons-building-office"
        />

        <USelectMenu
          v-if="canFilter"
          v-model="selectedPeriod"
          :items="periodOptions"
          value-key="value"
          class="min-w-36"
          variant="soft"
          size="sm"
          color="neutral"
          icon="i-heroicons-calendar"
        />

        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          to="/vendas"
        >
          Nova Venda
        </UButton>
      </div>
    </div>

    <!-- Custom date range inputs -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="canFilter && selectedPeriod === 'custom'"
        class="flex items-center gap-3 flex-wrap"
      >
        <UIcon
          name="i-heroicons-adjustments-horizontal"
          class="w-4 h-4 text-zinc-400 hidden sm:block"
        />
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-zinc-500 uppercase tracking-widest">De</span>
          <UInput
            v-model="customStart"
            type="date"
            size="sm"
            color="neutral"
            variant="soft"
            :max="customEnd || undefined"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-zinc-500 uppercase tracking-widest">até</span>
          <UInput
            v-model="customEnd"
            type="date"
            size="sm"
            color="neutral"
            variant="soft"
            :min="customStart || undefined"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
