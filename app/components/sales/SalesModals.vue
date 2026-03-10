<script setup lang="ts">
import type { Sale } from '~/types/sales'
import { formatCurrency } from '~/utils/formatters'

const props = defineProps<{
  deleteModalOpen: boolean
  deleteTarget: Sale | null
  loadingDelete: boolean

  billingDialog: boolean
  billingSale: Sale | null
  billingForm: { paymentMethod: string | undefined, status: string }
  paymentMethodOptions: { label: string, value: string | undefined }[]

  confirmDeleteModalOpen: boolean
  confirmDeleteData: { type: 'driver' | 'pumper', name: string }
  isDeleting: boolean

  confirmCreateModalOpen: boolean
  confirmCreateData: { type: 'driver' | 'pumper', name: string }
  isCreating: boolean

  cancelModalOpen: boolean
  cancelTarget: Sale | null
  loadingCancel: boolean
  cancelReason: string
}>()

const emit = defineEmits<{
  'update:deleteModalOpen': [value: boolean]
  'delete': []

  'update:billingDialog': [value: boolean]
  'bill': []

  'update:confirmDeleteModalOpen': [value: boolean]
  'confirmDelete': []

  'update:confirmCreateModalOpen': [value: boolean]
  'confirmCreate': []

  'update:cancelModalOpen': [value: boolean]
  'update:cancelReason': [value: string]
  'cancel': []
}>()

const isDeleteModalOpen = computed({
  get: () => props.deleteModalOpen,
  set: val => emit('update:deleteModalOpen', val)
})

const isBillingDialogOpen = computed({
  get: () => props.billingDialog,
  set: val => emit('update:billingDialog', val)
})

const isConfirmDeleteModalOpen = computed({
  get: () => props.confirmDeleteModalOpen,
  set: val => emit('update:confirmDeleteModalOpen', val)
})

const isConfirmCreateModalOpen = computed({
  get: () => props.confirmCreateModalOpen,
  set: val => emit('update:confirmCreateModalOpen', val)
})

const isCancelModalOpen = computed({
  get: () => props.cancelModalOpen,
  set: val => emit('update:cancelModalOpen', val)
})

const localCancelReason = computed({
  get: () => props.cancelReason,
  set: val => emit('update:cancelReason', val)
})
</script>

<template>
  <div>
    <!-- MODAL — Delete Confirm -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Excluir Venda"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir a venda
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
              Venda
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
            @click="emit('delete')"
          >
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Bill (Faturar) -->
    <UModal
      v-model:open="isBillingDialogOpen"
      title="Faturar Venda"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <div class="rounded-xl bg-green-50 dark:bg-green-500/10 p-4 border border-green-200 dark:border-green-500/20">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-heroicons-banknotes"
                  class="w-5 h-5 text-green-600 dark:text-green-400"
                />
              </div>
              <div>
                <p class="font-bold text-zinc-900 dark:text-white">
                  Faturamento da Venda
                </p>
                <p class="text-sm text-zinc-500 mt-1">
                  Esta ação criará uma transação de receita no valor de
                  <span class="font-bold text-zinc-700 dark:text-zinc-300">
                    {{ formatCurrency(billingSale?.total || 0) }}
                  </span>.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4 py-2">
            <UFormField label="Forma de pagamento">
              <USelectMenu
                v-model="billingForm.paymentMethod"
                :items="paymentMethodOptions"
                value-key="value"
                label-key="label"
                placeholder="Selecione..."
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField label="Status da transação">
              <USelect
                v-model="billingForm.status"
                :items="[
                  { label: 'Recebido (Pago)', value: 'paid' },
                  { label: 'Pendente', value: 'pending' }
                ]"
                value-key="value"
                label-key="label"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 px-6 pb-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isBillingDialogOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="success"
            variant="soft"
            icon="i-heroicons-check"
            @click="emit('bill')"
          >
            Confirmar faturamento
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Confirm Delete (Motorista/Bombeador) -->
    <UModal
      v-model:open="isConfirmDeleteModalOpen"
      :title="`Excluir ${confirmDeleteData.type === 'driver' ? 'Motorista' : 'Bombeador'}`"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Deseja excluir o
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
            :loading="isDeleting"
            @click="emit('confirmDelete')"
          >
            Confirmar e Excluir
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Confirm Create (Motorista/Bombeador) -->
    <UModal
      v-model:open="isConfirmCreateModalOpen"
      :title="`Criar ${confirmCreateData.type === 'driver' ? 'Motorista' : 'Bombeador'}`"
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
            :loading="isCreating"
            @click="emit('confirmCreate')"
          >
            Confirmar e Criar
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Cancelar Venda -->
    <UModal
      v-model:open="isCancelModalOpen"
      title="Cancelar Venda"
    >
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja cancelar a venda
            <span class="font-bold text-zinc-900 dark:text-white">
              #{{ String(cancelTarget?.id ?? 0).padStart(4, "0") }}
            </span>
            de
            <span class="font-bold text-zinc-900 dark:text-white">
              {{ cancelTarget?.customerName }}
            </span>?
          </p>

          <UFormField
            label="Motivo do cancelamento"
            hint="Opcional"
          >
            <UTextarea
              v-model="localCancelReason"
              placeholder="Ex: Cliente solicitou cancelamento, erro no pedido..."
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
