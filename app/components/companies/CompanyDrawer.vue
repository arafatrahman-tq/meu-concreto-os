<script setup lang="ts">
import { BR_STATES } from '~/utils/constants'

const props = defineProps<{
  open: boolean
  company: any | null // Company object or null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'saved': []
}>()

const toast = useToast()

const isDrawerOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const isEditing = computed(() => !!props.company)
const loadingSave = ref(false)

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────
const form = reactive({
  name: '',
  document: '', // CNPJ — only used on create
  email: '',
  phone: '',
  address: '',
  city: '',
  state: undefined as string | undefined,
  zip: '',
  active: true
})

const formErrors = reactive<Record<string, string>>({})

const clearErrors = () => {
  for (const key in formErrors) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete formErrors[key]
  }
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  if (!form.name || form.name.trim().length < 3) {
    formErrors.name = 'O nome da empresa é obrigatório (mínimo 3 caracteres).'
    isValid = false
  }

  if (!isEditing.value) {
    const plainCnpj = form.document.replace(/\D/g, '')
    if (!plainCnpj || plainCnpj.length !== 14) {
      formErrors.document = 'O CNPJ deve conter 14 números.'
      isValid = false
    }
  }

  if (form.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      formErrors.email = 'Insira um e-mail válido.'
      isValid = false
    }
  }

  return isValid
}

// Masks (imported or defined here)
const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

const formatZip = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

// Input masks via watch
watch(
  () => form.document,
  (val) => {
    const masked = formatCnpj(val)
    if (masked !== val) form.document = masked
  }
)

watch(
  () => form.phone,
  (val) => {
    const masked = formatPhone(val)
    if (masked !== val) form.phone = masked
  }
)

// ─────────────────────────────────────────────
// Initial load
// ─────────────────────────────────────────────
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      clearErrors()
      if (props.company) {
        form.name = props.company.name
        form.document = formatCnpj(props.company.document)
        form.email = props.company.email ?? ''
        form.phone = props.company.phone ? formatPhone(props.company.phone) : ''
        form.address = props.company.address ?? ''
        form.city = props.company.city ?? ''
        form.state = props.company.state ?? undefined
        form.zip = props.company.zip ? formatZip(props.company.zip) : ''
        form.active = props.company.active
        loadMembers(props.company.id)
      } else {
        form.name = ''
        form.document = ''
        form.email = ''
        form.phone = ''
        form.address = ''
        form.city = ''
        form.state = undefined
        form.zip = ''
        form.active = true
        membersList.value = []
      }
      cepStatus.value = 'idle'
      cepMessage.value = ''
    }
  }
)

// ─────────────────────────────────────────────
// ViaCEP integration
// ─────────────────────────────────────────────
const cepLoading = ref(false)
const cepStatus = ref<'idle' | 'success' | 'error'>('idle')
const cepMessage = ref('')

interface ViaCepResponse {
  erro?: boolean
  logradouro?: string
  localidade?: string
  uf?: string
}

const lookupCep = async (digits: string) => {
  cepLoading.value = true
  cepStatus.value = 'idle'
  cepMessage.value = ''
  try {
    const data = await $fetch<ViaCepResponse>(
      `https://viacep.com.br/ws/${digits}/json/`
    )
    if (data.erro) {
      cepStatus.value = 'error'
      cepMessage.value = 'CEP não encontrado.'
      return
    }
    if (data.logradouro) form.address = data.logradouro
    form.city = data.localidade ?? form.city
    form.state = data.uf ?? form.state
    cepStatus.value = 'success'
    cepMessage.value = `${data.localidade} / ${data.uf}`
  } catch {
    cepStatus.value = 'error'
    cepMessage.value = 'Erro ao consultar CEP. Verifique sua conexão.'
  } finally {
    cepLoading.value = false
  }
}

