<script setup lang="ts">
import { formatCurrency } from '~/utils/formatters'

/**
 * BaseDeleteModal - Componente especializado para confirmação de exclusão
 * 
 * Props:
 * - target: Objeto a ser deletado (deve ter id, name)
 * - targetLabel: Label do tipo (ex: "Venda", "Orçamento")
 * - targetPrefix: Prefixo para o ID (ex: "#" para "#0001")
 * - displayValue: Valor opcional a ser exibido (ex: total da venda)
 * 
 * Slots:
 * - preview: Conteúdo customizado do preview (opcional)
 */

interface DeleteTarget {
  id: number | string
  name?: string
  [key: string]: any
}

const props = defineProps<{
  open: boolean
  target: DeleteTarget | null
  targetLabel: string
  targetPrefix?: string
  displayValue?: number | string
  loading?: boolean
  warningText?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const formattedId = computed(() => {
  if (!props.target) return ''
  const id = String(props.target.id)
  return props.targetPrefix ? `${props.targetPrefix}${id.padStart(4, '0')}` : id
})

const formattedValue = computed(() => {
  if (!props.displayValue) return ''
  if (typeof props.displayValue === 'number') {
    return formatCurrency(props.displayValue)
  }
  return props.displayValue
})
</script>

<template>
  <BaseConfirmModal
    v-model:open="isOpen"
    :title="`Excluir ${targetLabel}`"
    confirm-label="Excluir"
    confirm-color="error"
    confirm-variant="soft"
    confirm-icon="i-heroicons-trash"
    :loading="loading"
    loading-text="Excluindo..."
    @confirm="emit('confirm')"
  >
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      Tem certeza que deseja excluir {{ targetLabel.toLowerCase() }}
      <span class="font-bold text-zinc-900 dark:text-white">
        {{ formattedId }}
      </span>
      <template v-if="target?.name">
        de
        <span class="font-bold text-zinc-900 dark:text-white">
          {{ target.name }}
        </span>
      </template>?
    </p>

    <!-- Preview do item -->
    <div
      v-if="target"
      class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
          <span class="text-sm font-black text-primary-600 dark:text-primary-400">
            {{ target.name?.charAt(0).toUpperCase() || targetLabel.charAt(0) }}
          </span>
        </div>
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            {{ formattedId }} - {{ target.name || targetLabel }}
          </p>
          <p v-if="formattedValue" class="text-xs text-zinc-400">
            {{ formattedValue }}
          </p>
        </div>
      </div>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
      >
        {{ targetLabel }}
      </UBadge>
    </div>

    <p class="text-xs text-zinc-400">
      {{ warningText || 'Esta ação é irreversível.' }}
    </p>

    <!-- Slot para conteúdo adicional -->
    <slot />
  </BaseConfirmModal>
</template>
