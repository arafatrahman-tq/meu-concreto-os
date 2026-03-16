<script setup lang="ts">
/**
 * BaseDrawer - Componente base para drawers (USlideover)
 * 
 * Fornece estrutura consistente com:
 * - Título dinâmico (novo/editar)
 * - Corpo scrollável
 * - Footer padronizado
 * - Props configuráveis
 */

const props = defineProps<{
  open: boolean
  title: string
  editTitle?: string
  isEditing?: boolean
  description?: string
  loading?: boolean
  saveLabel?: string
  saveIcon?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const displayTitle = computed(() => {
  if (props.isEditing && props.editTitle) {
    return props.editTitle
  }
  return props.title
})

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  full: 'max-w-full'
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="displayTitle"
    :description="description"
    side="right"
    :ui="{ 
      content: sizeClasses[size || 'lg'],
      footer: 'p-0 block' 
    }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
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
          :icon="saveIcon || 'i-heroicons-check'"
          size="lg"
          @click="emit('save')"
        >
          {{ saveLabel || (isEditing ? 'Salvar Alterações' : 'Criar') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
