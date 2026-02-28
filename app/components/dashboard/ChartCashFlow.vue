<script setup lang="ts">
const props = defineProps<{
  metrics: any
}>()

// Pequeno ajuste para garantir altura base das barras do gráfico
const barHeight = (val: number) => Math.max(4, (val / props.metrics.chartMax.value) * 140)
</script>

<template>
  <!-- Usamos items-stretch para garantir que todos os elementos da grid tenham a mesma altura base -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
    
    <!-- 1. GRÁFICO DE FLUXO DE CAIXA -->
    <UCard 
      class="lg:col-span-2 flex flex-col h-full shadow-md"
      :ui="{ body: 'flex-1 p-4 sm:p-6', header: 'px-4 sm:px-6 py-4' }"
    >
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400">
              Fluxo de Caixa & Faturamento
            </h3>
            <p class="text-[11px] font-bold text-zinc-500 mt-1">
              {{ metrics.cashFlowSubtitle.value }}
            </p>
          </div>
          <!-- Legendas refinadas para mobile -->
          <div class="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span class="flex items-center gap-1.5" title="Total de Vendas registradas">
              <span class="w-2.5 h-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-600 block" />Faturamento
            </span>
            <span class="flex items-center gap-1.5" title="Entradas faturadas">
              <span class="w-2.5 h-2.5 rounded-sm bg-primary-500 block shadow-[0_0_8px_rgba(34,197,94,0.4)]" />Receita
            </span>
            <span class="flex items-center gap-1.5" title="Saídas registradas">
              <span class="w-2.5 h-2.5 rounded-sm bg-red-500 block shadow-[0_0_8px_rgba(239,68,68,0.4)]" />Despesa
            </span>
          </div>
        </div>
      </template>

      <!-- Gráfico em si -->
      <div class="flex items-end gap-1.5 sm:gap-4 h-48 sm:h-56 mt-2 overflow-x-auto custom-scrollbar pb-2">
        <div 
          v-for="(m, i) in metrics.cashFlowChartData.value" 
          :key="i" 
          :class="[
            'flex flex-col items-center gap-2 group shrink-0 transition-transform duration-300',
            metrics.cashFlowChartData.value.length > 12 ? 'w-10' : 'flex-1'
          ]"
        >
          <UTooltip 
            class="w-full flex justify-center" 
            :content="{ sideOffset: 12, align: 'center' }"
          >
            <!-- Slot Customizado da Tooltip -->
            <template #content>
              <div class="p-4 min-w-[240px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl">
                
                <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
                  <p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {{ m.label }}
                  </p>
                  <UBadge 
                    :color="m.income - m.expense >= 0 ? 'success' : 'error'" 
                    variant="soft"
                    size="sm" 
                    class="text-[9px] font-black tracking-widest uppercase"
                  >
                    {{ m.income - m.expense >= 0 ? "CAIXA POSITIVO" : "CAIXA NEGATIVO" }}
                  </UBadge>
                </div>

                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 block" /> Faturamento
                    </span>
                    <span class="text-xs font-black text-zinc-900 dark:text-white">
                      {{ formatCurrency(m.revenue) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-primary-500 block" /> Receita
                    </span>
                    <span class="text-xs font-black text-primary-600 dark:text-primary-400">
                      {{ formatCurrency(m.income) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-500 block" /> Despesa
                    </span>
                    <span class="text-xs font-black text-red-600 dark:text-red-400">
                      {{ formatCurrency(m.expense) }}
                    </span>
                  </div>
                </div>

                <div class="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Saldo</span>
                  <span 
                    class="text-sm font-black"
                    :class="m.income - m.expense >= 0 ? 'text-primary-500' : 'text-red-500'"
                  >
                    {{ formatCurrency(m.income - m.expense) }}
                  </span>
                </div>

              </div>
            </template>

            <!-- BARRAS (Hover group) -->
            <div class="flex items-end gap-0.5 w-full justify-center transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1">
              <!-- Faturamento -->
              <div 
                class="w-2 sm:w-2.5 rounded-t-md bg-zinc-200 dark:bg-zinc-700/50 transition-all duration-500"
                :style="{ height: `${barHeight(m.revenue)}px` }" 
              />
              <!-- Receita -->
              <div 
                class="w-2 sm:w-2.5 rounded-t-md bg-primary-400 dark:bg-primary-500 shadow-[0_-4px_16px_rgba(34,197,94,0.2)] transition-all duration-500"
                :style="{ height: `${barHeight(m.income)}px` }" 
              />
              <!-- Despesa -->
              <div 
                class="w-2 sm:w-2.5 rounded-t-md bg-red-400 dark:bg-red-500 shadow-[0_-4px_16px_rgba(239,68,68,0.2)] transition-all duration-500"
                :style="{ height: `${barHeight(m.expense)}px` }" 
              />
            </div>
          </UTooltip>

          <!-- Label do Eixo X -->
          <span class="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-800 dark:group-hover:text-white transition-colors whitespace-nowrap">
            {{ m.label }}
          </span>
        </div>
      </div>
    </UCard>

    <!-- 2. CARD DE RESUMO LATERAL -->
    <!-- h-full garante que ele cresça junto com o card do gráfico -->
    <UCard 
      class="flex flex-col h-full shadow-md"
      :ui="{ body: 'flex-1 flex flex-col justify-between p-4 sm:p-6', header: 'px-4 sm:px-6 py-4' }"
    >
      <template #header>
        <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400">
          Resumo no Período
        </h3>
      </template>

      <!-- Receitas e Despesas -->
      <div class="space-y-6">
        <div class="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-arrow-down-left" class="w-5 h-5 text-green-600 dark:text-green-500" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate">
              Receitas Realizadas
            </p>
            <p class="text-lg font-black text-zinc-900 dark:text-white truncate">
              {{ formatCurrency(metrics.incomeFiltered.value) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 shadow-inner">
            <UIcon name="i-heroicons-arrow-up-right" class="w-5 h-5 text-red-600 dark:text-red-500" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate">
              Despesas Realizadas
            </p>
            <p class="text-lg font-black text-zinc-900 dark:text-white truncate">
              {{ formatCurrency(metrics.expenseFiltered.value) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Saldo e Indicadores Base (Ficam no fundo através do flex-col/justify-between) -->
      <div class="mt-6 space-y-6">
        <div class="h-px bg-zinc-200 dark:bg-zinc-800/50 w-full" />

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="metrics.balanceFiltered.value >= 0 ? 'bg-primary-50 dark:bg-primary-500/10' : 'bg-red-50 dark:bg-red-500/10'">
              <UIcon name="i-heroicons-scale" class="w-4 h-4"
                :class="metrics.balanceFiltered.value >= 0 ? 'text-primary-500' : 'text-red-500'" />
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Saldo Resultante
              </p>
              <p class="text-base font-black leading-none"
                :class="metrics.balanceFiltered.value >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(metrics.balanceFiltered.value) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Indicadores Secundários -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-900/30 p-3 flex flex-col items-center justify-center text-center">
            <p class="text-xl font-black text-amber-600 dark:text-amber-500 leading-none">
              {{ metrics.pendingSales.value }}
            </p>
            <p class="text-[9px] font-black uppercase tracking-wider text-amber-600/70 dark:text-amber-500/70 mt-1">
              Vendas Pendentes
            </p>
          </div>
          
          <div class="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 p-3 flex flex-col items-center justify-center text-center">
            <p class="text-xl font-black text-zinc-900 dark:text-white leading-none">
              {{ metrics.activeProductsCount.value }}
            </p>
            <p class="text-[9px] font-black uppercase tracking-wider text-zinc-500 mt-1">
              Produtos Ativos
            </p>
          </div>
        </div>
      </div>

    </UCard>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e4e4e7;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3f3f46;
}
</style>
