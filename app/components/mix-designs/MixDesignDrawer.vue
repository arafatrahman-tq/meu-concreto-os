<script setup lang="ts">
import type { MixDesign, MixDesignItem } from "~/types/mix-designs";
import type { Material } from "~/types/inventory";
import { typeConfig } from "~/types/inventory";

const props = defineProps<{
  open: boolean;
  mixDesign?: MixDesign | null;
  materials: Material[];
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

const isEditing = computed(() => !!props.mixDesign);
const loadingSave = ref(false);

const form = reactive({
  name: "",
  description: "",
  fck: undefined as number | undefined,
  slump: undefined as number | undefined,
  stoneSize: "",
  items: [] as { materialId: number; quantity: number; tempId: string }[],
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

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = "O nome deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (form.items.length === 0) {
    toast.add({
      title: "Traço Vazio",
      description: "Adicione pelo menos um insumo ao traço.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
    isValid = false;
  }

  form.items.forEach((item, index) => {
    if (!item.materialId) {
      formErrors[`items_${index}_materialId`] = "Selecione um insumo.";
      isValid = false;
    }
    if (item.quantity <= 0) {
      formErrors[`items_${index}_quantity`] = "A Qtd deve ser maior que zero.";
      isValid = false;
    }
  });

  return isValid;
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.fck = undefined;
  form.slump = undefined;
  form.stoneSize = "";
  form.items = [];
  clearErrors();
};

watch(
  () => props.mixDesign,
  (m) => {
    if (m) {
      form.name = m.name;
      form.description = m.description || "";
      form.fck = m.fck || undefined;
      form.slump = m.slump || undefined;
      form.stoneSize = m.stoneSize || "";
      form.items = m.items.map((i) => ({
        materialId: i.materialId,
        quantity: i.quantity,
        tempId: Math.random().toString(36).substr(2, 9),
      }));
      clearErrors();
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const materialOptions = computed(() =>
  props.materials.map((m) => ({
    label: m.name,
    value: m.id,
    materialType: m.type,
    unit: m.unit,
  }))
);

const getMaterialDetails = (id: number) => props.materials.find((m) => m.id === id);

const newItem = reactive({
  materialId: undefined as number | undefined,
  quantity: 0,
});

const addMaterialToMix = () => {
  if (!newItem.materialId || newItem.quantity <= 0) {
    toast.add({
      title: "Atenção",
      description: "Selecione um material e informe a quantidade.",
      color: "warning",
    });
    return;
  }

  const existing = form.items.find((i) => i.materialId === newItem.materialId);
  if (existing) {
    existing.quantity += newItem.quantity;
    toast.add({ title: "Quantidade atualizada", color: "info" });
  } else {
    form.items.push({
      materialId: newItem.materialId,
      quantity: newItem.quantity,
      tempId: Math.random().toString(36).substr(2, 9),
    });
  }

  newItem.materialId = undefined;
  newItem.quantity = 0;
};

const removeMaterialFromMix = (index: number) => {
  form.items.splice(index, 1);
};

const calculateTotalCost = () => {
  return form.items.reduce((acc, item) => {
    const mat = getMaterialDetails(item.materialId);
    if (!mat) return acc;
    return acc + item.quantity * mat.cost;
  }, 0);
};

const saveMixDesign = async () => {
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
      companyId: companyId.value,
      name: form.name,
      description: form.description,
      fck: form.fck,
      slump: form.slump,
      stoneSize: form.stoneSize,
      items: form.items.map((i) => ({
        materialId: i.materialId,
        quantity: i.quantity,
      })),
    };

    if (isEditing.value && props.mixDesign) {
      await $fetch(`/api/mix-designs/${props.mixDesign.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({ title: "Traço atualizado!", color: "success" });
    } else {
      await $fetch("/api/mix-designs", {
        method: "POST",
        body: payload,
      });
      toast.add({ title: "Traço criado!", color: "success" });
    }

    isOpen.value = false;
    emit("saved");
  } catch (error: any) {
    toast.add({
      title: "Erro ao salvar",
      description: error.data?.message || error.message,
      color: "error",
    });
  } finally {
    loadingSave.value = false;
  }
};
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEditing ? 'Editar Traço' : 'Novo Traço' "
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
        <form @submit.prevent="saveMixDesign" class="flex flex-col gap-8" id="mix-design-form">
          <!-- ── Section: Identificação ── -->
          <div class="space-y-4">
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-lucide-package" class="w-4 h-4" />
              Identificação
            </h4>
            <div class="grid grid-cols-1 gap-4">
              <UFormField label="Nome do Traço" required :error="formErrors.name">
                <UInput
                  v-model="form.name"
                  placeholder="Ex: Traço 25MPa Convencional"
                  icon="i-lucide-package"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-3 gap-4">
                <UFormField label="FCK (MPa)">
                  <UInput
                    v-model.number="form.fck"
                    type="number"
                    placeholder="25"
                    icon="i-lucide-activity"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Slump (cm)">
                  <UInput
                    v-model.number="form.slump"
                    type="number"
                    placeholder="10"
                    icon="i-lucide-move-vertical"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Brita">
                  <UInput
                    v-model="form.stoneSize"
                    placeholder="Brita 1"
                    icon="i-lucide-hexagon"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <UFormField label="Descrição">
                <UTextarea
                  v-model="form.description"
                  placeholder="Observações sobre a aplicação, características..."
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <USeparator />

          <!-- ── Section: Composição ── -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h4
                class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
              >
                <UIcon name="i-lucide-flask-conical" class="w-4 h-4" />
                Composição
              </h4>
              <UBadge color="neutral" variant="soft" size="sm">
                Custo Est.: {{ formatCurrency(calculateTotalCost()) }}
              </UBadge>
            </div>

            <!-- Add new item -->
            <div
              class="p-4 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 space-y-3 shadow-inner"
            >
              <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Adicionar Insumo
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div class="sm:col-span-7">
                  <USelectMenu
                    v-model="newItem.materialId"
                    :items="materialOptions"
                    value-key="value"
                    label-key="label"
                    placeholder="Selecione um insumo..."
                    class="w-full"
                  />
                </div>
                <div class="sm:col-span-3">
                  <UInput
                    v-model.number="newItem.quantity"
                    type="number"
                    step="0.01"
                    placeholder="Qtd"
                    class="w-full"
                  />
                </div>
                <div class="sm:col-span-2">
                  <UButton
                    color="primary"
                    variant="solid"
                    icon="i-heroicons-plus-16-solid"
                    class="w-full flex justify-center py-2"
                    @click="addMaterialToMix"
                  />
                </div>
              </div>
            </div>

            <!-- List of added items -->
            <div v-if="form.items.length > 0" class="flex flex-col gap-2">
              <div
                v-for="(item, idx) in form.items"
                :key="item.tempId"
                class="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 group hover:border-primary-200 dark:hover:border-primary-800 transition-colors relative"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700"
                    >
                      <UIcon
                        :name="getMaterialDetails(item.materialId)?.type ? typeConfig[getMaterialDetails(item.materialId)!.type].icon : 'i-lucide-package'"
                        class="h-5 w-5 text-zinc-500"
                      />
                    </div>
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-zinc-900 dark:text-white">
                        {{ getMaterialDetails(item.materialId)?.name || 'Insumo removido' }}
                      </span>
                      <span class="text-[10px] font-black uppercase tracking-widest text-primary-500">
                        {{ typeConfig[getMaterialDetails(item.materialId)?.type || 'other'].label }}
                      </span>
                    </div>
                  </div>
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    size="xs"
                    @click="removeMaterialFromMix(idx)"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Insumo" required :error="formErrors[`items_${idx}_materialId`]" class="opacity-50 pointer-events-none">
                    <USelectMenu
                      v-model="item.materialId"
                      :items="materialOptions"
                      label-key="label"
                      value-key="value"
                      disabled
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Quantidade"
                    required
                    :error="formErrors[`items_${idx}_quantity`]"
                  >
                    <UInput
                      v-model.number="item.quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full"
                    >
                      <template #trailing>
                        {{ getMaterialDetails(item.materialId)?.unit }}
                      </template>
                    </UInput>
                  </UFormField>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </template>

    <template #footer>
      <div
        class="flex items-center gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      >
        <UButton color="neutral" variant="outline" class="flex-1" @click="isOpen = false">
          Cancelar
        </UButton>
        <UButton
          color="primary"
          class="flex-1"
          :loading="loadingSave"
          icon="i-heroicons-check"
          type="submit"
          form="mix-design-form"
        >
          {{ isEditing ? 'Salvar Alterações' : 'Criar Traço' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
