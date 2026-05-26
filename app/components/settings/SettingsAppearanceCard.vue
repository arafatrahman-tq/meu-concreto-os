<script setup lang="ts">
const colorMode = useColorMode()

const themeOptions = [
  { label: 'Sistema', value: 'system', icon: 'i-heroicons-computer-desktop' },
  { label: 'Claro', value: 'light', icon: 'i-heroicons-sun' },
  { label: 'Escuro', value: 'dark', icon: 'i-heroicons-moon' }
]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
          <UIcon
            name="i-heroicons-swatch"
            class="w-5 h-5 text-primary-500"
          />
        </div>
        <div>
          <h2 class="text-sm font-black uppercase tracking-widest text-zinc-400">
            Aparência
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Tema da interface
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-2">
      <button
        v-for="opt in themeOptions"
        :key="opt.value"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold text-left"
        :class="colorMode.preference === opt.value
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'"
        @click="colorMode.preference = opt.value"
      >
        <UIcon
          :name="opt.icon"
          class="w-4 h-4 shrink-0"
        />
        {{ opt.label }}
        <UIcon
          v-if="colorMode.preference === opt.value"
          name="i-heroicons-check"
          class="w-4 h-4 ml-auto shrink-0"
        />
      </button>
    </div>
  </UCard>
</template>
