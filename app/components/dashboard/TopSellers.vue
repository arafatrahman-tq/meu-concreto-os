<script setup lang="ts">
const props = defineProps<{
    topSellers: any[]
}>()

</script>

<template>
    <UCard class="flex flex-col h-full">
        <template #header>
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div
                        class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                        <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400">
                            Top Vendedores
                        </h3>
                        <p class="text-xs text-zinc-400 mt-0.5">
                            Ranking de desempenho
                        </p>
                    </div>
                </div>
                <UBadge color="primary" variant="soft" size="sm">
                    No Período
                </UBadge>
            </div>
        </template>

        <div v-if="topSellers.length === 0" class="flex flex-col items-center justify-center py-10 text-zinc-400 flex-1">
            <UIcon name="i-heroicons-users" class="w-10 h-10 mb-2 opacity-40" />
            <p class="text-sm font-bold">
                Nenhuma venda com vendedor
            </p>
        </div>

        <div v-else class="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-4 -my-3 px-1 flex-1">
            <div v-for="(seller, idx) in topSellers" :key="seller.name"
                class="flex items-center gap-4 py-3.5 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <!-- Posição -->
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0" :class="idx === 0
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                        : idx === 1
                            ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                            : idx === 2
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    ">
                    {{ idx + 1 }}º
                </div>

                <!-- Nome e Vendas -->
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {{ seller.name }}
                    </p>
                    <p class="text-xs text-zinc-400 mt-0.5">
                        {{ seller.count }} venda{{ seller.count > 1 ? "s" : "" }}
                    </p>
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
