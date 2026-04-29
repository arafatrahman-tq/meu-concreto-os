<script setup lang="ts">
/**
 * BaseConfirmModal - Componente base para modais de confirmação
 *
 * Uso: Fornece estrutura consistente para modais de confirmação com:
 * - Título customizável
 * - Corpo de mensagem via slot
 * - Botões de ação configuráveis
 * - Ícones e cores consistentes
 */

const props = defineProps<{
  open: boolean
  title: string
  confirmLabel?: string
  confirmColor?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  confirmVariant?: 'solid' | 'soft' | 'outline' | 'ghost'
  confirmIcon?: string
  cancelLabel?: string
  cancelVariant?: 'solid' | 'soft' | 'outline' | 'ghost'
  loading?: boolean
  loadingText?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const confirmButtonLabel = computed(() =>
  props.loading ? (props.loadingText || 'Processando...') : (props.confirmLabel || 'Confirmar')
)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
  >
    <template #body>
      <div class="px-6 py-4 space-y-4">
        <slot />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 px-6 pb-4">
        <UButton
          color="neutral"
          :variant="cancelVariant || 'ghost'"
          :disabled="loading"
          @click="isOpen = false"
        >
          {{ cancelLabel || 'Cancelar' }}
        </UButton>
        <UButton
          :color="confirmColor || 'primary'"
          :variant="confirmVariant || 'soft'"
          :icon="confirmIcon"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ confirmButtonLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
