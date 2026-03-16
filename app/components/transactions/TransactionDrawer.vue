<script setup lang="ts">
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "~/types/transactions";
import { CATEGORY_SUGGESTIONS } from "~/types/transactions";

const props = defineProps<{
  open: boolean;
  transaction?: Transaction | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved"): void;
}>();

const { user, companyId } = useAuth();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const isEditing = computed(() => !!props.transaction);
const loadingSave = ref(false);

const showConfirmDialog = ref(false);

const { data: pmData, pending: loadingPM } = useFetch("/api/payment-methods", {
  query: { companyId, active: "true" },
  watch: [companyId],
});

const paymentMethodsOptions = computed(() => {
  const methods = (pmData.value as any)?.paymentMethods || [];
  return methods.map((m: any) => ({
    label: m.name,
    value: m.name,
  }));
});

type PaymentMethodOption = {
  label?: string;
  value?: string;
};

const getPaymentMethodValue = (
  value: string | PaymentMethodOption | null | undefined,
) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.value === "string") return value.value;
  if (typeof value.label === "string") return value.label;
  return "";
};

const form = reactive({
  description: "",
  amount: 0 as number,
  type: "income" as TransactionType,
  category: "",
  status: "pending" as TransactionStatus,
  date: new Date().toLocaleDateString("sv"),
  dueDate: "",
  paymentMethod: "" as string | PaymentMethodOption,
});

const formErrors = reactive<Record<string, string>>({});

const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.description || form.description.trim().length < 3) {
    formErrors.description = "A descrição deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (form.amount <= 0) {
    formErrors.amount = "O valor deve ser maior que zero.";
    isValid = false;
  }

  if (!form.category) {
    formErrors.category = "Selecione uma categoria.";
    isValid = false;
  }

  if (!getPaymentMethodValue(form.paymentMethod)) {
    formErrors.paymentMethod = "Selecione a forma de pagamento/conta.";
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  form.description = "";
  form.amount = 0;
  form.type = "income";
  form.category = "";
  form.status = "pending";
  form.date = new Date().toLocaleDateString("sv");
  form.dueDate = "";
  form.paymentMethod = "";
  clearErrors();
};

