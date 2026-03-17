<script setup lang="ts">
import type { QuoteStatus } from '~/types/sales'

const search = defineModel<string>('search')
const statusFilter = defineModel<QuoteStatus | 'all'>('statusFilter')
const dateStart = defineModel<string>('dateStart')
const dateEnd = defineModel<string>('dateEnd')

defineProps<{
  statusOpts: { label: string, value: string }[]
  hasRecords: boolean
}>()

const emit = defineEmits(['exportCsv', 'exportExcel', 'exportPdf', 'clear'])

const isFiltered = computed(() => {
  return (
    search.value
    || statusFilter.value !== 'all'
    || dateStart.value
    || dateEnd.value
  )
})
</script>

<template>
  <UCard
    :ui="{ body: 'p-4 sm:p-6', header: 'hidden', footer: 'hidden' }"
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
  >
    <div class="flex flex-col gap-6">
      <!-- Search & Status Row -->
      <div class="flex flex-col lg:flex-row gap-4 items-end">
        <div class="flex-1 w-full">
          <UFormField label="Pesquisar">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Buscar cliente, nº, documento..."
              class="w-full"
              size="lg"
            />
          </UFormField>
        </div>

        <div class="w-full lg:w-48">
          <UFormField label="Status">
            <USelect
              v-model="statusFilter"
              :items="statusOpts"
              value-attribute="value"
              class="w-full"
              size="lg"
            />
          </UFormField>
        </div>

        <div class="flex gap-2 w-full lg:w-auto">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-heroicons-funnel"
            size="lg"
            class="flex-1 lg:flex-none justify-center"
            :active="!!dateStart || !!dateEnd"
          >
            Filtros
          </UButton>
          <UButton
            v-if="isFiltered"
            color="error"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="lg"
            @click="emit('clear')"
          >
            Limpar
          </UButton>
        </div>
      </div>

      <!-- Date Range & Export Row -->
      <div
        class="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-6 pt-2 border-t border-zinc-100 dark:border-zinc-800/50"
      >
        <div class="flex flex-col sm:flex-row items-end gap-4 w-full sm:w-auto">
          <div class="w-full sm:w-40">
            <UFormField label="De:">
              <UInput
                v-model="dateStart"
                type="date"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="w-full sm:w-40">
            <UFormField label="Até:">
              <UInput
                v-model="dateEnd"
                type="date"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <div class="flex items-center gap-4 ml-auto pt-4 sm:pt-0">
          <p
            class="text-[10px] font-black uppercase tracking-widest text-zinc-400"
          >
            Exportar
          </p>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-table-cells"
            size="sm"
            :disabled="!hasRecords"
            @click="emit('exportCsv')"
          >
            CSV
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-document-text"
            size="sm"
            :disabled="!hasRecords"
            @click="emit('exportExcel')"
          >
            Excel
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            size="sm"
            :disabled="!hasRecords"
            @click="emit('exportPdf')"
          >
            PDF
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
