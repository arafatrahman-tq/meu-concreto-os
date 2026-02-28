<script setup lang="ts">
const props = defineProps<{
    companyId: number | null;
}>();
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-sm font-black uppercase tracking-widest text-zinc-400">
                Sistema
            </h2>
        </template>

        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">Aplicação</span>
                <span class="text-xs font-bold text-zinc-900 dark:text-white">Meu Concreto</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">Versão</span>
                <UBadge color="neutral" variant="soft" size="sm"> v1.0.4 </UBadge>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">Ambiente</span>
                <UBadge color="info" variant="soft" size="sm"> Produção </UBadge>
            </div>
            <div class="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3 flex items-center justify-between">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">Empresa ID</span>
                <span class="text-xs font-mono font-bold text-zinc-900 dark:text-white">#{{ companyId }}</span>
            </div>
        </div>
    </UCard>
</template>
