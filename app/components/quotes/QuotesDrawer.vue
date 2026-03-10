<script setup lang="ts">
import type {
  KnownCustomer,
  QuoteForm,
  SelectOption,
  MixDesign
} from '~/types/sales'
import { formatCurrency, maskPhone, maskDocument } from '~/utils/formatters'
import { STATUS_OPTS } from '~/composables/useQuotes'

const props = defineProps<{
  isEditing: boolean
  knownCustomers: KnownCustomer[]
  productOptions: SelectOption[]
  sellerOptions: SelectOption[]
  driverOptions: SelectOption[]
  pumperOptions: SelectOption[]
  mixDesigns: MixDesign[]
  paymentMethodOptions: SelectOption[]
  // Form state and methods
  form: QuoteForm
  isDrawerOpen: boolean
  loadingSave: boolean
  subtotalBRL: number
  totalBRL: number
  customerSearchTerm: string
  selectedCustomer: KnownCustomer | undefined
  selectedDriver: SelectOption[] | undefined
  selectedPumper: SelectOption | undefined
  useDeliveryAddress: boolean
  customerRegisteredAddress: string
  // Methods
  onCustomerSelect: (c: KnownCustomer) => void
  onProductSelect: (idx: number, id: number | null) => void
  onMixDesignSelect: (idx: number, id: number | null) => void
  addItem: () => void
  removeItem: (idx: number) => void
  handleSave: () => void
  onCreateDriver: (name: string) => void
  onDeleteDriver: (d: { id: number, name: string }) => void
  onCreatePumper: (name: string) => void
  onDeletePumper: (p: { id: number, name: string }) => void
  formErrors: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:isDrawerOpen', value: boolean): void
  (e: 'update:customerSearchTerm', value: string): void
  (e: 'update:selectedCustomer', value: KnownCustomer | undefined): void
  (e: 'update:selectedDriver', value: SelectOption[] | undefined): void
  (e: 'update:selectedPumper', value: SelectOption | undefined): void
  (e: 'update:useDeliveryAddress', value: boolean): void
}>()

// We use computed with getter/setter for v-model props
const isDrawerOpen = computed({
  get: () => props.isDrawerOpen,
  set: val => emit('update:isDrawerOpen', val)
})

const customerSearchTerm = computed({
  get: () => props.customerSearchTerm,
  set: val => emit('update:customerSearchTerm', val)
})

const selectedCustomer = computed({
  get: () => props.selectedCustomer,
  set: val => emit('update:selectedCustomer', val)
})

const selectedDriver = computed({
  get: () => props.selectedDriver,
  set: val => emit('update:selectedDriver', val)
})

const selectedPumper = computed({
  get: () => props.selectedPumper,
  set: val => emit('update:selectedPumper', val)
})

const useDeliveryAddress = computed({
  get: () => props.useDeliveryAddress,
  set: val => emit('update:useDeliveryAddress', val)
})
</script>

