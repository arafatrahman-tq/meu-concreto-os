<script setup lang="ts">
import type {
  PaymentMethod,
  PaymentMethodDetails,
  PaymentMethodForm,
  MethodType,
} from "~/types/payment-methods";
import { TYPE_CONFIG, PIX_KEY_TYPES } from "~/types/payment-methods";

const props = defineProps<{
  open: boolean;
  paymentMethod: PaymentMethod | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved"): void;
}>();

const { companyId } = useAuth();
const toast = useToast();

const isDrawerOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const isEditing = computed(() => !!props.paymentMethod);
const loadingSave = ref(false);

const TYPE_OPTS = Object.entries(TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as MethodType,
  label: cfg.label,
  icon: cfg.icon,
}));

// ---------------------------------------------
// Form State
// ---------------------------------------------
const form = reactive<PaymentMethodForm>({
  name: "",
  type: "other",
  active: true,
  isDefault: false,
  maxInstallments: null,
  interestRate: null,
  pixKey: "",
  pixKeyType: "cpf",
  bankName: "",
  accountInfo: "",
  instructions: "",
});

// 1. Estado Reativo de Erros
const formErrors = reactive<Record<keyof PaymentMethodForm | string, string>>(
  {}
);

// 2. Limpar Erros
const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

// 3. Função de Validação
const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (!form.type) {
    formErrors.type = "Selecione o tipo de pagamento.";
    isValid = false;
  }

  // Optional: Add more specific validation for Pix/Cards/Bank if needed
  if (showPixDetails.value && !form.pixKey && !isEditing.value) {
    // Example of conditional validation
    // formErrors.pixKey = "A chave Pix é obrigatória.";
    // isValid = false;
  }

  return isValid;
};

const showCardDetails = computed(
  () => form.type === "credit_card" || form.type === "debit_card"
);
const showPixDetails = computed(() => form.type === "pix");
const showBankDetails = computed(
  () => form.type === "boleto" || form.type === "transfer"
);

function resetForm() {
  form.name = "";
  form.type = "other";
  form.active = true;
  form.isDefault = false;
  form.maxInstallments = null;
  form.interestRate = null;
  form.pixKey = "";
  form.pixKeyType = "cpf";
  form.bankName = "";
  form.accountInfo = "";
  form.instructions = "";
}

// ---------------------------------------------
// Watchers
// ---------------------------------------------
watch(
  () => props.paymentMethod,
  (m) => {
    if (m) {
      clearErrors();
      form.name = m.name;
      form.type = m.type;
      form.active = !!m.active;
      form.isDefault = !!m.isDefault;
      const d = m.details ?? {};
      form.maxInstallments = d.maxInstallments ?? null;
      form.interestRate = d.interestRate ?? null;
      form.pixKey = d.pixKey ?? "";
      form.pixKeyType = d.pixKeyType ?? "cpf";
      form.bankName = d.bankName ?? "";
      form.accountInfo = d.accountInfo ?? "";
      form.instructions = d.instructions ?? "";
    } else {
      resetForm();
      clearErrors();
    }
  },
  { immediate: true }
);

// ---------------------------------------------
// Logic
// ---------------------------------------------
function buildDetails() {
  const d: PaymentMethodDetails = {};
  if (showCardDetails.value) {
    if (form.maxInstallments) d.maxInstallments = form.maxInstallments;
    if (form.interestRate !== null) d.interestRate = form.interestRate;
  } else if (showPixDetails.value) {
    if (form.pixKey) d.pixKey = form.pixKey;
    if (form.pixKeyType) d.pixKeyType = form.pixKeyType;
  } else if (showBankDetails.value) {
    if (form.bankName) d.bankName = form.bankName;
    if (form.accountInfo) d.accountInfo = form.accountInfo;
    if (form.instructions) d.instructions = form.instructions;
  }
  return Object.keys(d).length ? d : undefined;
}

