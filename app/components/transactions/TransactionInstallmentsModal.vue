<script setup lang="ts">
import type { PaymentMethod } from "~/types/payment-methods";
import type { Transaction } from "~/types/transactions";

const props = defineProps<{
  open: boolean;
  transaction: Transaction | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved"): void;
}>();

const { companyId } = useAuth();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const loadingSave = ref(false);
const formErrors = reactive<Record<string, string>>({
  installments: "",
  intervalDays: "",
  firstDueDate: "",
  base: "",
});

const form = reactive({
  installments: 2,
  intervalDays: 30,
  firstDueDate: "",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const { data: pmData } = useFetch<{ paymentMethods: PaymentMethod[] }>(
  "/api/payment-methods",
  {
    query: { companyId, active: "true" },
    watch: false,
  },
);

const paymentMethods = computed(() => pmData.value?.paymentMethods ?? []);

const selectedPaymentMethod = computed(() => {
  const name = props.transaction?.paymentMethod?.trim().toLowerCase();
  if (!name) return null;

  return (
    paymentMethods.value.find((pm) => pm.name.trim().toLowerCase() === name) ??
    null
  );
});

const clearErrors = () => {
  formErrors.installments = "";
  formErrors.intervalDays = "";
  formErrors.firstDueDate = "";
  formErrors.base = "";
};

const calculateSmartDefaults = () => {
  const method = selectedPaymentMethod.value;

  if (method?.details?.maxInstallments && method.details.maxInstallments > 1) {
    form.installments = Math.min(
      Math.max(method.details.maxInstallments, 2),
      12,
    );
  } else if (method?.type === "credit_card") {
    form.installments = 3;
  } else if (method?.type === "boleto") {
    form.installments = 2;
  } else {
    form.installments = 2;
  }

  if (method?.type === "pix" || method?.type === "cash") {
    form.intervalDays = 7;
  } else {
    form.intervalDays = 30;
  }
};

const defaultFirstDueDate = computed(() => {
  if (!props.transaction) return "";

  if (props.transaction.dueDate) {
    return new Date(props.transaction.dueDate as string | number)
      .toISOString()
      .slice(0, 10);
  }

  if (props.transaction.date) {
    return new Date(props.transaction.date as string | number)
      .toISOString()
      .slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    clearErrors();
    calculateSmartDefaults();
    form.firstDueDate = defaultFirstDueDate.value;
  },
);

const previewInstallments = computed(() => {
  if (!props.transaction || form.installments < 2) return [];

  const total = props.transaction.amount;
  const base = Math.floor(total / form.installments);
  const remainder = total - base * form.installments;
  const startDate = new Date(`${form.firstDueDate}T12:00:00`);

  return Array.from({ length: form.installments }).map((_, index) => {
    const number = index + 1;
    const amount = number === form.installments ? base + remainder : base;
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + index * form.intervalDays);

    return {
      number,
      total: form.installments,
      amount,
      dueDateLabel: new Intl.DateTimeFormat("pt-BR").format(dueDate),
    };
  });
});

const validate = () => {
  clearErrors();
  let valid = true;

  if (!props.transaction) {
    formErrors.base = "Selecione um lançamento válido.";
    valid = false;
  }

  if (form.installments < 2 || form.installments > 36) {
    formErrors.installments = "Informe entre 2 e 36 parcelas.";
    valid = false;
  }

  if (form.intervalDays < 1 || form.intervalDays > 365) {
    formErrors.intervalDays = "Informe intervalo entre 1 e 365 dias.";
    valid = false;
  }

  if (!form.firstDueDate) {
    formErrors.firstDueDate = "Informe a data de vencimento inicial.";
    valid = false;
  }

  return valid;
};

const submit = async () => {
  if (!validate() || !props.transaction) {
    return;
  }

  loadingSave.value = true;

  try {
    await $fetch(`/api/transactions/${props.transaction.id}/installments`, {
      method: "POST",
      body: {
        companyId: companyId.value,
        installments: form.installments,
        intervalDays: form.intervalDays,
        firstDueDate: `${form.firstDueDate}T12:00:00.000Z`,
      },
    });

    toast.add({
      title: "Parcelamento criado",
      description: `${form.installments} parcelas foram geradas com sucesso.`,
      color: "success",
      icon: "i-heroicons-receipt-percent",
    });

    isOpen.value = false;
    emit("saved");
  } catch (error: unknown) {
    const err = error as {
      data?: { message?: string; statusMessage?: string };
      message?: string;
    };

    toast.add({
      title: "Erro ao gerar parcelas",
      description:
        err?.data?.message ??
        err?.data?.statusMessage ??
        err?.message ??
        "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSave.value = false;
  }
};
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Gerar Parcelas"
    :ui="{ content: 'w-[95vw] max-w-3xl' }"
    :description="
      transaction ? `Lançamento: ${transaction.description}` : undefined
    "
  >
    <template #body>
      <div class="px-4 sm:px-6 py-4 space-y-4 overflow-x-hidden">
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          title="Parcelamento inteligente"
          description="A configuração inicial usa a forma de pagamento como base e você pode ajustar antes de confirmar."
        />

        <UAlert
          v-if="formErrors.base"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-circle"
          :description="formErrors.base"
        />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormField
            label="Qtd. de Parcelas"
            required
            :error="formErrors.installments"
            class="w-full min-w-0"
          >
            <UInput
              v-model.number="form.installments"
              type="number"
              min="2"
              max="36"
              icon="i-heroicons-hashtag"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Intervalo (dias)"
            required
            :error="formErrors.intervalDays"
            class="w-full min-w-0"
          >
            <UInput
              v-model.number="form.intervalDays"
              type="number"
              min="1"
              max="365"
              icon="i-heroicons-calendar"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="1º Vencimento"
            required
            :error="formErrors.firstDueDate"
            class="w-full min-w-0"
          >
            <UInput
              v-model="form.firstDueDate"
              type="date"
              icon="i-heroicons-calendar-days"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          class="rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 p-4 space-y-3"
        >
          <p
            class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
          >
            Pré-visualização das parcelas
          </p>
          <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
            <div
              v-for="row in previewInstallments"
              :key="row.number"
              class="flex items-center justify-between rounded-xl bg-white dark:bg-zinc-900 px-3 py-2 ring-1 ring-zinc-200 dark:ring-zinc-700"
            >
              <p class="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                Parcela {{ row.number }}/{{ row.total }}
              </p>
              <div class="text-right">
                <p
                  class="text-sm font-black text-primary-600 dark:text-primary-400"
                >
                  {{ currencyFormatter.format(row.amount / 100) }}
                </p>
                <p class="text-[11px] text-zinc-400">
                  Vencimento: {{ row.dueDateLabel }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div
        class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 pb-4 pt-2"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="h-12 w-full sm:w-auto sm:min-w-30"
          :disabled="loadingSave"
          @click="isOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-check"
          class="h-12 w-full sm:w-auto sm:min-w-30"
          :loading="loadingSave"
          @click="submit"
        >
          Criar parcelas
        </UButton>
      </div>
    </template>
  </UModal>
</template>
