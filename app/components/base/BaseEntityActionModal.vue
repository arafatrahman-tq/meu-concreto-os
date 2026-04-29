<script setup lang="ts">
/**
 * BaseEntityActionModal - Modal para ações em entidades (Motorista/Bombeador)
 *
 * Usado para: Criar ou Deletar motoristas/bombeadores
 */

const props = defineProps<{
  open: boolean
  type: 'driver' | 'pumper'
  action: 'create' | 'delete'
  entityName: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const entityLabel = computed(() =>
  props.type === 'driver' ? 'Motorista' : 'Bombeador'
)

const title = computed(() => {
  const action = props.action === 'create' ? 'Criar' : 'Excluir'
  return `${action} ${entityLabel.value}`
})

const confirmLabel = computed(() =>
  props.action === 'create' ? 'Confirmar e Criar' : 'Confirmar e Excluir'
)

const confirmColor = computed(() =>
  props.action === 'create' ? 'primary' : 'error'
)

const confirmIcon = computed(() =>
  props.action === 'create' ? 'i-heroicons-plus' : 'i-heroicons-trash'
)

const messageText = computed(() => {
  const action = props.action === 'create' ? 'criar' : 'excluir'
  const article = props.type === 'driver' ? 'o' : 'o'
  return `Deseja ${action} ${article} ${entityLabel.value.toLowerCase()}`
})
</script>

<template>
  <BaseConfirmModal
    v-model:open="isOpen"
    :title="title"
    :confirm-label="confirmLabel"
    :confirm-color="confirmColor"
    confirm-variant="soft"
    :confirm-icon="confirmIcon"
    :loading="loading"
    @confirm="emit('confirm')"
  >
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      {{ messageText }}
      <span class="font-bold text-zinc-900 dark:text-white">
        "{{ entityName }}"
      </span>?
      <template v-if="action === 'delete'">
        Esta ação não pode ser desfeita.
      </template>
    </p>
  </BaseConfirmModal>
</template>