async function handleSave() {
  if (!validateForm()) return;

  loadingSave.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      active: form.active,
      isDefault: form.isDefault,
      details: buildDetails(),
    };

    if (isEditing.value && props.paymentMethod?.id) {
      await $fetch(`/api/payment-methods/${props.paymentMethod.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({
        title: "Atualizada com sucesso",
        description: `"${form.name}" foi atualizada.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await $fetch("/api/payment-methods", {
        method: "POST",
        body: { companyId: companyId.value, ...payload },
      });
      toast.add({
        title: "Cadastrada com sucesso",
        description: `"${form.name}" foi adicionada.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }
    emit("saved");
    isDrawerOpen.value = false;
  } catch (e: any) {
    const errorData = e?.data;
    const err =
      (errorData?.message ?? errorData?.statusMessage) ||
      e?.message ||
      "Erro desconhecido";
    toast.add({
      title: "Erro ao salvar",
      description: err,
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSave.value = false;
  }
}
</script>

<template>
  <USlideover
    v-model:open="isDrawerOpen"
    :title="isEditing ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'"
    :ui="{ content: 'w-full', footer: 'p-0 block' }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Main Form -->
        <div class="p-6 space-y-6">
          <UFormField
            label="Nome da Forma"
            required
            :error="formErrors.name"
            description="Como será exibida nos orçamentos e vendas"
          >
            <UInput
              v-model="form.name"
              placeholder="Ex: Pix Empresa / Cartão de Crédito"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <UFormField
            label="Tipo de Pagamento"
            required
            :error="formErrors.type"
          >
            <USelectMenu
              v-model="form.type"
              :items="TYPE_OPTS"
              value-key="value"
              label-key="label"
              class="w-full"
              size="lg"
            >
              <template #leading>
                <UIcon
                  :name="TYPE_CONFIG[form.type].icon"
                  :class="TYPE_CONFIG[form.type].color"
                />
              </template>
            </USelectMenu>
          </UFormField>

          <!-- Status Toggle Row (Standard Design System) -->
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <!-- Icon Container -->
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  form.active
                    ? 'bg-primary-100 dark:bg-primary-500/10 text-primary-500'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500',
                ]"
              >
                <UIcon
                  :name="
                    form.active
                      ? 'i-heroicons-check-circle'
                      : 'i-heroicons-pause-circle'
                  "
                  class="w-4 h-4"
                />
              </div>
              <!-- Label & Desc -->
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Status da Forma
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{
                    form.active
                      ? "Disponível para uso nos módulos"
                      : "Oculta do sistema temporariamente"
                  }}
                </p>
              </div>
            </div>
            <USwitch v-model="form.active" color="success" />
          </div>

          <!-- Default Toggle Row -->
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  form.isDefault
                    ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-500'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500',
                ]"
              >
                <UIcon
                  :name="
                    form.isDefault ? 'i-heroicons-star' : 'i-heroicons-star'
                  "
                  class="w-4 h-4"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Padrão do Sistema
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{
                    form.isDefault
                      ? "Selecionada automaticamente em novas vendas"
                      : "Não é a forma padrão"
                  }}
                </p>
              </div>
            </div>
            <USwitch v-model="form.isDefault" color="success" />
          </div>

          <!-- Divider -->
          <div class="h-px bg-zinc-100 dark:bg-zinc-800" />

          <!-- Dynamic Details Sections (Expansível via Transition) -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div v-if="showCardDetails" class="space-y-4 overflow-hidden">
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Configurações do Cartão
              </h3>
              <div class="space-y-4">
                <UFormField label="Max Parcelas">
                  <UInput
                    v-model.number="form.maxInstallments"
                    type="number"
                    placeholder="Ex: 12"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Taxa %">
                  <UInput
                    v-model.number="form.interestRate"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 2.99"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
              </div>
            </div>
          </Transition>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div v-if="showPixDetails" class="space-y-4 overflow-hidden">
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Dados do Pix
              </h3>
              <div class="space-y-4">
                <UFormField label="Tipo de Chave">
                  <USelectMenu
                    v-model="form.pixKeyType"
                    :items="PIX_KEY_TYPES"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Chave Pix">
                  <UInput
                    v-model="form.pixKey"
                    placeholder="Informe a chave"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
              </div>
            </div>
          </Transition>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div v-if="showBankDetails" class="space-y-4 overflow-hidden">
              <h3
                class="text-sm font-black uppercase tracking-widest text-zinc-400"
              >
                Dados Bancários / Instruções
              </h3>
              <div class="space-y-4">
                <UFormField label="Nome do Banco">
                  <UInput
                    v-model="form.bankName"
                    placeholder="Ex: Banco do Brasil"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Agência / Conta">
                  <UInput
                    v-model="form.accountInfo"
                    placeholder="Ex: Ag 0001 / CC 12345-6"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Instruções Adicionais">
                  <UTextarea
                    v-model="form.instructions"
                    placeholder="Opcional: Informe detalhes para o cliente..."
                    :rows="3"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="border-t border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center gap-3 px-6 py-6">
          <div class="flex-1 min-w-0">
            <UButton
              color="neutral"
              variant="outline"
              class="w-full"
              @click="isDrawerOpen = false"
            >
              Cancelar
            </UButton>
          </div>
          <div class="flex-1 min-w-0">
            <UButton
              color="primary"
              class="w-full"
              :loading="loadingSave"
              :icon="
                isEditing
                  ? 'i-heroicons-check-circle'
                  : 'i-heroicons-plus-circle'
              "
              @click="handleSave"
            >
              {{ isEditing ? "Salvar Alterações" : "Cadastrar Forma" }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
