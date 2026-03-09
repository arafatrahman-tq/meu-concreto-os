<script setup lang="ts">
import type { Sale } from "~/types/sales";
import { formatCurrency } from "~/utils/formatters";

const props = defineProps<{
  deleteModalOpen: boolean;
  deleteTarget: Sale | null;
  loadingDelete: boolean;

  billingDialog: boolean;
  billingSale: Sale | null;
  billingForm: { paymentMethod: string | undefined; status: string };
  paymentMethodOptions: { label: string; value: string | undefined }[];

  confirmDeleteModalOpen: boolean;
  confirmDeleteData: { type: "driver" | "pumper"; name: string };
  isDeleting: boolean;

  confirmCreateModalOpen: boolean;
  confirmCreateData: { type: "driver" | "pumper"; name: string };
  isCreating: boolean;

  cancelModalOpen: boolean;
  cancelTarget: Sale | null;
  loadingCancel: boolean;
  cancelReason: string;
}>();

const emit = defineEmits<{
  "update:deleteModalOpen": [value: boolean];
  delete: [];

  "update:billingDialog": [value: boolean];
  bill: [];

  "update:confirmDeleteModalOpen": [value: boolean];
  confirmDelete: [];

  "update:confirmCreateModalOpen": [value: boolean];
  confirmCreate: [];

  "update:cancelModalOpen": [value: boolean];
  "update:cancelReason": [value: string];
  cancel: [];
}>();

const isDeleteModalOpen = computed({
  get: () => props.deleteModalOpen,
  set: (val) => emit("update:deleteModalOpen", val),
});

const isBillingDialogOpen = computed({
  get: () => props.billingDialog,
  set: (val) => emit("update:billingDialog", val),
});

const isConfirmDeleteModalOpen = computed({
  get: () => props.confirmDeleteModalOpen,
  set: (val) => emit("update:confirmDeleteModalOpen", val),
});

const isConfirmCreateModalOpen = computed({
  get: () => props.confirmCreateModalOpen,
  set: (val) => emit("update:confirmCreateModalOpen", val),
});

const isCancelModalOpen = computed({
  get: () => props.cancelModalOpen,
  set: (val) => emit("update:cancelModalOpen", val),
});

const localCancelReason = computed({
  get: () => props.cancelReason,
  set: (val) => emit("update:cancelReason", val),
});
</script>

<template>
  <div>
    <!-- MODAL — Delete Confirm -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Venda">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir a venda
                <strong class="text-zinc-700 dark:text-zinc-300">
                  #{{ String(deleteTarget?.id ?? 0).padStart(4, "0") }}
                </strong>
                de
                <strong class="text-zinc-700 dark:text-zinc-300">{{
                  deleteTarget?.customerName
                }}</strong
                >? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
              >Cancelar</UButton
            >
            <UButton
              color="error"
              :loading="loadingDelete"
              icon="i-heroicons-trash"
              @click="emit('delete')"
              >Excluir</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Bill (Faturar) -->
    <UModal v-model:open="isBillingDialogOpen" title="Faturar Venda">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-banknotes"
                class="w-6 h-6 text-green-500"
              />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Faturamento da Venda
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Esta ação criará uma transação de receita no valor de
                <strong class="text-zinc-700 dark:text-zinc-300">
                  {{ formatCurrency(billingSale?.total || 0) }} </strong
                >.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 py-2">
            <UFormField label="Forma de pagamento">
              <USelectMenu
                v-model="billingForm.paymentMethod"
                :items="paymentMethodOptions"
                value-key="value"
                label-key="label"
                placeholder="Selecione..."
                class="w-full"
              />
            </UFormField>

            <UFormField label="Status da transação">
              <USelect
                v-model="billingForm.status"
                :items="[
                  { label: 'Recebido (Pago)', value: 'paid' },
                  { label: 'Pendente', value: 'pending' },
                ]"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isBillingDialogOpen = false"
              >Cancelar</UButton
            >
            <UButton
              color="success"
              icon="i-heroicons-check"
              @click="emit('bill')"
              >Confirmar faturamento</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Confirm Delete (Motorista/Bombeador) -->
    <UModal
      v-model:open="isConfirmDeleteModalOpen"
      :title="`Excluir ${
        confirmDeleteData.type === 'driver' ? 'Motorista' : 'Bombeador'
      }`"
    >
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Deseja excluir o
                {{
                  confirmDeleteData.type === "driver"
                    ? "motorista"
                    : "bombeador"
                }}
                <strong class="text-zinc-700 dark:text-zinc-300"
                  >"{{ confirmDeleteData.name }}"</strong
                >? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isConfirmDeleteModalOpen = false"
              >Cancelar</UButton
            >
            <UButton
              color="error"
              :loading="isDeleting"
              @click="emit('confirmDelete')"
              >Confirmar e Excluir</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Confirm Create (Motorista/Bombeador) -->
    <UModal
      v-model:open="isConfirmCreateModalOpen"
      :title="`Criar ${
        confirmCreateData.type === 'driver' ? 'Motorista' : 'Bombeador'
      }`"
    >
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-plus-circle"
                class="w-6 h-6 text-primary-500"
              />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar criação
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Deseja criar o
                {{
                  confirmCreateData.type === "driver"
                    ? "motorista"
                    : "bombeador"
                }}
                <strong class="text-zinc-700 dark:text-zinc-300"
                  >"{{ confirmCreateData.name }}"</strong
                >?
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isConfirmCreateModalOpen = false"
              >Cancelar</UButton
            >
            <UButton
              color="primary"
              :loading="isCreating"
              @click="emit('confirmCreate')"
              >Confirmar e Criar</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Cancelar Venda -->
    <UModal v-model:open="isCancelModalOpen" title="Cancelar Venda">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-no-symbol"
                class="w-6 h-6 text-amber-500"
              />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar cancelamento
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja cancelar a venda
                <strong class="text-zinc-700 dark:text-zinc-300">
                  #{{ String(cancelTarget?.id ?? 0).padStart(4, "0") }}
                </strong>
                de
                <strong class="text-zinc-700 dark:text-zinc-300">{{
                  cancelTarget?.customerName
                }}</strong
                >?
              </p>
            </div>
          </div>
          <UFormField label="Motivo do cancelamento" hint="Opcional">
            <UTextarea
              v-model="localCancelReason"
              placeholder="Ex: Cliente solicitou cancelamento, erro no pedido..."
              :rows="3"
              class="w-full"
            />
          </UFormField>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isCancelModalOpen = false"
              >Voltar</UButton
            >
            <UButton
              color="warning"
              :loading="loadingCancel"
              icon="i-heroicons-no-symbol"
              @click="emit('cancel')"
              >Confirmar Cancelamento</UButton
            >
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
