<script setup lang="ts">
const props = defineProps<{
    pending: boolean
    metrics: any
    trendLabel: string
}>()

</script>

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <template v-if="pending">
            <USkeleton v-for="i in 4" :key="i" class="h-40 rounded-2xl" />
        </template>
        <template v-else>
            <DashboardKpiCard 
                label="Faturamento no Período" 
                :value="formatCurrency(metrics.revenueFiltered.value)"
                icon="i-heroicons-banknotes" 
                :trend="metrics.revenueTrend.value" 
                :sparkline="metrics.sparklineRevenue.value"
                :trend-label="trendLabel" 
            />
            <DashboardKpiCard 
                label="Orçamentos Ativos" 
                :value="String(metrics.activeQuotes.value.length)"
                icon="i-heroicons-document-text" 
                :trend="metrics.quotesTrend.value" 
                icon-color="text-blue-500"
                :trend-label="trendLabel" 
            />
            <DashboardKpiCard 
                label="Vendas no Período" 
                :value="String(metrics.salesFiltered.value.length)"
                icon="i-heroicons-shopping-cart" 
                :trend="metrics.salesCountTrend.value" 
                icon-color="text-amber-500"
                :trend-label="trendLabel" 
            />
            <DashboardKpiCard 
                label="Saldo do Período" 
                :value="formatCurrency(metrics.balanceFiltered.value)"
                icon="i-heroicons-scale" 
                :trend="null"
                :icon-color="metrics.balanceFiltered.value >= 0 ? 'text-green-500' : 'text-red-500'" 
            />
        </template>
    </div>
</template>
