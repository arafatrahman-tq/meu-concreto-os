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
</script>

<template>
  <div>
    <!-- Delete Confirmation - Usando BaseDeleteModal -->
    <BaseDeleteModal
      :open="isDeleteModalOpen"
      @update:open="emit('update:isDeleteModalOpen', $event)"
      :target="deleteTarget ? { 
        id: deleteTarget.id, 
        name: deleteTarget.customerName 
      } : null"
      target-label="Orçamento"
      target-prefix="#"
      :display-value="deleteTarget?.total"
      :loading="loadingDelete"
      @confirm="handleDelete"
    />

    <!-- Confirm Delete Entity (Motorista/Bombeador) - Usando BaseEntityActionModal -->
    <BaseEntityActionModal
      :open="isConfirmDeleteModalOpen"
      @update:open="emit('update:isConfirmDeleteModalOpen', $event)"
      :type="confirmDeleteData.type"
      action="delete"
      :entity-name="confirmDeleteData.name"
      :loading="isDeletingMeta"
      @confirm="handleConfirmDelete"
    />

    <!-- Confirm Create Entity (Driver/Pumper) - Usando BaseEntityActionModal -->
    <BaseEntityActionModal
      :open="isConfirmCreateModalOpen"
      @update:open="emit('update:isConfirmCreateModalOpen', $event)"
      :type="confirmCreateData.type"
      action="create"
      :entity-name="confirmCreateData.name"
      :loading="isCreatingMeta"
      @confirm="handleConfirmCreate"
    />

    <!-- MODAL — Convert to Sale (Promotion) -->
    <UModal
      :open="isPromoteModalOpen"
      @update:open="emit('update:isPromoteModalOpen', $event)"
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
                    #{{ String(promoteTarget?.id ?? 0).padStart(4, '0') }}
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
            @click="emit('update:isPromoteModalOpen', false)"
          >
            Agora não
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Cancelar Orçamento - Usando BaseConfirmModal -->
    <BaseConfirmModal
      :open="isCancelModalOpen"
      @update:open="emit('update:isCancelModalOpen', $event)"
      title="Cancelar Orçamento"
      confirm-label="Confirmar Cancelamento"
      confirm-color="warning"
      confirm-variant="soft"
      confirm-icon="i-heroicons-no-symbol"
      :loading="loadingCancel"
      cancel-label="Voltar"
      @confirm="emit('cancel')"
    >
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Tem certeza que deseja cancelar o orçamento
        <span class="font-bold text-zinc-900 dark:text-white">
          #{{ String(cancelTarget?.id ?? 0).padStart(4, '0') }}
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
    </BaseConfirmModal>
  </div>
</template>
