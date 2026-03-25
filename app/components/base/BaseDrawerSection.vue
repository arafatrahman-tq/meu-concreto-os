<script setup lang="ts">
/**
 * BaseDrawerSection - Seção de drawer com header estilizado
 *
 * Usado para agrupar campos de formulário em seções lógicas
 * seguindo o princípio de Miller (5-9 itens por seção)
 */

const props = defineProps<{
  title: string
  icon?: string
  dotColor?: string
  variant?: 'default' | 'card'
}>()

const dotColorClass = computed(() => {
  if (props.dotColor) return props.dotColor
  return 'bg-primary-500'
})
</script>

<template>
  <!-- Variante Card (com fundo) - para seções principais -->
  <div
    v-if="variant === 'card'"
    class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-6"
  >
    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
      <div :class="[dotColorClass, 'w-1.5 h-1.5 rounded-full']" />
      {{ title }}
    </h4>
    <slot />
  </div>

  <!-- Variante Default (sem fundo) - para seções simples -->
  <div
    v-else
    class="space-y-4"
  >
    <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
      <UIcon
        v-if="icon"
        :name="icon"
        class="w-4 h-4 text-primary-500"
      />
      <div
        v-else
        :class="[dotColorClass, 'w-1.5 h-1.5 rounded-full']"
      />
      {{ title }}
    </h4>
    <slot />
  </div>
</template>