<template>
  <USlideover
    v-model:open="isDrawerOpen"
    :title="isEditing ? 'Editar Orçamento' : 'Novo Orçamento'"
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
        <!-- ── Section: Cliente ── -->
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <UIcon
              name="i-heroicons-user"
              class="w-4 h-4"
            />
            Dados do Cliente
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <!-- Nome com autocomplete -->
            <UFormField
              label="Nome do Cliente"
              required
              :error="formErrors.customerName"
              class="col-span-full"
            >
              <USelectMenu
                v-model="selectedCustomer"
                v-model:search-term="customerSearchTerm"
                :items="knownCustomers"
                :filter-fields="['name', 'document', 'phone']"
                placeholder="Buscar ou selecionar cliente..."
                icon="i-heroicons-user"
                class="w-full"
                size="lg"
                :class="{
                  'bg-red-50 dark:bg-red-500/10 transition-colors':
                    formErrors.customerName
                }"
                :reset-search-term-on-blur="false"
                :reset-search-term-on-select="false"
                by="name"
                @update:model-value="
                  (v: KnownCustomer | undefined) => v && onCustomerSelect(v)
                "
                @update:search-term="
                  (v: string) => {
                    form.customerName = v;
                  }
                "
              >
                <template #item="{ item }">
                  <div class="flex items-center gap-3 py-0.5 w-full min-w-0">
                    <div class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                      <span class="text-[10px] font-black text-primary-600 dark:text-primary-400">
                        {{ item.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-zinc-900 dark:text-white truncate">
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
                      class="ml-auto shrink-0 font-black uppercase tracking-widest text-[9px] rounded-full px-2 py-0.5"
                    >
                      {{ item.source === "company" ? "Empresa" : "Anterior" }}
                    </UBadge>
                  </div>
                </template>
              </USelectMenu>
            </UFormField>

            <!-- Documento + Telefone -->
            <UFormField label="CPF / CNPJ">
              <UInput
                v-model="form.customerDocument"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                icon="i-heroicons-identification"
                class="w-full"
                size="lg"
                @update:model-value="(v) => (form.customerDocument = maskDocument(v))"
              />
            </UFormField>
            <UFormField label="Telefone">
              <UInput
                v-model="form.customerPhone"
                placeholder="(00) 00000-0000"
                icon="i-heroicons-phone"
                class="w-full"
                size="lg"
                @update:model-value="(v) => (form.customerPhone = maskPhone(v))"
              />
            </UFormField>

            <!-- Address block -->
            <div class="col-span-full space-y-3">
              <!-- Registered address preview (when a known customer is selected) -->
              <div
                v-if="customerRegisteredAddress"
                class="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700 p-3 flex items-start gap-3"
              >
                <UIcon
                  name="i-heroicons-map-pin"
                  class="w-4 h-4 text-zinc-400 mt-0.5 shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5">
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
                  :label="useDeliveryAddress ? 'Cancelar' : 'Alterar entrega'"
                  @click="useDeliveryAddress = !useDeliveryAddress"
                />
              </div>

              <!-- Delivery address input -->
              <UFormField
                :label="
                  customerRegisteredAddress
                    ? 'Endereço de Entrega (diferente)'
                    : 'Endereço de Entrega'
                "
                :class="{
                  hidden: customerRegisteredAddress && !useDeliveryAddress
                }"
              >
                <UInput
                  v-model="form.customerAddress"
                  placeholder="Rua, número, bairro, cidade"
                  icon="i-heroicons-truck"
                  class="w-full"
                  size="lg"
                />
              </UFormField>
            </div>

            <!-- Vendedor, Motorista, Bombeador -->
            <div class="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-5">
              <UFormField label="Vendedor Responsável">
                <USelect
                  v-model="form.sellerId"
                  :items="sellerOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Selecione..."
                  icon="i-heroicons-user-circle"
                  class="w-full"
                  size="lg"
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
                  size="lg"
                >
                  <template #item="{ item }">
                    <div class="flex items-center justify-between w-full group/item">
                      <span>{{ item.label }}</span>
                      <UButton
                        v-if="item.value !== 0"
                        color="error"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="xs"
                        class="opacity-0 group-hover/item:opacity-100 transition-opacity"
                        @click="
                          onDeleteDriver({
                            id: item.value,
                            name: item.label
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
                      @click="onCreateDriver(searchTerm || '')"
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
                  size="lg"
                >
                  <template #item="{ item }">
                    <div class="flex items-center justify-between w-full group/item">
                      <span>{{ item.label }}</span>
                      <UButton
                        v-if="item.value !== 0"
                        color="error"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="xs"
                        class="opacity-0 group-hover/item:opacity-100 transition-opacity"
                        @click="
                          onDeletePumper({
                            id: item.value,
                            name: item.label
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
                      @click="onCreatePumper(searchTerm || '')"
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
            <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <UIcon
                name="i-lucide-package"
                class="w-4 h-4"
              />
              Itens do Orçamento
            </h4>
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-plus"
              size="xs"
              @click="() => addItem()"
            >
              Adicionar
            </UButton>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, idx) in form.items"
              :key="item._key"
              class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-4 relative"
            >
              <!-- Remove btn -->
              <button
                v-if="form.items.length > 1"
                class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                @click="removeItem(idx as number)"
              >
                <UIcon
                  name="i-heroicons-trash"
                  class="w-4 h-4"
                />
              </button>

              <!-- Product select -->
              <UFormField label="Produto">
                <USelect
                  :items="productOptions"
                  :model-value="item.productId ?? undefined"
                  value-key="value"
                  label-key="label"
                  placeholder="Selecione ou deixe em branco"
                  icon="i-lucide-package"
                  class="w-full"
                  size="lg"
                  @update:model-value="(v: any) => onProductSelect(idx as number, v ?? null)"
                />
              </UFormField>

              <!-- Product name + description (editable) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Unidade">
                  <USelect
                    v-model="item.unit"
                    :items="['m3', 'un', 'hr', 'kg', 'ton']"
                    icon="i-heroicons-scale"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>
              </div>
              <UFormField label="Descrição">
                <UInput
                  v-model="item.description"
                  placeholder="Detalhes adicionais (opcional)"
                  icon="i-heroicons-pencil"
                  class="w-full"
                  size="lg"
                />
              </UFormField>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5">
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
                    size="lg"
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
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Total">
                  <div class="flex items-center h-12 px-4 rounded-2xl bg-white dark:bg-zinc-900 text-sm font-black text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700">
                    <UIcon
                      name="i-heroicons-receipt-percent"
                      class="w-4 h-4 mr-2 text-zinc-400"
                    />
                    {{ formatCurrency(Math.round(item.quantity * item.unitPrice * 100)) }}
                  </div>
                </UFormField>
              </div>

              <!-- Concrete specifics -->
              <div
                v-if="item.unit === 'm3'"
                class="space-y-4 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-700"
              >
                <UFormField label="Traço de Produção (Receita)">
                  <USelectMenu
                    :model-value="item.mixDesignId ?? undefined"
                    :items="mixDesigns"
                    value-attribute="id"
                    value-key="id"
                    label-key="name"
                    placeholder="Selecione um traço (opcional)"
                    icon="i-heroicons-beaker"
                    class="w-full"
                    size="lg"
                    @update:model-value="(v: number | null) => onMixDesignSelect(idx as number, v)"
                  />
                </UFormField>

                <div class="grid grid-cols-3 gap-5">
                  <UFormField label="FCK (MPa)">
                    <UInput
                      v-model.number="item.fck"
                      type="number"
                      placeholder="25"
                      icon="i-heroicons-beaker"
                      class="w-full"
                      size="lg"
                    />
                  </UFormField>
                  <UFormField label="Slump (cm)">
                    <UInput
                      v-model.number="item.slump"
                      type="number"
                      placeholder="10"
                      icon="i-heroicons-adjustments-horizontal"
                      class="w-full"
                      size="lg"
                    />
                  </UFormField>
                  <UFormField label="Brita">
                    <UInput
                      v-model="item.stoneSize"
                      placeholder="brita 1"
                      icon="i-heroicons-circle-stack"
                      class="w-full"
                      size="lg"
                    />
                  </UFormField>
                </div>
              </div>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- ── Section: Detalhes ── -->
        <div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 space-y-6">
          <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Detalhes do Orçamento
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UFormField label="Status">
              <USelect
                v-model="form.status"
                :items="STATUS_OPTS.filter((s: any) => s.value !== 'all')"
                value-key="value"
                label-key="label"
                icon="i-heroicons-signal"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="Válido até">
              <UInput
                v-model="form.validUntil"
                type="date"
                icon="i-heroicons-calendar-days"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="Forma de Pagamento">
              <USelect
                v-model="form.paymentMethod"
                :items="paymentMethodOptions"
                value-key="value"
                label-key="label"
                placeholder="Selecione uma forma..."
                icon="i-heroicons-credit-card"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="2ª Forma de Pagamento">
              <USelect
                v-model="form.paymentMethod2"
                :items="paymentMethodOptions"
                value-key="value"
                label-key="label"
                placeholder="Opcional..."
                icon="i-heroicons-credit-card"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField
              label="Desconto (R$)"
              :error="formErrors.discount"
            >
              <UInput
                v-model.number="form.discount"
                type="number"
                min="0"
                step="0.01"
                icon="i-heroicons-minus"
                class="w-full"
                size="lg"
              />
            </UFormField>
            <UFormField label="Total Final">
              <div class="flex items-center h-12 px-4 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-sm font-black text-primary-600 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-500/20">
                <UIcon
                  name="i-heroicons-banknotes"
                  class="w-4 h-4 mr-2"
                />
                {{ formatCurrency(Math.round(totalBRL * 100)) }}
              </div>
            </UFormField>
          </div>

          <UFormField label="Observações">
            <UTextarea
              v-model="form.notes"
              placeholder="Condições de pagamento, prazo de entrega, observações gerais..."
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <!-- Footer with save actions -->
    <template #footer>
      <div class="flex items-center gap-4 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <UButton
          color="neutral"
          variant="ghost"
          class="flex-1 font-bold h-12 rounded-2xl"
          @click="isDrawerOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          class="flex-1 font-bold h-12 rounded-2xl shadow-lg shadow-primary-500/20"
          :loading="loadingSave"
          icon="i-heroicons-check"
          size="lg"
          @click="handleSave"
        >
          {{ isEditing ? "Salvar Alterações" : "Criar Orçamento" }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
