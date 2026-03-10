<script setup lang="ts">
import { useDashboardFilters } from '~/composables/dashboard/useDashboardFilters'
import { useDashboardData } from '~/composables/dashboard/useDashboardData'
import { useDashboardMetrics } from '~/composables/dashboard/useDashboardMetrics'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Dashboard | Meu Concreto' })

const { user, companies, activeCompanyId, companyId } = useAuth()

const canFilter = computed(() => {
  const role = user.value?.role?.toLowerCase() || ''
  return ['admin', 'manager', 'administrador', 'gerente'].includes(role)
})

const {
  selectedPeriod,
  customStart,
  customEnd,
  periodOptions,
  ranges,
  fetchWindowStart
} = useDashboardFilters()

const {
  sales,
  transactions,
  quotes,
  products,
  pending,
  lastUpdated,
  isRefreshing,
  refreshAll
} = await useDashboardData(companyId, fetchWindowStart)

const metrics = useDashboardMetrics(
  { sales, transactions, quotes, products },
  ranges,
  selectedPeriod,
  customStart,
  customEnd
)

const lastUpdatedLabel = computed(() =>
  lastUpdated.value.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
)
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-full">
    <DashboardHeader
      v-model:active-company-id="activeCompanyId"
      v-model:selected-period="selectedPeriod"
      v-model:custom-start="customStart"
      v-model:custom-end="customEnd"
      :last-updated-label="lastUpdatedLabel"
      :is-refreshing="isRefreshing"
      :can-filter="canFilter"
      :companies="companies"
      :period-options="periodOptions"
      @refresh="refreshAll"
    />

    <DashboardKpiGrid
      :pending="pending"
      :metrics="metrics"
      :trend-label="metrics.trendLabel.value"
    />

    <DashboardChartCashFlow :metrics="metrics" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
      <template v-if="pending">
        <USkeleton
          v-for="i in 3"
          :key="i"
          class="h-64 rounded-3xl"
        />
      </template>
      <template v-else>
        <DashboardRecentTransactions
          :transactions="metrics.recentTransactions.value"
          class="h-full"
        />
        <DashboardRecentSales
          :sales="metrics.recentSales.value"
          class="h-full"
        />
        <DashboardTopSellers :top-sellers="metrics.topSellers.value" />
      </template>
    </div>
  </div>
</template>
