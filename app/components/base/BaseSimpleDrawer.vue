<script setup lang="ts">
/**
 * BaseSimpleDrawer - Drawer simplificado para formulários básicos
 *
 * Ideal para: Insumos, Produtos, Clientes, Formas de Pagamento
 * Com poucos campos e estrutura simples
 */

const props = defineProps<{
  open: boolean
  entityName: string
  isEditing?: boolean
  loading?: boolean
  description?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const title = computed(() => {
  return props.isEditing
    ? `Editar ${props.entityName}`
    : `Novo ${props.entityName}`
})

const saveLabel = computed(() => {
  return props.isEditing
    ? 'Salvar Alterações'
    : `Criar ${props.entityName}`
})
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="title"
    :description="description"
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="p-6 space-y-6">
        <slot />
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-4 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <UButton
          color="neutral"
          variant="ghost"
          class="flex-1 font-bold h-12 rounded-2xl"
          :disabled="loading"
          @click="isOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          class="flex-1 font-bold h-12 rounded-2xl shadow-lg shadow-primary-500/20"
          :loading="loading"
          :icon="isEditing ? 'i-heroicons-check' : 'i-heroicons-plus'"
          size="lg"
          @click="emit('save')"
        >
          {{ saveLabel }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
