<script setup lang="ts">
import type {
  Sale,
  FormItem,
  SaleStatus,
  KnownCustomer,
  SaleForm,
} from "../../types/sales";
import {
  formatCurrency,
  maskPhone,
  maskDocument,
} from "../../utils/formatters";

const props = defineProps<{
  open: boolean;
  isEditing: boolean;
  loadingSave: boolean;
  form: SaleForm;
  linkedQuoteId: number | null;
  selectedCustomer: KnownCustomer | undefined;
  customerSearchTerm: string;
  knownCustomers: KnownCustomer[];
  customerRegisteredAddress: string;
  useDeliveryAddress: boolean;
  sellerOptions: any[];
  driverOptions: any[];
  pumperOptions: any[];
  productOptions: any[];
  paymentMethodOptions: any[];
  subtotalBRL: number;
  totalBRL: number;
  formErrors: Record<string, string>;
  mixDesigns: any[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:customerSearchTerm": [value: string];
  "update:selectedCustomer": [value: KnownCustomer | undefined];
  "update:useDeliveryAddress": [value: boolean];
  save: [];
  addItem: [];
  removeItem: [idx: number];
  productSelect: [idx: number, productId: number | null];
  mixDesignSelect: [idx: number, mixDesignId: number | null];
  customerSelect: [customer: KnownCustomer];
  createDriver: [name: string];
  deleteDriver: [driver: { id: number; name: string }];
  createPumper: [name: string];
  deletePumper: [pumper: { id: number; name: string }];
}>();

const isDrawerOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const localCustomerSearchTerm = computed({
  get: () => props.customerSearchTerm,
  set: (val) => emit("update:customerSearchTerm", val),
});

const localSelectedCustomer = computed({
  get: () => props.selectedCustomer,
  set: (val) => emit("update:selectedCustomer", val),
});

const localUseDeliveryAddress = computed({
  get: () => props.useDeliveryAddress,
  set: (val) => emit("update:useDeliveryAddress", val),
});

const STATUS_OPTS = [
  { label: "Pendente", value: "pending" },
  { label: "Confirmado", value: "confirmed" },
  { label: "Em Progresso", value: "in_progress" },
  { label: "Concluído", value: "completed" },
  { label: "Cancelado", value: "cancelled" },
];

// Usando o global do formatters.ts

const selectedDriver = computed({
  get: () =>
    props.driverOptions.filter((d) => props.form.driverIds.includes(d.value)),
  set: (val: any[]) => {
    props.form.driverIds = val.map((v) => v.value);
  },
});

const selectedPumper = computed({
  get: () =>
    props.pumperOptions.find((p) => p.value === props.form.pumperId) ||
    props.pumperOptions[0],
  set: (val: any) => {
    props.form.pumperId = val?.value ?? 0;
  },
});

const onDeleteDriver = (e: Event, driver: { id: number; name: string }) => {
  e.stopPropagation();
  emit("deleteDriver", driver);
};

const onDeletePumper = (e: Event, pumper: { id: number; name: string }) => {
  e.stopPropagation();
  emit("deletePumper", pumper);
};
</script>

<template>
  <USlideover
    v-model:open="isDrawerOpen"
    :title="isEditing ? 'Editar Venda' : 'Nova Venda'"
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
        <!-- Quote origin badge -->
        <div
          v-if="linkedQuoteId"
          class="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/20 px-4 py-2.5"
        >
          <UIcon
            name="i-heroicons-document-text"
            class="w-4 h-4 text-blue-500 shrink-0"
          />
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Originada do orçamento
            <strong>#{{ String(linkedQuoteId).padStart(4, "0") }}</strong>
          </p>
        </div>

        <!-- ── Section: Cliente ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-primary-500" />
            Dados do Cliente
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Nome do Cliente"
              required
              :error="formErrors.customerName"
              class="col-span-full"
            >
              <USelectMenu
                v-model="localSelectedCustomer"
                v-model:search-term="localCustomerSearchTerm"
                :items="knownCustomers"
                :filter-fields="['name', 'document', 'phone']"
                placeholder="Buscar ou selecionar cliente..."
                icon="i-heroicons-user"
                class="w-full"
                :reset-search-term-on-blur="false"
                :reset-search-term-on-select="false"
                by="name"
                :class="{
                  'bg-red-50 dark:bg-red-500/10 transition-colors':
                    formErrors.customerName,
                }"
                @update:model-value="(v: any) => v && emit('customerSelect', v)"
                @update:search-term="(v: string) => { form.customerName = v }"
              >
                <template #item="{ item }">
                  <div class="flex items-center gap-3 py-0.5 w-full min-w-0">
                    <div
                      class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                    >
                      <span
                        class="text-[10px] font-black text-primary-600 dark:text-primary-400"
                      >
                        {{ item.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <p
                        class="text-sm font-bold text-zinc-900 dark:text-white truncate"
                      >
                        {{ item.name }}
                      </p>
                      <p
                        v-if="item.suffix"
                        class="text-xs text-zinc-400 truncate"
                      >
                        {{ item.suffix }}
                      </p>
                    </div>
                    <UBadge
                      :color="item.source === 'company' ? 'info' : 'neutral'"
                      variant="soft"
                      size="xs"
                      class="ml-auto shrink-0"
                    >
                      {{ item.source === "company" ? "Empresa" : "Anterior" }}
                    </UBadge>
                  </div>
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="CPF / CNPJ">
              <UInput
                v-model="form.customerDocument"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                icon="i-heroicons-identification"
                class="w-full"
                @update:model-value="
                  (v) => (form.customerDocument = maskDocument(v))
                "
              />
            </UFormField>
            <UFormField label="Telefone">
              <UInput
                v-model="form.customerPhone"
                placeholder="(00) 00000-0000"
                icon="i-heroicons-phone"
                class="w-full"
                @update:model-value="(v) => (form.customerPhone = maskPhone(v))"
              />
            </UFormField>
            <div class="col-span-full space-y-3">
              <div
                v-if="customerRegisteredAddress"
                class="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700 p-3 flex items-start gap-3"
              >
                <UIcon
                  name="i-heroicons-map-pin"
                  class="w-4 h-4 text-zinc-400 mt-0.5 shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <p
                    class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5"
                  >
                    Endereço Cadastrado
                  </p>
                  <p class="text-sm text-zinc-700 dark:text-zinc-300">
                    {{ customerRegisteredAddress }}
                  </p>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-pencil-square"
                  :label="
                    localUseDeliveryAddress ? 'Cancelar' : 'Alterar entrega'
                  "
                  @click="localUseDeliveryAddress = !localUseDeliveryAddress"
                />
              </div>

              <UFormField
                :label="
                  customerRegisteredAddress
                    ? 'Endereço de Entrega (diferente)'
                    : 'Endereço de Entrega'
                "
                :class="{
                  hidden: customerRegisteredAddress && !localUseDeliveryAddress,
                }"
              >
                <UInput
                  v-model="form.customerAddress"
                  placeholder="Rua, número, bairro, cidade"
                  icon="i-heroicons-truck"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField label="Vendedor Responsável">
                <USelect
                  v-model="form.sellerId"
                  :items="sellerOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Selecione..."
                  icon="i-heroicons-user-circle"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Motorista">
                <UInputMenu
                  v-model="selectedDriver"
                  :items="driverOptions"
                  multiple
                  placeholder="Selecione ou crie..."
                  icon="i-heroicons-truck"
                  class="w-full"
                >
                  <template #item="{ item }">
                    <div
                      class="flex items-center justify-between w-full group/item"
                    >
                      <span>{{ item.label }}</span>
                      <UButton
                        v-if="item.value !== 0"
                        color="error"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="xs"
                        class="opacity-0 group-hover/item:opacity-100 transition-opacity"
                        @click="
                          onDeleteDriver($event, {
                            id: item.value,
                            name: item.label,
                          })
                        "
                      />
                    </div>
                  </template>
                  <template #empty="{ searchTerm }">
                    <UButton
                      color="primary"
                      variant="ghost"
                      size="xs"
                      block
                      label="Criar motorista"
                      @click="emit('createDriver', searchTerm || '')"
                    >
                      Criar "{{ searchTerm }}"
                    </UButton>
                  </template>
                </UInputMenu>
              </UFormField>
              <UFormField label="Bombeador">
                <UInputMenu
                  v-model="selectedPumper"
                  :items="pumperOptions"
                  placeholder="Selecione ou crie..."
                  icon="i-lucide-anvil"
                  class="w-full"
                >
                  <template #item="{ item }">
                    <div
                      class="flex items-center justify-between w-full group/item"
                    >
                      <span>{{ item.label }}</span>
                      <UButton
                        v-if="item.value !== 0"
                        color="error"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="xs"
                        class="opacity-0 group-hover/item:opacity-100 transition-opacity"
                        @click="
                          onDeletePumper($event, {
                            id: item.value,
                            name: item.label,
                          })
                        "
                      />
                    </div>
                  </template>
                  <template #empty="{ searchTerm }">
                    <UButton
                      color="primary"
                      variant="ghost"
                      size="xs"
                      block
                      label="Criar bombeador"
                      @click="emit('createPumper', searchTerm || '')"
                    >
                      Criar "{{ searchTerm }}"
                    </UButton>
                  </template>
                </UInputMenu>
              </UFormField>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- ── Section: Itens ── -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4
              class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
            >
              <UIcon name="i-lucide-package" class="w-4 h-4" />
              Itens da Venda
            </h4>
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-plus"
              size="xs"
              @click="emit('addItem')"
            >
              Adicionar
            </UButton>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, idx) in form.items"
              :key="item._key"
              class="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 relative"
            >
              <button
                v-if="form.items.length > 1"
                class="absolute top-3 right-3 text-zinc-300 hover:text-red-400 transition-colors"
                @click="emit('removeItem', idx)"
              >
                <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
              </button>

              <UFormField label="Produto">
                <USelect
                  :items="productOptions"
                  :model-value="item.productId ?? undefined"
                  value-key="value"
                  label-key="label"
                  placeholder="Selecione ou deixe em branco"
                  icon="i-lucide-package"
                  class="w-full"
                  @update:model-value="(v: any) => emit('productSelect', idx, v ?? null)"
                />
              </UFormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UFormField
                  label="Nome do Item"
                  required
                  :error="formErrors[`items_${idx}_productName`]"
                >
                  <UInput
                    v-model="item.productName"
                    placeholder="Nome do produto/serviço"
                    icon="i-heroicons-tag"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Unidade">
                  <USelect
                    v-model="item.unit"
                    :items="['m3', 'un', 'hr', 'kg', 'ton']"
                    icon="i-heroicons-scale"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Descrição">
                <UInput
                  v-model="item.description"
                  placeholder="Detalhes adicionais (opcional)"
                  icon="i-heroicons-pencil"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <UFormField
                  label="Qtd"
                  required
                  :error="formErrors[`items_${idx}_quantity`]"
                >
                  <UInput
                    v-model.number="item.quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    icon="i-heroicons-calculator"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Preço Unit. (R$)"
                  required
                  :error="formErrors[`items_${idx}_unitPrice`]"
                >
                  <UInput
                    v-model.number="item.unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    icon="i-heroicons-banknotes"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Total">
                  <div
                    class="flex items-center h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700"
                  >
                    <UIcon
                      name="i-heroicons-receipt-percent"
                      class="w-4 h-4 mr-2 text-zinc-400"
                    />
                    {{
                      formatCurrency(
                        Math.round(item.quantity * item.unitPrice * 100)
                      )
                    }}
                  </div>
                </UFormField>
              </div>

              <!-- Concrete specifics -->
              <div
                v-if="item.unit === 'm3'"
                class="space-y-3 pt-1 border-t border-dashed border-zinc-100 dark:border-zinc-700"
              >
                <UFormField label="Traço de Produção (Receita)">
                  <USelectMenu
                    :model-value="item.mixDesignId ?? undefined"
                    :items="mixDesigns"
                    value-key="id"
                    label-key="name"
                    placeholder="Selecione um traço (opcional)"
                    icon="i-heroicons-beaker"
                    class="w-full"
                    @update:model-value="(v: any) => emit('mixDesignSelect', idx as number, v ?? null)"
                  />
                </UFormField>

                <div class="grid grid-cols-3 gap-3">
                  <UFormField label="FCK (MPa)">
                    <UInput
                      v-model.number="item.fck"
                      type="number"
                      placeholder="25"
                      icon="i-heroicons-beaker"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Slump (cm)">
                    <UInput
                      v-model.number="item.slump"
                      type="number"
                      placeholder="10"
                      icon="i-heroicons-adjustments-horizontal"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Brita">
                    <UInput
                      v-model="item.stoneSize"
                      placeholder="brita 1"
                      icon="i-heroicons-circle-stack"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- ── Section: Detalhes da Venda ── -->
        <div class="space-y-4">
          <h4
            class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4" />
            Detalhes da Venda
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Status">
              <USelect
                v-model="form.status"
                :items="STATUS_OPTS"
                value-key="value"
                label-key="label"
                icon="i-heroicons-signal"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Forma de Pagamento">
              <USelect
                v-model="form.paymentMethod"
                :items="paymentMethodOptions"
                value-key="value"
                label-key="label"
                icon="i-heroicons-credit-card"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Data da Venda">
              <UInput
                v-model="form.date"
                type="date"
                icon="i-heroicons-calendar"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Data de Entrega">
              <UInput
                v-model="form.deliveryDate"
                type="date"
                icon="i-heroicons-calendar-days"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Desconto (R$)" :error="formErrors.discount">
              <UInput
                v-model.number="form.discount"
                type="number"
                min="0"
                step="0.01"
                icon="i-heroicons-minus"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Total Final">
              <div
                class="flex items-center h-9 px-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-sm font-black text-primary-600 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-500/20"
              >
                <UIcon name="i-heroicons-banknotes" class="w-4 h-4 mr-2" />
                {{ formatCurrency(Math.round(totalBRL * 100)) }}
              </div>
            </UFormField>
          </div>

          <UFormField label="Observações">
            <UTextarea
              v-model="form.notes"
              placeholder="Condições de entrega, observações gerais..."
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="border-t border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center justify-between px-6 pt-4 pb-3">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400"
            >Subtotal</span
          >
          <div class="text-right">
            <span class="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {{ formatCurrency(Math.round(subtotalBRL * 100)) }}
            </span>
            <span
              v-if="form.discount > 0"
              class="ml-3 text-sm font-bold text-red-500"
            >
              &minus;{{ formatCurrency(Math.round(form.discount * 100)) }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-3 px-6 pb-6">
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
              icon="i-heroicons-check"
              @click="emit('save')"
            >
              {{ isEditing ? "Salvar Alterações" : "Registrar Venda" }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