watch(
  () => form.zip,
  (val) => {
    const masked = formatZip(val)
    if (masked !== val) form.zip = masked
    const digits = val.replace(/\D/g, '')
    if (digits.length === 8) {
      lookupCep(digits)
    } else {
      cepStatus.value = 'idle'
      cepMessage.value = ''
    }
  }
)

// ─────────────────────────────────────────────
// Members (edit mode only)
// ─────────────────────────────────────────────
interface CompanyMemberEntry {
  id: number
  name: string
  email: string
  role: string
  active: boolean
}

const membersList = ref<CompanyMemberEntry[]>([])
const membersLoading = ref(false)
const addUserSearch = ref('')
const selectedUserToAdd = ref<{ id: number, name: string } | null>(null)
const addUserRole = ref<'admin' | 'manager' | 'user'>('user')
const addingUser = ref(false)
const removingUserId = ref<number | null>(null)

const { data: allUsersData } = await useFetch<{ users: CompanyMemberEntry[] }>(
  '/api/users'
)
const allUsersList = computed(() => allUsersData.value?.users ?? [])

const filteredUsersForAdd = computed(() => {
  const q = addUserSearch.value.toLowerCase()
  const already = new Set(membersList.value.map(m => m.id))
  return allUsersList.value
    .filter(
      u =>
        !already.has(u.id)
        && (!q
          || u.name.toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q))
    )
    .slice(0, 8)
})

const MEMBER_ROLE_OPTS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'user', label: 'Usuário' }
]

function memberRoleColor(role: string) {
  if (role === 'admin') return 'error'
  if (role === 'manager') return 'warning'
  return 'neutral'
}

function memberRoleLabel(role: string) {
  return MEMBER_ROLE_OPTS.find(r => r.value === role)?.label ?? role
}

async function loadMembers(companyId: number) {
  membersLoading.value = true
  try {
    const data = await $fetch<{ users: CompanyMemberEntry[] }>(
      `/api/users?companyId=${companyId}`
    )
    membersList.value = data.users ?? []
  } catch {
    membersList.value = []
  } finally {
    membersLoading.value = false
  }
}

async function addUserToCompany() {
  if (!selectedUserToAdd.value || !props.company) return
  addingUser.value = true
  try {
    await $fetch('/api/user-companies', {
      method: 'POST',
      body: {
        userId: selectedUserToAdd.value.id,
        companyId: props.company.id,
        role: addUserRole.value
      }
    })
    toast.add({
      title: 'Usuário vinculado',
      description: `${selectedUserToAdd.value.name} adicionado à empresa.`,
      color: 'success'
    })
    selectedUserToAdd.value = null
    addUserSearch.value = ''
    addUserRole.value = 'user'
    await loadMembers(props.company.id)
  } catch (e: any) {
    toast.add({
      title: 'Erro',
      description: e.data?.message ?? 'Não foi possível vincular o usuário.',
      color: 'error'
    })
  } finally {
    addingUser.value = false
  }
}

async function removeUserFromCompany(member: CompanyMemberEntry) {
  if (!props.company) return
  removingUserId.value = member.id
  try {
    await $fetch(
      `/api/user-companies/by?userId=${member.id}&companyId=${props.company.id}`,
      { method: 'DELETE' }
    )
    toast.add({
      title: 'Usuário removido',
      description: `${member.name} desvinculado da empresa.`,
      color: 'warning'
    })
    await loadMembers(props.company.id)
  } catch {
    toast.add({
      title: 'Erro',
      description: 'Não foi possível remover o usuário.',
      color: 'error'
    })
  } finally {
    removingUserId.value = null
  }
}

