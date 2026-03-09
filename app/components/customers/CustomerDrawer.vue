<script setup lang="ts">
import type { Customer } from "~/types/customers";
import {
  formatCPF,
  formatCNPJ,
  formatPhone,
  maskPhone,
  maskDocument,
  maskCep,
} from "~/utils/formatters";

const props = defineProps<{
  open: boolean;
  customer?: Customer | null;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved"): void;
}>();

const { companyId } = useAuth();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const isEditing = computed(() => !!props.customer);
const loadingSubmit = ref(false);
const loadingCep = ref(false);

const form = reactive({
  name: "",
  email: "",
  document: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
});

const formErrors = reactive<Record<string, string>>({});

const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

// Removendo maskCep local para usar o global de formatters.ts

const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  const cleanDoc = form.document.replace(/\D/g, "");
  if (cleanDoc && cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    formErrors.document = "Documento inválido (11 para CPF, 14 para CNPJ).";
    isValid = false;
  }

  const cleanPhone = form.phone.replace(/\D/g, "");
  if (cleanPhone && cleanPhone.length < 10) {
    formErrors.phone = "Telefone inválido.";
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  form.name = "";
  form.email = "";
  form.document = "";
  form.phone = "";
  form.cep = "";
  form.street = "";
  form.number = "";
  form.complement = "";
  form.neighborhood = "";
  form.city = "";
  form.state = "";
  clearErrors();
};

watch(
  () => props.customer,
  (c) => {
    if (c) {
      form.name = c.name;
      form.email = c.email || "";
      form.document = c.document ? maskDocument(c.document) : "";
      form.phone = c.phone ? formatPhone(c.phone) : "";
      form.cep = c.zip || "";
      form.city = c.city || "";
      form.state = c.state || "";

      // Best-effort: if address is "street, city, state" try to extract city/state
      const parts = c.address?.split(" - ").map((s) => s.trim());
      if (parts && parts.length >= 1) {
        const mainAddr = parts[0]!.split(",").map((s) => s.trim());
        form.street = mainAddr[0] || "";
        form.number = mainAddr[1] || "";
        if (parts.length >= 2) form.complement = parts[1] || "";
        if (parts.length >= 3) form.neighborhood = parts[2] || "";
      }
    } else {
      resetForm();
    }
  },
  { immediate: true },
);
watch(
  () => props.open,
  (open) => {
    if (open && !props.customer) {
      resetForm();
    }
  },
);

const fetchCep = async () => {
  const cleanCep = form.cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return;

    form.street = data.logradouro;
    form.neighborhood = data.bairro;
    form.city = data.localidade;
    form.state = data.uf;
  } catch (e) {
    console.error("CEP fetch failed", e);
  } finally {
    loadingCep.value = false;
  }
};

const handleSave = async () => {
  if (!validateForm()) {
    toast.add({
      title: "Atenção",
      description: "Corrija os campos destacados em vermelho.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
    return;
  }

  loadingSubmit.value = true;
  try {
    const displayAddress = [form.street?.trim(), form.number?.trim()]
      .filter(Boolean)
      .join(", ");

    const fullAddressParts = [];
    if (displayAddress) fullAddressParts.push(displayAddress);
    if (form.complement?.trim()) fullAddressParts.push(form.complement.trim());
    if (form.neighborhood?.trim())
      fullAddressParts.push(form.neighborhood.trim());

    const payload = {
      companyId: companyId.value,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      document: form.document.replace(/\D/g, "") || undefined,
      phone: form.phone.replace(/\D/g, "") || undefined,
      address: fullAddressParts.join(" - ") || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zip: form.cep.replace(/\D/g, "") || undefined,
    };

    if (isEditing.value && props.customer) {
      await $fetch(`/api/customers/${props.customer.id}`, {
        method: "PUT",
        body: payload,
      } as any);
      toast.add({
        title: "Cliente atualizado",
        description: `"${form.name}" foi atualizado com sucesso.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await $fetch("/api/customers", {
        method: "POST",
        body: payload,
      });
      toast.add({
        title: "Cliente criado",
        description: `"${form.name}" foi adicionado com sucesso.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }

    isOpen.value = false;
    emit("saved");
  } catch (e: any) {
    toast.add({
      title: "Erro ao salvar",
      description: e?.data?.message || "Erro ao processar solicitação.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSubmit.value = false;
  }
};
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEditing ? 'Editar Cliente' : 'Novo Cliente'"
    :description="
      isEditing
        ? 'Atualize os dados cadastrais do cliente'
        : 'Preencha os dados para cadastrar um novo cliente'
    "
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="p-6 space-y-8 overflow-y-auto">
        <!-- ── Section: Dados Principais ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-primary-500" />
            Dados de Identificação
          </h4>

          <UFormField
            label="Nome / Razão Social"
            required
            :error="formErrors.name"
          >
            <UInput
              v-model="form.name"
              placeholder="Ex: João Silva ou Construtora XYZ"
              icon="i-heroicons-user"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="CPF / CNPJ" :error="formErrors.document">
              <UInput
                v-model="form.document"
                placeholder="000.000.000-00"
                icon="i-heroicons-identification"
                class="w-full"
                @update:model-value="(v) => (form.document = maskDocument(v))"
              />
            </UFormField>

            <UFormField label="Telefone" :error="formErrors.phone">
              <UInput
                v-model="form.phone"
                placeholder="(00) 00000-0000"
                icon="i-heroicons-phone"
                class="w-full"
                @update:model-value="(v) => (form.phone = maskPhone(v))"
              />
            </UFormField>
          </div>

          <UFormField label="E-mail" :error="formErrors.email">
            <UInput
              v-model="form.email"
              placeholder="Ex: cliente@email.com"
              icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- ── Section: Endereço ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon
              name="i-heroicons-map-pin"
              class="w-4 h-4 text-primary-500"
            />
            Endereço de Entrega
          </h4>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="CEP">
              <UInput
                v-model="form.cep"
                placeholder="00000-000"
                icon="i-heroicons-magnifying-glass"
                class="w-full"
                :loading="loadingCep"
                @update:model-value="(v) => (form.cep = maskCep(v))"
                @blur="fetchCep"
              />
            </UFormField>
            <div />
          </div>

          <UFormField label="Logradouro / Rua">
            <UInput
              v-model="form.street"
              placeholder="Ex: Av. das Palmeiras"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Número">
              <UInput v-model="form.number" placeholder="123" class="w-full" />
            </UFormField>
            <UFormField label="Bairro" class="col-span-2">
              <UInput
                v-model="form.neighborhood"
                placeholder="Ex: Centro"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Cidade" class="col-span-2">
              <UInput
                v-model="form.city"
                placeholder="Sua cidade"
                class="w-full"
              />
            </UFormField>
            <UFormField label="UF">
              <UInput
                v-model="form.state"
                placeholder="SP"
                maxlength="2"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Complemento">
            <UInput
              v-model="form.complement"
              placeholder="Apto, Bloco, etc."
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="!isEditing"
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          title="Vínculo Automático"
          description="Clientes criados aqui ficam disponíveis para seleção imediata em orçamentos e vendas."
        />
      </div>
    </template>

    <template #footer>
      <div class="border-t border-zinc-200 dark:border-zinc-800 p-6">
        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="isOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            :icon="isEditing ? 'i-heroicons-check' : 'i-heroicons-user-plus'"
            class="flex-1"
            :loading="loadingSubmit"
            @click="handleSave"
          >
            {{ isEditing ? "Salvar Alterações" : "Criar Cliente" }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
