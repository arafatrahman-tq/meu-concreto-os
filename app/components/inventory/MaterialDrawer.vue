<script setup lang="ts">
import type { Material, MaterialType, MaterialUnit } from "~/types/inventory";

const props = defineProps<{
  open: boolean;
  material?: Material | null;
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

const isEditing = computed(() => !!props.material);
const loadingSave = ref(false);

const form = reactive({
  name: "",
  type: "other" as MaterialType,
  unit: "kg" as MaterialUnit,
  cost: 0,
  stock: 0,
  active: true,
});

const formErrors = reactive<Record<string, string>>({});

const clearErrors = () => {
  for (const key in formErrors) delete formErrors[key];
};

const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (!form.type) {
    formErrors.type = "Selecione o tipo de insumo.";
    isValid = false;
  }

  if (!form.unit) {
    formErrors.unit = "Selecione a unidade de medida.";
    isValid = false;
  }

  if (form.cost < 0) {
    formErrors.cost = "O custo não pode ser negativo.";
    isValid = false;
  }

  if (form.stock < 0) {
    formErrors.stock = "O estoque não pode ser negativo.";
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  form.name = "";
  form.type = "other";
  form.unit = "kg";
  form.cost = 0;
  form.stock = 0;
  form.active = true;
  clearErrors();
};

watch(
  () => props.material,
  (m) => {
    if (m) {
      form.name = m.name;
      form.type = m.type;
      form.unit = m.unit;
      form.cost = m.cost / 100;
      form.stock = m.stock;
      form.active = m.active;
      clearErrors();
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

const saveMaterial = async () => {
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
      ...form,
      companyId: companyId.value,
      cost: Math.round(form.cost * 100),
    };

    if (isEditing.value && props.material) {
      await $fetch(`/api/materials/${props.material.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({ title: "Insumo atualizado!", color: "success" });
    } else {
      await $fetch("/api/materials", {
        method: "POST",
        body: payload,
      });
      toast.add({ title: "Insumo criado!", color: "success" });
    }

    isOpen.value = false;
    emit("saved");
  } catch (error: any) {
    toast.add({
      title: "Erro ao salvar",
      description: error.data?.message || error.message,
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingSave.value = false;
  }
};

const TYPE_OPTS = [
  { label: "Cimento", value: "cement" },
  { label: "Areia", value: "sand" },
  { label: "Brita", value: "stone" },
  { label: "Aditivo", value: "additive" },
  { label: "Água", value: "water" },
  { label: "Outro", value: "other" },
];

const UNIT_OPTS = [
  { label: "Quilo (kg)", value: "kg" },
  { label: "Tonelada (ton)", value: "ton" },
  { label: "Litro (l)", value: "l" },
  { label: "Metro Cúbico (m³)", value: "m3" },
];
</script>

<template>
  <!-- Usando BaseSimpleDrawer para consistência -->
  <BaseSimpleDrawer
    v-model:open="isOpen"
    entity-name="Insumo"
    :is-editing="isEditing"
    :loading="loadingSave"
    :description="
      isEditing
        ? 'Atualize os dados do insumo'
        : 'Cadastre um novo insumo no estoque'
    "
    @save="saveMaterial"
  >
    <form
      id="material-form"
      class="flex flex-col gap-8"
      @submit.prevent="saveMaterial"
    >
      <!-- Seção: Identificação -->
      <BaseDrawerSection title="Identificação" icon="i-heroicons-cube">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UFormField
            label="Nome do Insumo"
            required
            :error="formErrors.name"
            class="col-span-full"
          >
            <UInput
              v-model="form.name"
              placeholder="Ex: Cimento CP II"
              icon="i-heroicons-cube"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <UFormField label="Tipo" required :error="formErrors.type">
            <USelect
              v-model="form.type"
              :items="TYPE_OPTS"
              label-key="label"
              value-key="value"
              icon="i-heroicons-square-3-stack-3d"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <UFormField label="Unidade" required :error="formErrors.unit">
            <USelect
              v-model="form.unit"
              :items="UNIT_OPTS"
              label-key="label"
              value-key="value"
              icon="i-heroicons-scale"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <UFormField
            label="Custo Unitário (R$)"
            required
            :error="formErrors.cost"
          >
            <UInput
              v-model.number="form.cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              icon="i-heroicons-banknotes"
              class="w-full"
              size="lg"
            />
          </UFormField>

          <UFormField label="Estoque Atual" required :error="formErrors.stock">
            <UInput
              v-model.number="form.stock"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              icon="i-heroicons-cube"
              class="w-full"
              size="lg"
            >
              <template #trailing>
                {{ form.unit }}
              </template>
            </UInput>
          </UFormField>
        </div>
      </BaseDrawerSection>

      <USeparator />

      <!-- Seção: Configurações -->
      <BaseDrawerSection title="Configurações" variant="card">
        <UFormField label="Status do Insumo" class="col-span-full">
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ativo para uso
                </p>
                <p class="text-[10px] text-zinc-400">
                  Insumos inativos não aparecerão na criação de novos traços.
                </p>
              </div>
            </div>
            <USwitch v-model="form.active" color="success" />
          </div>
        </UFormField>
      </BaseDrawerSection>
    </form>
  </BaseSimpleDrawer>
</template>
