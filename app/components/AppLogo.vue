<template>
  <div class="flex items-center gap-3 group/logo">
    <div
      class="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover/logo:shadow-primary-500/50 transition-all duration-300 relative overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-white/20 to-transparent"
      />
      <UIcon
        name="i-lucide-anvil"
        class="w-6 h-6 text-white relative z-10"
      />
    </div>
    <div class="flex flex-col leading-none">
      <div class="flex items-center gap-1">
        <span
          class="text-sm font-black text-zinc-900 dark:text-white tracking-tighter uppercase"
        >
          MEU<span class="text-primary-500">CONCRETO</span>
        </span>
      </div>
      <span
        class="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.25em] mt-0.5"
      >
        OPERATIONAL SYSTEM
      </span>
    </div>
  </div>
</template>
