<script setup lang="ts">
import { computed } from 'vue'

const title = 'Meu Concreto'
const description = 'Sistema de gestão para concreteiras.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

// Mantemos esse para gerenciar o modo "ícones" no Desktop.
const isCollapsed = useCookie('mc_sidebar_collapsed', { default: () => false })
const isMobileMenuOpen = ref(false)

const currentDateStr = computed(() => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
    .format(new Date())
    .toUpperCase()
    .replace('.', '')
})
</script>

<template>
  <UApp>
    <!-- Envolvemos TUDO num flex layout para garantir o lado-a-lado -->
    <div class="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        
        <!-- 
          SIDEBAR DESKTOP (Custom Aside para Controle Absoluto)
          Usamos transição de largura manual para evitar que os componentes internos "sumam" 
          antes da animação do Nuxt UI terminar.
        -->
        <aside
          class="hidden lg:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl z-30 transition-[width] duration-300 ease-in-out shrink-0"
          :style="{ width: isCollapsed ? '80px' : '288px' }"
        >
          <!-- Header da Sidebar -->
          <div 
            class="h-20 flex items-center border-b border-zinc-100 dark:border-zinc-900 shrink-0 overflow-hidden px-4"
            :class="isCollapsed ? 'justify-center' : 'justify-between'"
          >
            <NuxtLink v-if="!isCollapsed" to="/" class="shrink-0 min-w-0">
              <AppLogo />
            </NuxtLink>
            
            <div v-else class="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/30 relative">
              <div class="absolute inset-0 bg-linear-to-br from-white/20 to-transparent" />
              <UIcon name="i-lucide-anvil" class="w-5 h-5 text-white relative z-10" />
            </div>

            <UButton
              v-if="!isCollapsed"
              icon="i-heroicons-chevron-left"
              variant="ghost"
              color="neutral"
              class="shrink-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              size="sm"
              @click="isCollapsed = true"
            />
          </div>

          <!-- Botão Expandir (Visível apenas quando colapsado) -->
          <div v-if="isCollapsed" class="flex justify-center py-3 shrink-0">
            <UButton
              icon="i-heroicons-chevron-right"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="isCollapsed = false"
            />
          </div>

          <!-- Corpo da Sidebar com Scroll -->
          <div class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div class="px-3 pt-4 pb-2 shrink-0">
              <CompanySwitcher :collapsed="isCollapsed" />
            </div>
            
            <div class="flex-1 pb-4">
              <NavigationMenu :is-collapsed="isCollapsed" />
            </div>
          </div>

          <!-- Footer da Sidebar -->
          <div class="shrink-0 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 overflow-hidden">
            <UserDropdown :collapsed="isCollapsed" />
          </div>
        </aside>

        <!-- 
          MOBILE SLIDEOVER 
          Resgatado para garantir uma experiência mobile fluida por cima do conteúdo.
        -->
        <USlideover
          v-model:open="isMobileMenuOpen"
          side="left"
          title="Menu Principal"
          :ui="{ content: 'max-w-xs' }"
        >
          <template #body>
            <div class="flex flex-col h-full bg-white dark:bg-zinc-950">
              <div class="p-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
                <AppLogo />
                <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" @click="isMobileMenuOpen = false" />
              </div>
              <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div class="p-4 shrink-0">
                  <CompanySwitcher />
                </div>
                <div class="flex-1 px-2">
                  <NavigationMenu @click="isMobileMenuOpen = false" />
                </div>
              </div>
              <div class="p-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <UserDropdown />
              </div>
            </div>
          </template>
        </USlideover>

        <!-- 
          PAINEL PRINCIPAL
          Substituindo componentes Nuxt UI Pro por marcação HTML nativa
        -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Header Navbar -->
          <header class="flex items-center justify-between px-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 border-b h-20 shrink-0 z-20">
            <!-- Left -->
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-bars-3-bottom-left"
                variant="ghost"
                color="neutral"
                class="lg:hidden"
                @click="isMobileMenuOpen = true"
              />
              
              <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400 shadow-inner">
                <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-primary-500" />
                <span>SISTEMA ATIVO</span>
                <div class="w-1 h-1 bg-green-500 rounded-full animate-ping" />
              </div>
            </div>

            <!-- Right -->
            <div class="flex items-center gap-4 sm:gap-6">
              <div class="hidden xl:flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-zinc-400">
                <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                <span>{{ currentDateStr }}</span>
              </div>
              <div class="h-6 w-px bg-zinc-200 dark:border-zinc-800 hidden md:block" />
              <div class="flex items-center gap-2">
                <UTooltip text="Alternar Tema" :content="{ sideOffset: 8 }">
                  <UColorModeButton class="hover:bg-primary-500/10 hover:text-primary-500 transition-colors rounded-xl" />
                </UTooltip>
                <NotificationPopover />
                <UTooltip text="Suporte via WhatsApp" :content="{ sideOffset: 8 }">
                  <UButton
                    icon="i-simple-icons-whatsapp"
                    color="neutral"
                    variant="ghost"
                    class="hover:bg-primary-500/10 hover:text-green-500 transition-colors rounded-xl p-2.5"
                    to="https://wa.me/5514998485689"
                    target="_blank"
                  />
                </UTooltip>
              </div>
            </div>
          </header>

          <!-- Body -->
          <main class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div class="flex-1">
              <slot />
            </div>

            <!-- Page Footer -->
            <footer class="h-20 shrink-0 flex items-center justify-between px-10 border-t border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-900/10 text-zinc-400 mt-20">
              <span class="text-[10px] font-black uppercase tracking-[0.2em]">© 2026 MEU.CONCRETO OS</span>
              <div class="flex items-center gap-6 text-[10px] font-black tracking-widest">
                <a href="https://wa.me/5514998485689" target="_blank" class="hover:text-primary-500 transition-colors">SUPORTE</a>
                <a href="#" class="hover:text-primary-500 transition-colors">DOCUMENTAÇÃO</a>
              </div>
            </footer>
          </main>
        </div>

      </div>
  </UApp>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
</style>