watch(
  () => props.transaction,
  (t) => {
    if (t) {
      form.description = t.description;
      form.amount = t.amount / 100;
      form.type = t.type;
      form.category = t.category ?? "";
      form.status = t.status;
      form.date = t.date
        ? new Date(t.date as string | number).toLocaleDateString("sv")
        : new Date().toLocaleDateString("sv");
      form.dueDate = t.dueDate
        ? new Date(t.dueDate as string | number).toLocaleDateString("sv")
        : "";
      form.paymentMethod = t.paymentMethod ?? "";
      clearErrors();
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

const checkDateChanges = () => {
  if (!props.transaction) return false;

  const originalDate = props.transaction.date
    ? new Date(props.transaction.date as string | number).toLocaleDateString(
        "sv",
      )
    : "";
  const originalDueDate = props.transaction.dueDate
    ? new Date(props.transaction.dueDate as string | number).toLocaleDateString(
        "sv",
      )
    : "";

  return form.date !== originalDate || form.dueDate !== originalDueDate;
};

const handlePreSave = () => {
  if (!validateForm()) {
    toast.add({
      title: "Atenção",
      description: "Corrija os campos destacados em vermelho.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
    return;
  }

  if (isEditing.value && checkDateChanges()) {
    showConfirmDialog.value = true;
    return;
  }

  handleSave();
};

const handleSave = async () => {
  loadingSave.value = true;
  showConfirmDialog.value = false;
  try {
    const payload = {
      companyId: companyId.value,
      userId: user.value?.id ?? undefined,
      description: form.description.trim(),
      amount: Math.round(form.amount * 100),
      type: form.type,
      category: form.category || undefined,
      status: form.status,
      date: form.date ? `${form.date}T12:00:00.000Z` : undefined,
      dueDate: form.dueDate ? `${form.dueDate}T12:00:00.000Z` : undefined,
      paymentMethod: getPaymentMethodValue(form.paymentMethod) || undefined,
    };

    if (isEditing.value && props.transaction) {
      await $fetch(`/api/transactions/${props.transaction.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({ title: "Transação atualizada", color: "success" });
    } else {
      await $fetch("/api/transactions", { method: "POST", body: payload });
      toast.add({ title: "Transação criada", color: "success" });
    }

    isOpen.value = false;
    emit("saved");
  } catch (err: any) {
    const validationMessage =
      err?.data?.data?.paymentMethod?._errors?.[0] ||
      err?.data?.paymentMethod?._errors?.[0];

    toast.add({
      title: "Erro ao salvar",
      description:
        validationMessage === "Expected string, received object"
          ? "Forma de pagamento invalida. Selecione uma opcao da lista."
          : err?.data?.message || err?.message || "Nao foi possivel salvar.",
      color: "error",
    });
  } finally {
    loadingSave.value = false;
  }
};
</script>

<template>
  <BaseSimpleDrawer
    v-model:open="isOpen"
    title="Nova Transação"
    edit-title="Editar Transação"
    entity-name="Transação"
    :is-editing="isEditing"
    :loading="loadingSave"
    save-label="Confirmar Lançamento"
    @save="handlePreSave"
  >
    <form id="transaction-form" class="flex flex-col gap-8" @submit.prevent="handlePreSave">
      <!-- Seção: Geral -->
      <BaseDrawerSection title="Geral" icon="i-lucide-receipt">
        <div class="grid grid-cols-1 gap-4">
          <UFormField label="Descrição" required :error="formErrors.description">
            <UInput
              v-model="form.description"
              placeholder="Ex: Pagamento Fornecedor Cimento"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-5">
            <UFormField label="Tipo" required>
              <USelect
                v-model="form.type"
                :items="[
                  { label: 'Receita', value: 'income' },
                  { label: 'Despesa', value: 'expense' },
                ]"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="Valor (R$)" required :error="formErrors.amount">
              <UInput
                v-model.number="form.amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                icon="i-lucide-circle-dollar-sign"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-5">
            <UFormField label="Categoria" required :error="formErrors.category">
              <USelectMenu
                v-model="form.category"
                :items="CATEGORY_SUGGESTIONS"
                placeholder="Selecione..."
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="Status" required>
              <USelect
                v-model="form.status"
                :items="[
                  { label: 'Pendente', value: 'pending' },
                  { label: 'Pago', value: 'paid' },
                  { label: 'Cancelado', value: 'cancelled' },
                ]"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>
        </div>
      </BaseDrawerSection>

      <USeparator />

      <!-- Seção: Datas & Pagamento -->
      <BaseDrawerSection title="Datas & Pagamento" variant="card">
        <div class="grid grid-cols-1 gap-5">
          <div class="grid grid-cols-2 gap-5">
            <UFormField label="Data da Transação" required>
              <UInput v-model="form.date" type="date" class="w-full" size="lg" />
            </UFormField>
            <UFormField label="Data de Vencimento">
              <UInput v-model="form.dueDate" type="date" class="w-full" size="lg" />
            </UFormField>
          </div>

          <UFormField label="Conta / Forma de Pagamento" required :error="formErrors.paymentMethod">
            <USelectMenu
              v-model="form.paymentMethod"
              :items="paymentMethodsOptions"
              value-key="value"
              placeholder="Selecione..."
              icon="i-lucide-credit-card"
              class="w-full"
              size="lg"
              :loading="loadingPM"
            />
          </UFormField>
        </div>
      </BaseDrawerSection>
    </form>
  </BaseSimpleDrawer>

  <!-- Confirm Date Change Modal -->
  <UModal v-model:open="showConfirmDialog" title="Confirmar Alteração de Data">
    <template #body>
      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Você alterou a
          <span class="font-bold text-zinc-900 dark:text-white">data da transação</span>
          ou a
          <span class="font-bold text-zinc-900 dark:text-white">data de vencimento</span>
          . Isso pode afetar os relatórios financeiros do período.
        </p>
        <div class="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 border border-amber-200 dark:border-amber-500/20">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-500" />
            <p class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Atenção</p>
          </div>
          <p class="text-xs text-amber-600 dark:text-amber-500 mt-2">
            Independentemente do status (Pago, Pendente ou Cancelado), a data informada será atualizada no sistema.
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3 px-6 pb-4">
        <UButton color="neutral" variant="ghost" size="md" @click="showConfirmDialog = false">Revisar</UButton>
        <UButton color="primary" icon="i-heroicons-check" size="md" :loading="loadingSave" @click="handleSave">Confirmar e Salvar</UButton>
      </div>
    </template>
  </UModal>
</template>
