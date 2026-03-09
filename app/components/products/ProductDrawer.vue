<script setup lang="ts">
import type {
  Product,
  ProductType,
  ProductUnit,
  ProductForm,
  MixDesign,
} from "~/types/products";
import { UNIT_LABELS as UNIT_LABELS_MAP } from "~/types/products";

const props = defineProps<{
  open: boolean;
  product?: Product | null;
  mixDesigns: MixDesign[];
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

const isEditing = computed(() => !!props.product);
const loadingSave = ref(false);

const form = reactive<ProductForm>({
  name: "",
  description: "",
  type: "concrete",
  unit: "m3",
  price: 0, // display in BRL float
  sku: "",
  fck: undefined,
  slump: undefined,
  stoneSize: "",
  mixDesignId: undefined,
  active: true,
});

const formErrors = reactive<Record<keyof ProductForm | string, string>>({});

const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (form.price < 0) {
    formErrors.price = "O preço não pode ser negativo.";
    isValid = false;
  }

  if (!form.type) {
    formErrors.type = "Selecione o tipo do produto.";
    isValid = false;
  }

  if (!form.unit) {
    formErrors.unit = "Selecione a unidade de medida.";
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.type = "concrete";
  form.unit = "m3";
  form.price = 0;
  form.sku = "";
  form.fck = undefined;
  form.slump = undefined;
  form.stoneSize = "";
  form.mixDesignId = undefined;
  form.active = true;
  clearErrors();
};

watch(
  () => props.product,
  (p) => {
    if (p) {
      form.name = p.name;
      form.description = p.description ?? "";
      form.type = p.type;
      form.unit = p.unit;
      form.price = p.price / 100;
      form.sku = p.sku ?? "";
      form.active = p.active;
      form.mixDesignId = p.mixDesignId ?? undefined;

      // Restore specific fields after mix design auto-fill
      nextTick(() => {
        form.fck = p.fck ?? undefined;
        form.slump = p.slump ?? undefined;
        form.stoneSize = p.stoneSize ?? "";
      });

      clearErrors();
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// Auto-fill FCK, Slump, StoneSize from Mix Design
watch(
  () => form.mixDesignId,
  (newId) => {
    if (!newId || form.type !== "concrete") return;
    const mix = props.mixDesigns.find((m) => m.id === newId);
    if (mix) {
      if (mix.fck) form.fck = mix.fck;
      if (mix.slump) form.slump = mix.slump;
      if (mix.stoneSize) form.stoneSize = mix.stoneSize;
    }
  }
);

// Reset concrete-specific fields when type changes
watch(
  () => form.type,
  (newType) => {
    if (newType !== "concrete") {
      form.fck = undefined;
      form.slump = undefined;
      form.stoneSize = "";
      if (newType !== "pump" && newType !== "rental") {
        form.unit = "un";
      } else if (newType === "pump") {
        form.unit = "m3";
      } else if (newType === "rental") {
        form.unit = "hr";
      }
    } else {
      form.unit = "m3";
    }
  }
);

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

  loadingSave.value = true;
  try {
    const payload = {
      ...(isEditing.value ? {} : { companyId: companyId.value }),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      unit: form.unit,
      price: Math.round(form.price * 100),
      sku: form.sku.trim() || undefined,
      fck: form.fck ?? undefined,
      slump: form.slump ?? undefined,
      stoneSize: form.stoneSize.trim() || undefined,
      mixDesignId: form.mixDesignId ?? undefined,
      active: form.active,
    };

    if (isEditing.value && props.product) {
      await $fetch(`/api/products/${props.product.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({
        title: "Produto atualizado",
        description: `"${form.name}" foi atualizado com sucesso.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await $fetch("/api/products", { method: "POST", body: payload });
      toast.add({
        title: "Produto criado",
        description: `"${form.name}" foi adicionado ao catálogo.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }

    isOpen.value = false;
    emit("saved");
  } catch (e: any) {
    toast.add({
      title: "Erro ao salvar",
      description: e?.data?.message || "Erro ao salvar produto.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSave.value = false;
  }
};

const mixDesignOptions = computed(() =>
  props.mixDesigns.map((m) => ({ label: m.name, value: m.id }))
);

const UNIT_OPTS = [
  { label: "m³ — metros cúbicos", value: "m3" },
  { label: "un — unidade", value: "un" },
  { label: "hr — hora", value: "hr" },
  { label: "kg — quilograma", value: "kg" },
  { label: "ton — tonelada", value: "ton" },
];

const TYPE_FORM_OPTS = [
  { label: "Concreto", value: "concrete" },
  { label: "Bombeamento", value: "pump" },
  { label: "Aditivo", value: "additive" },
  { label: "Locação", value: "rental" },
  { label: "Outro", value: "other" },
];
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEditing ? 'Editar Produto' : 'Novo Produto'"
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-20">
        <!-- ── Section: Informações Básicas ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon name="i-lucide-package" class="w-4 h-4" />
            Identificação e Preço
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Nome -->
            <UFormField
              label="Nome do Produto/Serviço"
              required
              class="col-span-full"
              :error="formErrors.name"
            >
              <UInput
                v-model="form.name"
                placeholder="Ex: Concreto FCK 25 Brita 1"
                icon="i-lucide-package"
                class="w-full"
              />
            </UFormField>

            <!-- Tipo -->
            <UFormField
              label="Tipo"
              required
              class="sm:col-span-1"
              :error="formErrors.type"
            >
              <USelect
                v-model="form.type"
                :items="TYPE_FORM_OPTS"
                value-key="value"
                label-key="label"
                icon="i-lucide-layers"
                placeholder="Selecione..."
                class="w-full"
              />
            </UFormField>

            <!-- Unidade -->
            <UFormField
              label="Unidade"
              required
              class="sm:col-span-1"
              :error="formErrors.unit"
            >
              <USelect
                v-model="form.unit"
                :items="UNIT_OPTS"
                value-key="value"
                label-key="label"
                icon="i-lucide-scale"
                placeholder="Selecione..."
                class="w-full"
              />
            </UFormField>

            <!-- Preço -->
            <UFormField
              label="Preço de Venda (BRL)"
              required
              :error="formErrors.price"
            >
              <UInput
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                icon="i-heroicons-banknotes"
                class="w-full"
              />
            </UFormField>

            <!-- SKU -->
            <UFormField label="SKU / Código">
              <UInput
                v-model="form.sku"
                placeholder="ex: CONC-25-B1"
                icon="i-heroicons-qr-code"
                class="w-full"
              />
            </UFormField>

            <!-- Descrição -->
            <UFormField label="Descrição" class="col-span-full">
              <UTextarea
                v-model="form.description"
                placeholder="Detalhes, características técnicas, condições de uso..."
                :rows="2"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- ── Section: Especificações de Concreto (conditional) ── -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="form.type === 'concrete'" class="space-y-4">
            <USeparator />
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-lucide-layers" class="w-4 h-4" />
              Especificações do Concreto
            </h4>
            <UFormField
              label="Traço de Produção (Receita)"
              help="Vincular um traço permite automatizar a produção e controle de estoque de insumos."
            >
              <USelectMenu
                v-model="form.mixDesignId"
                :items="mixDesignOptions"
                value-key="value"
                label-key="label"
                placeholder="Selecione o traço correspondente"
                class="w-full"
              />
            </UFormField>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField label="FCK (MPa)">
                <UInput
                  v-model.number="form.fck"
                  type="number"
                  min="10"
                  max="100"
                  step="1"
                  placeholder="25"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Slump (cm)">
                <UInput
                  v-model.number="form.slump"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  placeholder="10"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Brita">
                <UInput
                  v-model="form.stoneSize"
                  placeholder="brita 1"
                  class="w-full"
                />
              </UFormField>
            </div>
            <!-- Concrete hint card -->
            <div
              class="rounded-xl bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/20 p-3 flex items-start gap-3"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
              />
              <p class="text-xs text-blue-700 dark:text-blue-300">
                As especificações técnicas (FCK, Slump e Brita) serão
                preenchidas automaticamente nos itens de orçamento ao selecionar
                este produto.
              </p>
            </div>
          </div>
        </Transition>

        <USeparator />

        <!-- ── Section: Configurações ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
            Configurações
          </h4>
          <!-- Active toggle -->
          <div
            class="flex items-center justify-between p-4 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div>
              <p class="text-sm font-bold text-zinc-900 dark:text-white">
                Produto Ativo
              </p>
              <p class="text-xs text-zinc-400 mt-0.5">
                Produtos inativos não aparecem na seleção de orçamentos e vendas
              </p>
            </div>
            <button
              type="button"
              :class="[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                form.active ? 'bg-primary-500' : 'bg-zinc-300 dark:bg-zinc-600',
              ]"
              @click="form.active = !form.active"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                  form.active ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="border-t border-zinc-200 dark:border-zinc-800">
        <!-- Price preview -->
        <div class="flex items-center justify-between px-6 pt-4 pb-3">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
          >
            Preço unitário
          </span>
          <span class="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {{ formatCurrency(Math.round(form.price * 100)) }}
            <span class="text-zinc-400 font-normal"
              >/ {{ UNIT_LABELS_MAP[form.unit] }}</span
            >
          </span>
        </div>
        <!-- Actions -->
        <div class="flex items-center gap-3 px-6 pb-6">
          <div class="flex-1 min-w-0">
            <UButton
              color="neutral"
              variant="outline"
              class="w-full"
              @click="isOpen = false"
            >
              Cancelar
            </UButton>
          </div>
          <div class="flex-1 min-w-0">
            <UButton
              color="primary"
              class="w-full"
              :loading="loadingSave"
              icon="i-heroicons-check"
              @click="handleSave"
            >
              {{ isEditing ? "Salvar Alterações" : "Criar Produto" }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
