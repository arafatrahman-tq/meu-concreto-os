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

  deliveryModalOpen: boolean;
  deliveryTarget: Sale | null;
  deliveryDate: string;
  loadingDelivery: boolean;
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

  "update:deliveryModalOpen": [value: boolean];
  "update:deliveryDate": [value: string];
  updateDelivery: [];
}>();

const isDeleteModalOpen = computed({
  get: () => props.deleteModalOpen,
  set: (val) => emit("update:deleteModalOpen", val),
});

const isConfirmDeleteModalOpen = computed({
  get: () => props.confirmDeleteModalOpen,
  set: (val) => emit("update:confirmDeleteModalOpen", val),
});

const isConfirmCreateModalOpen = computed({
  get: () => props.confirmCreateModalOpen,
  set: (val) => emit("update:confirmCreateModalOpen", val),
});

const isBillingDialogOpen = computed({
  get: () => props.billingDialog,
  set: (val) => emit("update:billingDialog", val),
});

const isCancelModalOpen = computed({
  get: () => props.cancelModalOpen,
  set: (val) => emit("update:cancelModalOpen", val),
});

const localCancelReason = computed({
  get: () => props.cancelReason,
  set: (val) => emit("update:cancelReason", val),
});

const isDeliveryModalOpen = computed({
  get: () => props.deliveryModalOpen,
  set: (val) => emit("update:deliveryModalOpen", val),
});

const localDeliveryDate = computed({
  get: () => props.deliveryDate,
  set: (val) => emit("update:deliveryDate", val),
});
</script>

<template>
  <div>
    <!-- Modal Alterar Entrega -->
    <UModal v-model:open="isDeliveryModalOpen">
      <template #content>
        <UCard
          :ui="{
            body: 'p-6',
            header:
              'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
            footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800',
          }"
          class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-xl"
        >
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="w-6 h-6 text-primary-500"
                />
              </div>
              <div>
                <h3 class="font-black text-zinc-900 dark:text-white uppercase">
                  Alterar Entrega
                </h3>
                <p
                  class="text-xs text-zinc-500 font-bold uppercase tracking-wider"
                >
                  Venda #{{ String(deliveryTarget?.id).padStart(4, "0") }}
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Nova Data de Entrega" required>
              <UInput
                v-model="localDeliveryDate"
                type="date"
                size="lg"
                icon="i-heroicons-calendar"
              />
            </UFormField>
            <p class="text-xs text-zinc-500 italic">
              A data informada será usada para o agendamento logístico desta
              venda.
            </p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                label="Cancelar"
                class="font-black uppercase tracking-widest text-[11px]"
                @click="isDeliveryModalOpen = false"
              />
              <UButton
                color="primary"
                label="Salvar Alteração"
                class="font-black uppercase tracking-widest text-[11px] px-6"
                :loading="loadingDelivery"
                @click="emit('updateDelivery')"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation - Usando BaseDeleteModal -->
    <BaseDeleteModal
      v-model:open="isDeleteModalOpen"
      :target="
        deleteTarget
          ? {
              id: deleteTarget.id,
              name: deleteTarget.customerName,
            }
          : null
      "
      target-label="Venda"
      target-prefix="#"
      :display-value="deleteTarget?.total"
      :loading="loadingDelete"
      @confirm="emit('delete')"
    />

    <!-- MODAL — Bill (Faturar) -->
    <UModal v-model:open="isBillingDialogOpen" title="Faturar Venda">
      <template #body>
        <div class="px-6 py-4 space-y-4">
          <div
            class="rounded-xl bg-green-50 dark:bg-green-500/10 p-4 border border-green-200 dark:border-green-500/20"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0"
              >
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
                    {{ formatCurrency(billingSale?.total || 0) }} </span
                  >.
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
                  { label: 'Pendente', value: 'pending' },
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

    <!-- Confirm Delete Entity (Motorista/Bombeador) - Usando BaseEntityActionModal -->
    <BaseEntityActionModal
      v-model:open="isConfirmDeleteModalOpen"
      :type="confirmDeleteData.type"
      action="delete"
      :entity-name="confirmDeleteData.name"
      :loading="isDeleting"
      @confirm="emit('confirmDelete')"
    />

    <!-- Confirm Create Entity (Motorista/Bombeador) - Usando BaseEntityActionModal -->
    <BaseEntityActionModal
      v-model:open="isConfirmCreateModalOpen"
      :type="confirmCreateData.type"
      action="create"
      :entity-name="confirmCreateData.name"
      :loading="isCreating"
      @confirm="emit('confirmCreate')"
    />

    <!-- MODAL — Cancelar Venda - Usando BaseConfirmModal -->
    <BaseConfirmModal
      v-model:open="isCancelModalOpen"
      title="Cancelar Venda"
      confirm-label="Confirmar Cancelamento"
      confirm-color="warning"
      confirm-variant="soft"
      confirm-icon="i-heroicons-no-symbol"
      :loading="loadingCancel"
      cancel-label="Voltar"
      @confirm="emit('cancel')"
    >
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Tem certeza que deseja cancelar a venda
        <span class="font-bold text-zinc-900 dark:text-white">
          #{{ String(cancelTarget?.id ?? 0).padStart(4, "0") }}
        </span>
        de
        <span class="font-bold text-zinc-900 dark:text-white">
          {{ cancelTarget?.customerName }} </span
        >?
      </p>

      <UFormField label="Motivo do cancelamento" hint="Opcional">
        <UTextarea
          v-model="localCancelReason"
          placeholder="Ex: Cliente solicitou cancelamento, erro no pedido..."
          :rows="3"
          class="w-full"
        />
      </UFormField>
    </BaseConfirmModal>
  </div>
</template>
