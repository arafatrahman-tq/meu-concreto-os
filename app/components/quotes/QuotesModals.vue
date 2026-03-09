<script setup lang="ts">
import type {
  Quote,
  ConfirmDeleteData,
  ConfirmCreateData,
} from "~/types/sales";

const props = defineProps<{
  // Delete Quote
  isDeleteModalOpen: boolean;
  deleteTarget: Quote | null;
  loadingDelete: boolean;
  handleDelete: () => void;
  // Logistics Delete/Create
  isConfirmDeleteModalOpen: boolean;
  confirmDeleteData: ConfirmDeleteData;
  isDeletingMeta: boolean;
  handleConfirmDelete: () => void;
  isConfirmCreateModalOpen: boolean;
  confirmCreateData: ConfirmCreateData;
  isCreatingMeta: boolean;
  handleConfirmCreate: () => void;
  // Promotion
  isPromoteModalOpen: boolean;
  promoteTarget: Quote | null;
  isPromoting: boolean;
  promoteToSale: (billNow: boolean) => void;
  // Cancel
  isCancelModalOpen: boolean;
  cancelTarget: Quote | null;
  loadingCancel: boolean;
  cancelReason: string;
}>();

const emit = defineEmits([
  "update:isDeleteModalOpen",
  "update:isConfirmDeleteModalOpen",
  "update:isConfirmCreateModalOpen",
  "update:isPromoteModalOpen",
  "update:isCancelModalOpen",
  "update:cancelReason",
  "cancel",
]);

const isCancelModalOpen = computed({
  get: () => props.isCancelModalOpen,
  set: (val) => emit("update:isCancelModalOpen", val),
});

const localCancelReason = computed({
  get: () => props.cancelReason,
  set: (val) => emit("update:cancelReason", val),
});

const isDeleteModalOpen = computed({
  get: () => props.isDeleteModalOpen,
  set: (val) => emit("update:isDeleteModalOpen", val),
});

const isConfirmDeleteModalOpen = computed({
  get: () => props.isConfirmDeleteModalOpen,
  set: (val) => emit("update:isConfirmDeleteModalOpen", val),
});

const isConfirmCreateModalOpen = computed({
  get: () => props.isConfirmCreateModalOpen,
  set: (val) => emit("update:isConfirmCreateModalOpen", val),
});

const isPromoteModalOpen = computed({
  get: () => props.isPromoteModalOpen,
  set: (val) => emit("update:isPromoteModalOpen", val),
});
</script>

<template>
  <div>
    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm (Quote)
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Orçamento">
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
                Tem certeza que deseja excluir o orçamento
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
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="loadingDelete"
              icon="i-heroicons-trash"
              @click="handleDelete"
            >
              Excluir
            </UButton>
          </div>
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
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-600" />
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
                <strong class="text-zinc-700 dark:text-zinc-300">
                  "{{ confirmDeleteData.name }}" </strong
                >? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isConfirmDeleteModalOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="isDeletingMeta"
              @click="handleConfirmDelete"
            >
              Confirmar e Excluir
            </UButton>
          </div>
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
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-plus-circle"
                class="w-6 h-6 text-primary-600"
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
                <strong class="text-zinc-700 dark:text-zinc-300">
                  "{{ confirmCreateData.name }}" </strong
                >?
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isConfirmCreateModalOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="primary"
              :loading="isCreatingMeta"
              @click="handleConfirmCreate"
            >
              Confirmar e Criar
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ══════════════════════════════════════════
         MODAL — Convert to Sale (Promotion)
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isPromoteModalOpen" title="Gerar Venda">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-heroicons-arrow-path-rounded-square"
                class="w-6 h-6 text-success-600"
              />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white text-lg">
                Orçamento Aprovado!
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Gostaria de converter o orçamento
                <strong class="text-zinc-700 dark:text-zinc-300">
                  #{{ String(promoteTarget?.id ?? 0).padStart(4, "0") }}
                </strong>
                em uma venda e faturar agora?
              </p>
            </div>
          </div>

          <div class="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
            <p class="text-[10px] font-black uppercase text-zinc-400">
              Opções de Conversão
            </p>
            <div class="flex flex-col gap-2">
              <UButton
                color="primary"
                icon="i-heroicons-receipt-percent"
                class="justify-start py-3"
                :loading="isPromoting"
                @click="promoteToSale(true)"
              >
                Converter e Faturar Agora
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-document-check"
                class="justify-start py-3"
                :loading="isPromoting"
                @click="promoteToSale(false)"
              >
                Apenas Converter em Venda
              </UButton>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isPromoteModalOpen = false"
            >
              Agora não
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL — Cancelar Orçamento -->
    <UModal v-model:open="isCancelModalOpen" title="Cancelar Orçamento">
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
                Tem certeza que deseja cancelar o orçamento
                <strong class="text-zinc-700 dark:text-zinc-300">
                  #{{ String(cancelTarget?.id ?? 0).padStart(4, "0") }}
                </strong>
                de
                <strong class="text-zinc-700 dark:text-zinc-300">{{
                  cancelTarget?.customerName
                }}</strong
                >? O status será alterado para <strong>Rejeitado</strong>.
              </p>
            </div>
          </div>
          <UFormField label="Motivo do cancelamento" hint="Opcional">
            <UTextarea
              v-model="localCancelReason"
              placeholder="Ex: Cliente recusou proposta, preço não aprovado..."
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
