<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "pt-BR",
  },
});

const appReady = ref(false);

onMounted(() => {
  nextTick(() => {
    appReady.value = true;
  });
});
</script>

<template>
  <!-- UApp is mandatory in Nuxt UI v3/v4 root -->
  <UApp>
    <!-- Top progress bar for route transitions -->
    <NuxtLoadingIndicator color="var(--color-primary-500)" :height="3" />

    <!-- Full-screen splash shown during initial hydration -->
    <Transition
      leave-active-class="transition-opacity duration-300 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="!appReady"
        class="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden"
        style="
          background-image: url(&quot;/login-hero.jpg&quot;);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        "
      >
        <!-- Multi-layer overlay -->
        <div class="absolute inset-0 bg-linear-to-br from-primary-950/80 via-zinc-950/70 to-emerald-950/80 opacity-90" />
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.4)_100%)]" />

        <!-- Logo -->
        <div class="relative z-10 flex items-center gap-4 mb-8">
          <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl ring-1 ring-white/30 relative overflow-hidden">
            <div class="absolute inset-0 bg-linear-to-br from-white/20 to-transparent" />
            <UIcon name="i-lucide-anvil" class="w-8 h-8 text-white relative z-10" />
          </div>
          <div class="flex flex-col leading-none">
            <span class="text-2xl font-black text-white tracking-tighter uppercase">
              MEU<span class="text-white/60">CONCRETO</span>
            </span>
            <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.4em] mt-0.5">
              OPERATIONAL SYSTEM
            </span>
          </div>
        </div>

        <!-- Spinner -->
        <div class="relative z-10 flex items-center gap-2 text-white/50 text-sm font-bold">
          <UIcon name="i-lucide-loader-circle" class="w-4 h-4 animate-spin text-primary-400" />
          <span>Carregando o sistema…</span>
        </div>
      </div>
    </Transition>

    <!-- Application Routing Layout -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
