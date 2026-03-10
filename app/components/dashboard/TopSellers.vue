<script setup lang="ts">
defineProps<{
  topSellers: any[];
}>();
</script>

<template>
  <UCard
    class="flex flex-col h-full rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
    :ui="{
      header: 'px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-2 h-6 bg-amber-500 rounded-full" />
          <h3
            class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
          >
            Top Vendedores
          </h3>
        </div>
        <UBadge
          color="primary"
          variant="subtle"
          size="sm"
          class="text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5"
        >
          No Período
        </UBadge>
      </div>
    </template>

    <div
      v-if="topSellers.length === 0"
      class="flex flex-col items-center justify-center py-10 text-zinc-400 flex-1"
    >
      <UIcon name="i-heroicons-users" class="w-10 h-10 mb-2 opacity-40" />
      <p class="text-sm font-bold">Nenhuma venda com vendedor</p>
    </div>

    <div
      v-else
      class="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-4 -my-3 px-1 flex-1"
    >
      <div
        v-for="(seller, idx) in topSellers"
        :key="seller.name"
        class="flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
      >
        <!-- Posição -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0"
          :class="
            idx === 0
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
              : idx === 1
                ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                : idx === 2
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
          "
        >
          {{ idx + 1 }}º
        </div>

        <!-- Nome e Vendas -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate"
          >
            {{ seller.name }}
          </p>
          <div class="flex items-center gap-2 mt-0.5">
            <p
              class="text-[10px] font-black uppercase tracking-wider text-zinc-400"
            >
              {{ seller.count }} venda{{ seller.count > 1 ? "s" : "" }}
            </p>
            <div
              v-if="seller.volume > 0"
              class="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"
            />
            <p
              v-if="seller.volume > 0"
              class="text-[10px] font-black uppercase tracking-wider text-primary-500"
            >
              {{ seller.volume }} m³
            </p>
          </div>
        </div>

        <!-- Total -->
        <div class="text-right shrink-0">
          <p class="text-sm font-black text-primary-600 dark:text-primary-400">
            {{ formatCurrency(seller.total) }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
