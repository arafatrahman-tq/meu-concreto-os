<script setup lang="ts">
interface Props {
  label: string
  value: string
  icon: string
  trend?: number | null
  trendLabel?: string
  iconColor?: string
  iconBg?: string
  sparkline?: number[]
}

const {
  label,
  value,
  icon,
  trend = null,
  trendLabel = 'vs. mês anterior',
  iconColor = 'text-primary-500',
  iconBg = 'bg-primary-50 dark:bg-primary-500/10',
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
    class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300"
  >
    <!-- Label + Ícone -->
    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight">
        {{ label }}
      </span>
      <div
        class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        :class="iconBg"
      >
        <UIcon
          :name="icon"
          class="w-6 h-6"
          :class="iconColor"
        />
      </div>
    </div>

    <!-- Valor principal -->
    <p class="text-3xl font-black tabular-nums tracking-tighter text-zinc-900 dark:text-white">
      {{ value }}
    </p>

    <!-- Tendência + Sparkline -->
    <div class="flex items-end justify-between gap-2 -mt-2">
      <div
        v-if="trend !== null"
        class="flex items-center gap-1.5 text-xs font-bold"
        :class="trendPositive ? 'text-green-500' : 'text-red-500'"
      >
        <UIcon
          :name="trendPositive ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'"
          class="w-3.5 h-3.5"
        />
        <span>{{ trendPositive ? "+" : "" }}{{ trend?.toFixed(2) }}%</span>
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

    <!-- Trend label -->
    <p
      v-if="trend !== null"
      class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider -mt-1"
    >
      {{ trendLabel }}
    </p>
  </div>
</template>
