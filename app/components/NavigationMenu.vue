<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const props = defineProps<{
  isCollapsed?: boolean
}>()

const { user } = useAuth()

// Extension of the official type to support RBAC
type AppMenuItem = NavigationMenuItem & { roles?: ('admin' | 'manager' | 'user')[] }
type AppMenuGroup = { label: string; items: AppMenuItem[] }

const rawMenuGroups: AppMenuGroup[] = [
  {
    label: 'Início',
    items: [
      { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/', exact: true }
    ]
  },
  {
    label: 'Comercial',
    items: [
      { label: 'Orçamentos', icon: 'i-heroicons-document-text', to: '/orcamentos' },
      { label: 'Vendas', icon: 'i-heroicons-shopping-cart', to: '/vendas' },
      { label: 'Clientes', icon: 'i-heroicons-identification', to: '/clientes' }
    ]
  },
  {
    label: 'Operacional',
    items: [
      { label: 'Agendamentos', icon: 'i-heroicons-calendar-days', to: '/agendamentos' },
      { label: 'Produtos', icon: 'i-lucide-package', to: '/produtos' },
      { label: 'Vendedores', icon: 'i-heroicons-user-group', to: '/vendedores' }
    ]
  },
  {
    label: 'Produção',
    items: [
      { label: 'Insumos', icon: 'i-lucide-box', to: '/insumos' },
      { label: 'Traços', icon: 'i-lucide-flask-conical', to: '/tracos' }
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Transações', icon: 'i-heroicons-arrows-right-left', to: '/transacoes' }
    ]
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Empresas', icon: 'i-heroicons-building-office-2', to: '/empresas', roles: ['admin'] },
      { label: 'Usuários', icon: 'i-heroicons-users', to: '/usuarios', roles: ['admin', 'manager'] }
    ]
  },
  {
    label: 'Configurações',
    items: [
      { label: 'Formas de Pagamento', icon: 'i-heroicons-credit-card', to: '/formas-de-pagamento' },
      { label: 'Ajustes', icon: 'i-heroicons-cog-6-tooth', to: '/configuracoes' }
    ]
  }
]

const navigationGroups = computed(() => {
  const currentRole = user.value?.role as 'admin' | 'manager' | 'user'

  return rawMenuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(currentRole))
    }))
    .filter(group => group.items.length > 0)
})
</script>

<template>
  <div class="flex flex-col gap-6 py-2 px-2">
    <!-- Fazemos o loop nos grupos para colocar o título acima de cada um -->
    <div
      v-for="group in navigationGroups"
      :key="group.label"
      class="space-y-1"
    >
      <!-- Título do grupo (esconde no colapsado) -->
      <p
        v-if="!isCollapsed"
        class="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-2.5"
      >
        {{ group.label }}
      </p>
      <!-- Divisória visível APENAS no colapsado -->
      <div v-else class="h-px bg-zinc-100 dark:bg-zinc-800 my-4 first:hidden" />

      <!-- UNavigationMenu Nativo e Limpo -->
      <UNavigationMenu
        orientation="vertical"
        :items="group.items"
        :collapsed="isCollapsed"
        :tooltip="true"
        :ui="{
          root: 'gap-1',
          link: [
            'px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 group relative',
            'data-[active=true]:bg-primary-500 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-primary-500/30',
            'data-[active=false]:text-zinc-600 data-[active=false]:dark:text-zinc-400 data-[active=false]:hover:bg-zinc-100 data-[active=false]:dark:hover:bg-zinc-800/50 data-[active=false]:hover:text-zinc-900 data-[active=false]:dark:hover:text-white',
            isCollapsed ? 'justify-center' : 'gap-3'
          ].join(' '),
          linkLeadingIcon: 'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110'
        }"
      />
    </div>
  </div>
</template>