// ─────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────
const handleSave = async () => {
  if (!validateForm()) {
    toast.add({
      title: 'Atenção',
      description: 'Corrija os campos destacados em vermelho.',
      color: 'error'
    })
    return
  }

  loadingSave.value = true
  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state?.trim() || undefined,
      zip: form.zip.trim() || undefined,
      active: form.active,
      ...(isEditing.value ? {} : { document: form.document.trim() })
    }

    if (isEditing.value && props.company) {
      await $fetch(`/api/companies/${props.company.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Empresa atualizada', color: 'success' })
    } else {
      await $fetch('/api/companies', { method: 'POST', body: payload })
      toast.add({ title: 'Empresa cadastrada', color: 'success' })
    }

    emit('saved')
    isDrawerOpen.value = false
  } catch (e: any) {
    const errMsg
      = e.statusCode === 409
        ? 'CNPJ já cadastrado.'
        : (e.data?.message ?? e.data?.statusMessage ?? e.message ?? 'Erro ao salvar empresa.')
    toast.add({ title: 'Erro ao salvar', description: errMsg, color: 'error' })
  } finally {
    loadingSave.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="isDrawerOpen"
    :title="isEditing ? 'Editar Empresa' : 'Nova Empresa'"
    side="right"
    :ui="{ footer: 'p-0 block' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
        <!-- ── Section: Identificação ── -->
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <UIcon
              name="i-heroicons-building-office-2"
              class="w-4 h-4 text-primary-500"
            />
            Identificação
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UFormField
              label="Razão Social / Nome *"
              class="col-span-full"
              required
              :error="formErrors.name"
            >
              <UInput
                v-model="form.name"
                placeholder="ex: Construtora Exemplo Ltda"
                icon="i-heroicons-building-office-2"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField
              label="CNPJ *"
              class="col-span-full"
              required
              :error="formErrors.document"
            >
              <UInput
                v-model="form.document"
                placeholder="00.000.000/0000-00"
                icon="i-heroicons-identification"
                class="w-full"
                size="lg"
                :disabled="isEditing"
                :ui="{ base: isEditing ? 'opacity-50 cursor-not-allowed' : '' }"
              />
              <template
                v-if="isEditing"
                #hint
              >
                <span class="text-xs text-zinc-400">
                  O CNPJ não pode ser alterado após o cadastro.
                </span>
              </template>
            </UFormField>

            <UFormField
              label="E-mail"
              :error="formErrors.email"
            >
              <UInput
                v-model="form.email"
                type="email"
                placeholder="contato@empresa.com.br"
                icon="i-heroicons-envelope"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField label="Telefone">
              <UInput
                v-model="form.phone"
                placeholder="(00) 00000-0000"
                icon="i-heroicons-phone"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- ── Section: Endereço ── -->
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <UIcon
              name="i-heroicons-map-pin"
              class="w-4 h-4 text-primary-500"
            />
            Endereço
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UFormField
              label="Logradouro"
              class="col-span-full"
            >
              <UInput
                v-model="form.address"
                placeholder="Rua, Av., número, complemento"
                icon="i-heroicons-map-pin"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField label="Cidade">
              <UInput
                v-model="form.city"
                placeholder="São Paulo"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField label="Estado (UF)">
              <USelect
                v-model="form.state"
                :items="BR_STATES"
                value-key="value"
                label-key="label"
                placeholder="Selecione..."
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField
              label="CEP"
              :hint="cepStatus === 'success' ? cepMessage : undefined"
            >
              <template
                v-if="cepStatus === 'success'"
                #hint
              >
                <span class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-3.5 h-3.5"
                  />
                  {{ cepMessage }}
                </span>
              </template>
              <UInput
                v-model="form.zip"
                placeholder="00000-000"
                icon="i-heroicons-map-pin"
                :loading="cepLoading"
                class="w-full"
                size="lg"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- ── Section: Membros (edit mode only) ── -->
        <template v-if="isEditing">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <UIcon
                  name="i-heroicons-users"
                  class="w-4 h-4 text-primary-500"
                />
                Membros com Acesso
              </h4>
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                {{ membersList.length }} usuário{{ membersList.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <div
              v-if="membersLoading"
              class="space-y-2"
            >
              <USkeleton
                v-for="i in 2"
                :key="i"
                class="h-12 rounded-xl"
              />
            </div>

            <div
              v-else-if="membersList.length === 0"
              class="flex flex-col items-center justify-center py-6 text-zinc-400 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-8 h-8 mb-2"
              />
              <p class="text-xs font-bold">
                Nenhum usuário vinculado
              </p>
            </div>

            <div
              v-else
              class="space-y-2 mb-4"
            >
              <div
                v-for="member in membersList"
                :key="member.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900 group/entry"
              >
                <div class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <span class="text-sm font-black text-primary-600 dark:text-primary-400">
                    {{ member.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-bold text-zinc-900 dark:text-white truncate block">
                    {{ member.name }}
                  </span>
                  <UBadge
                    :color="memberRoleColor(member.role)"
                    variant="soft"
                    size="xs"
                    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2 py-0.5"
                  >
                    {{ memberRoleLabel(member.role) }}
                  </UBadge>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  :loading="removingUserId === member.id"
                  class="opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0"
                  @click="removeUserFromCompany(member)"
                />
              </div>
            </div>

            <!-- Add user row -->
            <div class="rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-3">
              <p class="text-xs font-bold text-zinc-500">
                Vincular novo usuário
              </p>
              <UInput
                v-model="addUserSearch"
                placeholder="Buscar por nome ou e-mail..."
                icon="i-heroicons-magnifying-glass"
                size="sm"
                class="w-full"
              />
              <div
                v-if="filteredUsersForAdd.length > 0"
                class="space-y-1"
              >
                <button
                  v-for="u in filteredUsersForAdd"
                  :key="u.id"
                  type="button"
                  :class="[
                    'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors',
                    selectedUserToAdd?.id === u.id
                      ? 'bg-primary-50 dark:bg-primary-500/10 ring-1 ring-primary-300'
                      : 'hover:bg-white dark:hover:bg-zinc-800'
                  ]"
                  @click="
                    selectedUserToAdd
                      = selectedUserToAdd?.id === u.id
                        ? null
                        : { id: u.id, name: u.name }
                  "
                >
                  <div class="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                    <span class="text-xs font-black text-zinc-600 dark:text-zinc-300">
                      {{ u.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {{ u.name }}
                    </p>
                    <p class="text-[10px] text-zinc-400 truncate">
                      {{ u.email }}
                    </p>
                  </div>
                  <UIcon
                    v-if="selectedUserToAdd?.id === u.id"
                    name="i-heroicons-check"
                    class="w-4 h-4 text-primary-500 shrink-0"
                  />
                </button>
              </div>

              <div
                v-if="selectedUserToAdd"
                class="flex items-center gap-2 pt-1"
              >
                <USelect
                  v-model="addUserRole"
                  :items="MEMBER_ROLE_OPTS"
                  value-key="value"
                  label-key="label"
                  size="sm"
                  class="flex-1"
                />
                <UButton
                  color="primary"
                  size="sm"
                  icon="i-heroicons-plus"
                  :loading="addingUser"
                  @click="addUserToCompany"
                >
                  Adicionar
                </UButton>
              </div>
            </div>
          </div>
          <USeparator />
        </template>

        <!-- ── Section: Configurações ── -->
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <UIcon
              name="i-heroicons-cog-6-tooth"
              class="w-4 h-4"
            />
            Configurações
          </h4>
          <div class="flex items-center justify-between p-4 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div>
              <p class="text-sm font-bold text-zinc-900 dark:text-white">
                Empresa Ativa
              </p>
              <p class="text-xs text-zinc-400 mt-0.5">
                Empresas inativas não aparecem nas sugestões de clientes
              </p>
            </div>
            <USwitch v-model="form.active" />
          </div>
        </div>
      </div>
    </template>

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
          {{ isEditing ? "Salvar Alterações" : "Cadastrar Empresa" }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
