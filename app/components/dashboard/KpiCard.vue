<script setup lang="ts">
interface Props {
  label: string
  value: string
  icon: string
  trend?: number | null
  trendLabel?: string
  iconColor?: string
  sparkline?: number[]
}

const {
  label,
  value,
  icon,
  trend = null,
  trendLabel = 'vs. mês anterior',
  iconColor = 'text-primary-500',
  sparkline = []
} = defineProps<Props>()

const trendPositive = computed(() => (trend ?? 0) >= 0)

const sparklinePoints = (values: number[]) => {
  if (!values || values.length < 2) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 80
      const y = 30 - ((v - min) / (max - min || 1)) * 26 + 2
      return `${x},${y}`
    })
    .join(' ')
}
</script>

<template>
  <div
    class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 group"
  >
    <!-- Label + Ícone -->
    <div class="flex items-center justify-between">
      <span
        class="text-[10px] font-black uppercase tracking-widest text-zinc-400"
      >
        {{ label }}
      </span>
      <div
        class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
      >
        <UIcon
          :name="icon"
          class="w-5 h-5"
          :class="iconColor"
        />
      </div>
    </div>

    <!-- Valor principal -->
    <span
      class="text-3xl font-black text-zinc-900 dark:text-white leading-none"
    >
      {{ value }}
    </span>

    <!-- Tendência + Sparkline -->
    <div class="flex items-end justify-between gap-2">
      <div
        v-if="trend !== null"
        class="flex items-center gap-1 text-xs font-bold"
        :class="trendPositive ? 'text-green-500' : 'text-red-500'"
      >
        <UIcon
          :name="
            trendPositive
              ? 'i-heroicons-arrow-trending-up'
              : 'i-heroicons-arrow-trending-down'
          "
          class="w-3.5 h-3.5"
        />
        <span>{{ trendPositive ? "+" : "" }}{{ trend?.toFixed(2) }}%
          {{ trendLabel }}</span>
      </div>
      <div
        v-else
        class="flex-1"
      />

      <!-- Sparkline SVG -->
      <svg
        v-if="sparkline.length >= 2"
        viewBox="0 0 80 32"
        class="w-20 h-8 shrink-0"
        :class="trendPositive ? 'text-green-400' : 'text-red-400'"
        fill="none"
      >
        <polyline
          :points="sparklinePoints(sparkline)"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>

