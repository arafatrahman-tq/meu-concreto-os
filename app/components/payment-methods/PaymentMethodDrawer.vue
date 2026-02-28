<script setup lang="ts">
interface PaymentMethodDetails {
  maxInstallments?: number;
  interestRate?: number;
  pixKey?: string;
  pixKeyType?: string;
  bankName?: string;
  accountInfo?: string;
  instructions?: string;
}

interface PaymentMethod {
  id: number;
  companyId: number;
  name: string;
  type: MethodType;
  details?: PaymentMethodDetails | null;
  active: boolean;
}

type MethodType =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "pix"
  | "boleto"
  | "transfer"
  | "check"
  | "other";

const props = defineProps<{
  open: boolean;
  paymentMethod: PaymentMethod | null;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
  saved: [];
}>();

const { companyId } = useAuth();
const toast = useToast();

const isDrawerOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const isEditing = computed(() => !!props.paymentMethod);
const loadingSave = ref(false);

// ---------------------------------------------
// Config
// ---------------------------------------------
const TYPE_CONFIG: Record<
  MethodType,
  { label: string; icon: string; color: string; bg: string }
> = {
  cash: {
    label: "Dinheiro",
    icon: "i-heroicons-banknotes",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  credit_card: {
    label: "Cartão de Crédito",
    icon: "i-heroicons-credit-card",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  debit_card: {
    label: "Cartão de Débito",
    icon: "i-heroicons-credit-card",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
  },
  pix: {
    label: "Pix",
    icon: "i-simple-icons-pix",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-500/10",
  },
  boleto: {
    label: "Boleto",
    icon: "i-heroicons-document-text",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  transfer: {
    label: "Transferência",
    icon: "i-heroicons-arrows-right-left",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
  },
  check: {
    label: "Cheque",
    icon: "i-heroicons-document-check",
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
  },
  other: {
    label: "Outro",
    icon: "i-heroicons-ellipsis-horizontal-circle",
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
  },
};

const TYPE_OPTS = Object.entries(TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as MethodType,
  label: cfg.label,
  icon: cfg.icon,
}));

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Chave Aleatória" },
];

// ---------------------------------------------
// Form State
// ---------------------------------------------
const form = reactive({
  name: "",
  type: "other" as MethodType,
  active: true,
  maxInstallments: null as number | null,
  interestRate: null as number | null,
  pixKey: "",
  pixKeyType: "cpf",
  bankName: "",
  accountInfo: "",
  instructions: "",
});

// 1. Estado Reativo de Erros
const formErrors = reactive<Record<string, string>>({});

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
      form.active = m.active;
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
              :ui="{ base: 'h-12' }"
            />
          </UFormField>

          <UFormField label="Tipo de Pagamento" required :error="formErrors.type">
            <USelectMenu
              v-model="form.type"
              :items="TYPE_OPTS"
              value-key="value"
              label-key="label"
              class="w-full"
              size="lg"
              :ui="{ base: 'h-12' }"
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
                <p class="text-[10px] text-zinc-400">
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
                    :ui="{ base: 'h-11' }"
                  />
                </UFormField>
                <UFormField label="Taxa %">
                  <UInput
                    v-model.number="form.interestRate"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 2.99"
                    class="w-full"
                    :ui="{ base: 'h-11' }"
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
                    :ui="{ base: 'h-11' }"
                  />
                </UFormField>
                <UFormField label="Chave Pix">
                  <UInput
                    v-model="form.pixKey"
                    placeholder="Informe a chave"
                    class="w-full"
                    :ui="{ base: 'h-11' }"
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
                    :ui="{ base: 'h-11' }"
                  />
                </UFormField>
                <UFormField label="Agência / Conta">
                  <UInput
                    v-model="form.accountInfo"
                    placeholder="Ex: Ag 0001 / CC 12345-6"
                    class="w-full"
                    :ui="{ base: 'h-11' }"
                  />
                </UFormField>
                <UFormField label="Instruções Adicionais">
                  <UTextarea
                    v-model="form.instructions"
                    placeholder="Opcional: Informe detalhes para o cliente..."
                    :rows="3"
                    class="w-full"
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
