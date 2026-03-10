<script setup lang="ts">
import type {
  Quote,
  ConfirmDeleteData,
  ConfirmCreateData
} from '~/types/sales'
import { formatCurrency } from '~/utils/formatters'

const props = defineProps<{
  // Delete Quote
  isDeleteModalOpen: boolean
  deleteTarget: Quote | null
  loadingDelete: boolean
  handleDelete: () => void
  // Logistics Delete/Create
  isConfirmDeleteModalOpen: boolean
  confirmDeleteData: ConfirmDeleteData
  isDeletingMeta: boolean
  handleConfirmDelete: () => void
  isConfirmCreateModalOpen: boolean
  confirmCreateData: ConfirmCreateData
  isCreatingMeta: boolean
  handleConfirmCreate: () => void
  // Promotion
  isPromoteModalOpen: boolean
  promoteTarget: Quote | null
  isPromoting: boolean
  promoteToSale: (billNow: boolean) => void
  // Cancel
  isCancelModalOpen: boolean
  cancelTarget: Quote | null
  loadingCancel: boolean
  cancelReason: string
}>()

const emit = defineEmits([
  'update:isDeleteModalOpen',
  'update:isConfirmDeleteModalOpen',
  'update:isConfirmCreateModalOpen',
  'update:isPromoteModalOpen',
  'update:isCancelModalOpen',
  'update:cancelReason',
  'cancel'
])

const isCancelModalOpen = computed({
  get: () => props.isCancelModalOpen,
  set: val => emit('update:isCancelModalOpen', val)
})

const localCancelReason = computed({
  get: () => props.cancelReason,
  set: val => emit('update:cancelReason', val)
})

const isDeleteModalOpen = computed({
  get: () => props.isDeleteModalOpen,
  set: val => emit('update:isDeleteModalOpen', val)
})

const isConfirmDeleteModalOpen = computed({
  get: () => props.isConfirmDeleteModalOpen,
  set: val => emit('update:isConfirmDeleteModalOpen', val)
})

const isConfirmCreateModalOpen = computed({
  get: () => props.isConfirmCreateModalOpen,
  set: val => emit('update:isConfirmCreateModalOpen', val)
})

const isPromoteModalOpen = computed({
  get: () => props.isPromoteModalOpen,
  set: val => emit('update:isPromoteModalOpen', val)
})
</script>

<template>
  <div>
    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm (Quote)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Orçamento"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir o orçamento
            <span class="font-bold text-zinc-900 dark:text-white">
              #{{ String(deleteTarget?.id ?? 0).padStart(4, "0") }}
            </span>
            de
            <span class="font-bold text-zinc-900 dark:text-white">
              {{ deleteTarget?.customerName }}
            </span>?
          </p>

          <!-- Preview do item -->
          <div
            v-if="deleteTarget"
            class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                  {{ deleteTarget.customerName.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <p class="text-sm font-bold text-zinc-900 dark:text-white">
                  #{{ String(deleteTarget.id).padStart(4, "0") }} - {{ deleteTarget.customerName }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ formatCurrency(deleteTarget.total) }}
                </p>
              </div>
            </div>
            <UBadge
              color="neutral"
              variant="subtle"
              size="sm"
              class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
            >
              Orçamento
            </UBadge>
          </div>

          <p class="text-xs text-zinc-400">
            Esta ação é irreversível.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loadingDelete"
            @click="isDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="loadingDelete"
            @click="handleDelete"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- ══════════════════════════════════════════
         MODAL — Confirm Delete (Motorista/Bombeador)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isConfirmDeleteModalOpen"
      :title="`Excluir ${
        confirmDeleteData.type === 'driver' ? 'Motorista' : 'Bombeador'
      }`"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Deseja exclir o
            {{ confirmDeleteData.type === 'driver' ? 'motorista' : 'bombeador' }}
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ confirmDeleteData.name }}"
            </span>?
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isConfirmDeleteModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="isDeletingMeta"
            @click="handleConfirmDelete"
          >
            Confirmar e Excluir
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- ══════════════════════════════════════════
         MODAL — Confirm Create (Driver/Pumper)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isConfirmCreateModalOpen"
      :title="`Criar ${
        confirmCreateData.type === 'driver' ? 'Motorista' : 'Bombeador'
      }`"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Deseja criar o
            {{ confirmCreateData.type === 'driver' ? 'motorista' : 'bombeador' }}
            <span class="font-bold text-zinc-900 dark:text-white">
              "{{ confirmCreateData.name }}"
            </span>?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isConfirmCreateModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            :loading="isCreatingMeta"
            @click="handleConfirmCreate"
          >
            Confirmar e Criar
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- ══════════════════════════════════════════
         MODAL — Convert to Sale (Promotion)
    ══════════════════════════════════════════ -->
    <UModal
      v-model:open="isPromoteModalOpen"
      title="Gerar Venda"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <div class="rounded-xl bg-green-50 dark:bg-green-500/10 p-4 border border-green-200 dark:border-green-500/20">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-green-600 dark:text-green-400"
                />
              </div>
              <div>
                <p class="font-bold text-zinc-900 dark:text-white">
                  Orçamento Aprovado!
                </p>
                <p class="text-sm text-zinc-500 mt-1">
                  Gostaria de converter o orçamento
                  <span class="font-bold text-zinc-700 dark:text-zinc-300">
                    #{{ String(promoteTarget?.id ?? 0).padStart(4, "0") }}
                  </span>
                  em uma venda?
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Opções de Conversão
            </p>
            <div class="flex flex-col gap-2">
              <UButton
                color="primary"
                icon="i-heroicons-receipt-percent"
                class="justify-start h-12 rounded-2xl shadow-lg shadow-primary-500/20"
                :loading="isPromoting"
                @click="promoteToSale(true)"
              >
                Converter e Faturar Agora
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-document-check"
                class="justify-start h-12 rounded-2xl"
                :loading="isPromoting"
                @click="promoteToSale(false)"
              >
                Apenas Converter em Venda
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isPromoteModalOpen = false"
          >
            Agora não
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Cancelar Orçamento -->
    <UModal
      v-model:open="isCancelModalOpen"
      title="Cancelar Orçamento"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja cancelar o orçamento
            <span class="font-bold text-zinc-900 dark:text-white">
              #{{ String(cancelTarget?.id ?? 0).padStart(4, "0") }}
            </span>
            de
            <span class="font-bold text-zinc-900 dark:text-white">
              {{ cancelTarget?.customerName }}
            </span>?
            O status será alterado para <strong>Rejeitado</strong>.
          </p>

          <UFormField
            label="Motivo do cancelamento"
            hint="Opcional"
          >
            <UTextarea
              v-model="localCancelReason"
              placeholder="Ex: Cliente recusou proposta, preço não aprovado..."
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isCancelModalOpen = false"
          >
            Voltar
          </UButton>
          <UButton
            color="warning"
            variant="soft"
            icon="i-heroicons-no-symbol"
            :loading="loadingCancel"
            @click="emit('cancel')"
          >
            Confirmar Cancelamento
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
