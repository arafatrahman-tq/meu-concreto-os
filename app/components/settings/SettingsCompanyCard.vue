<script setup lang="ts">
import { BR_STATES } from '~/utils/constants'

const props = defineProps<{
  companyId: number | null
}>()

const emit = defineEmits(['updated'])

const toast = useToast()

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

const {
  data: companyData,
  pending: loadingCompany,
  refresh: refreshCompany
} = await useFetch<{
  company: {
    name: string
    document?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    logo?: string | null
    active: boolean
    quickAccessEnabled?: boolean | null
    quickAccessPin?: string | null
    quickAccessCode?: string | null
  }
}>(() => `/api/companies/${props.companyId}`)

const companyRaw = computed(() => companyData.value?.company ?? null)

const companyForm = reactive({
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: undefined as string | undefined,
  zip: '',
  logo: '' as string | null,
  active: true,
  quickAccessEnabled: false,
  quickAccessPin: '',
  quickAccessCode: ''
})

const companyErrors = reactive<Record<string, string>>({})

const clearErrors = () => {
  for (const key in companyErrors) delete companyErrors[key]
}

watch(
  companyRaw,
  (c) => {
    if (!c) return
    companyForm.name = c.name ?? ''
    companyForm.document = c.document ?? ''
    companyForm.email = c.email ?? ''
    companyForm.phone = c.phone ? formatPhone(c.phone) : ''
    companyForm.address = c.address ?? ''
    companyForm.city = c.city ?? ''
    companyForm.state = c.state ?? undefined
    companyForm.zip = c.zip ? formatZip(c.zip) : ''
    companyForm.logo = c.logo ?? null
    companyForm.active = c.active ?? true
    companyForm.quickAccessEnabled = c.quickAccessEnabled ?? false
    companyForm.quickAccessPin = c.quickAccessPin ?? ''
    companyForm.quickAccessCode = c.quickAccessCode ?? ''
  },
  { immediate: true }
)

watch(
  () => companyForm.phone,
  (val) => {
    const masked = formatPhone(val)
    if (masked !== val) companyForm.phone = masked
  }
)

watch(
  () => companyForm.zip,
  (val) => {
    const masked = formatZip(val)
    if (masked !== val) companyForm.zip = masked
  }
)

const cepStatus = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const cepMessage = ref('')

const lookupCep = async () => {
  const digits = companyForm.zip.replace(/\D/g, '')
  if (digits.length !== 8) return
  cepStatus.value = 'loading'
  cepMessage.value = ''
  try {
    const res = await $fetch<{
      logradouro: string
      bairro: string
      localidade: string
      uf: string
      erro?: boolean
    }>(`https://viacep.com.br/ws/${digits}/json/`)
    if (res.erro) {
      cepStatus.value = 'error'
      cepMessage.value = 'CEP não encontrado.'
      return
    }
    companyForm.address = [res.logradouro, res.bairro]
      .filter(Boolean)
      .join(', ')
    companyForm.city = res.localidade
    companyForm.state = res.uf
    cepStatus.value = 'ok'
    cepMessage.value = 'Endereço preenchido automaticamente.'
  } catch {
    cepStatus.value = 'error'
    cepMessage.value = 'Falha ao buscar CEP. Preencha manualmente.'
  }
}

watch(
  () => companyForm.zip,
  (val) => {
    if (val.replace(/\D/g, '').length === 8) lookupCep()
    else {
      cepStatus.value = 'idle'
      cepMessage.value = ''
    }
  }
)

const validate = (): boolean => {
  clearErrors()
  let isValid = true

  if (!companyForm.name || companyForm.name.trim().length < 3) {
    companyErrors.name = 'O nome deve ter pelo menos 3 caracteres.'
    isValid = false
  }

  if (
    companyForm.email
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)
  ) {
    companyErrors.email = 'Insira um e-mail válido.'
    isValid = false
  }

  if (companyForm.state && companyForm.state.length !== 2) {
    companyErrors.state = 'Estado deve ter 2 letras.'
    isValid = false
  }

  // CNPJ validation (optional check for 14 digits if provided)
  if (companyForm.document) {
    const cleanDoc = companyForm.document.replace(/\D/g, '')
    if (cleanDoc.length > 0 && cleanDoc.length !== 14) {
      companyErrors.document = 'O CNPJ deve ter 14 dígitos.'
      isValid = false
    }
  }

  return isValid
}

const loadingSave = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]

    // Validation: Size < 1MB, Type: Image
    if (file.size > 1024 * 1024) {
      toast.add({
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no máximo 1MB.',
        color: 'error'
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.add({
        title: 'Formato inválido',
        description: 'Selecione uma imagem válida (PNG, JPG).',
        color: 'error'
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        companyForm.logo = e.target.result as string
      }
    }
    reader.readAsDataURL(file)
  }
}

const removeLogo = () => {
  companyForm.logo = null
  if (fileInput.value) fileInput.value.value = ''
}

const handleSave = async () => {
  if (!validate()) return

  loadingSave.value = true
  try {
    await $fetch(`/api/companies/${props.companyId}`, {
      method: 'PUT',
      body: {
        name: companyForm.name.trim(),
        document: companyForm.document.replace(/\D/g, '') || undefined, // Document is usually required or not clearable
        email: companyForm.email.trim() || null,
        phone: companyForm.phone.trim() || null,
        address: companyForm.address.trim() || null,
        city: companyForm.city.trim() || null,
        state: companyForm.state?.trim() || null,
        zip: companyForm.zip.trim() || null,
        logo: companyForm.logo,
        active: companyForm.active,
        quickAccessEnabled: companyForm.quickAccessEnabled,
        quickAccessPin: companyForm.quickAccessPin.trim() || null,
        quickAccessCode: companyForm.quickAccessCode.trim() || null
      }
    })
    toast.add({
      title: 'Empresa atualizada',
      description: 'Os dados da empresa foram salvos.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    await refreshCompany()
    emit('updated')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingSave.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
        >
          <UIcon
            name="i-heroicons-building-office-2"
            class="w-5 h-5 text-primary-500"
          />
        </div>
        <div>
          <h2
            class="text-sm font-black uppercase tracking-widest text-zinc-400"
          >
            Dados da Empresa
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Informações cadastrais e de contato
          </p>
        </div>
      </div>
    </template>

    <div
      v-if="loadingCompany"
      class="space-y-4 p-1"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-10 rounded-xl"
      />
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <!-- Logo Upload -->
      <div
        class="flex items-center gap-6 p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20"
      >
        <div
          class="relative group cursor-pointer"
          @click="triggerFileInput"
        >
          <div
            class="w-24 h-24 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center bg-white dark:bg-zinc-900 overflow-hidden hover:border-primary-500 transition-colors"
          >
            <img
              v-if="companyForm.logo"
              :src="companyForm.logo"
              class="w-full h-full object-contain"
              alt="Logo da Empresa"
            >
            <UIcon
              v-else
              name="i-heroicons-photo"
              class="w-8 h-8 text-zinc-300 dark:text-zinc-600"
            />
          </div>

          <!-- Hover Overlay -->
          <div
            class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
          >
            <UIcon
              name="i-heroicons-pencil"
              class="w-6 h-6 text-white"
            />
          </div>
        </div>

        <div class="flex-1 space-y-3">
          <div>
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">
              Logo da Empresa
            </h3>
            <p class="text-xs text-zinc-500 mt-1">
              Exibido em orçamentos, relatórios e documentos.
            </p>
            <p class="text-xs text-zinc-400 mt-0.5">
              Recomendado: 200x200px, PNG ou JPG. Máx: 1MB.
            </p>
          </div>

          <div class="flex gap-2">
            <UButton
              color="white"
              variant="solid"
              size="xs"
              icon="i-heroicons-arrow-up-tray"
              @click="triggerFileInput"
            >
              Carregar Logo
            </UButton>
            <UButton
              v-if="companyForm.logo"
              color="red"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              @click="removeLogo"
            >
              Remover
            </UButton>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            class="hidden"
            @change="handleFileSelect"
          >
        </div>
      </div>

      <!-- Nome -->
      <UFormField
        label="Razão Social"
        required
        :error="companyErrors.name"
      >
        <UInput
          v-model="companyForm.name"
          placeholder="Nome da empresa"
          icon="i-heroicons-building-office-2"
          class="w-full"
          size="lg"
        />
      </UFormField>

      <!-- Documento (CNPJ) -->
      <UFormField
        label="CNPJ"
        :error="companyErrors.document"
      >
        <UInput
          v-model="companyForm.document"
          placeholder="00.000.000/0000-00"
          icon="i-heroicons-identification"
          class="w-full"
          size="lg"
        />
      </UFormField>

      <!-- Email + Phone -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="E-mail"
          :error="companyErrors.email"
        >
          <UInput
            v-model="companyForm.email"
            type="email"
            placeholder="contato@empresa.com.br"
            icon="i-heroicons-envelope"
            class="w-full"
            size="lg"
          />
        </UFormField>
        <UFormField label="Telefone">
          <UInput
            v-model="companyForm.phone"
            placeholder="(00) 00000-0000"
            icon="i-heroicons-phone"
            class="w-full"
            size="lg"
          />
        </UFormField>
      </div>

      <!-- CEP + State + City -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="CEP">
          <div class="relative">
            <UInput
              v-model="companyForm.zip"
              placeholder="00000-000"
              icon="i-heroicons-map-pin"
              class="w-full"
              size="lg"
            />
            <div
              v-if="cepStatus === 'loading'"
              class="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-4 h-4 text-zinc-400 animate-spin"
              />
            </div>
          </div>
          <p
            v-if="cepMessage"
            :class="
              cepStatus === 'ok'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            "
            class="text-xs mt-1"
          >
            {{ cepMessage }}
          </p>
        </UFormField>
        <UFormField label="Cidade">
          <UInput
            v-model="companyForm.city"
            placeholder="São Paulo"
            class="w-full"
            size="lg"
          />
        </UFormField>
        <UFormField
          label="Estado"
          :error="companyErrors.state"
        >
          <USelect
            v-model="companyForm.state"
            :items="BR_STATES"
            value-key="value"
            label-key="label"
            placeholder="UF"
            class="w-full"
            size="lg"
          />
        </UFormField>
      </div>

      <!-- Endereço -->
      <UFormField label="Endereço">
        <UInput
          v-model="companyForm.address"
          placeholder="Rua, número, bairro"
          icon="i-heroicons-map"
          class="w-full"
          size="lg"
        />
      </UFormField>

      <!-- Quick Access -->
      <div
        class="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">
              Agendamento Rápido (Mobile)
            </h3>
            <p class="text-xs text-zinc-500">
              Habilite uma página de agendamento simplificada acessível via PIN
              para seus vendedores.
            </p>
          </div>
          <USwitch v-model="companyForm.quickAccessEnabled" />
        </div>

        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-24"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-24"
          leave-to-class="opacity-0 -translate-y-2 max-h-0"
        >
          <div
            v-if="companyForm.quickAccessEnabled"
            class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                label="Código da Empresa"
                help="Crie um identificador único fácil (Ex: ABC)"
              >
                <UInput
                  v-model="companyForm.quickAccessCode"
                  placeholder="Ex: CONCRETO1"
                  icon="i-heroicons-hashtag"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="PIN de Acesso"
                help="Defina um PIN numérico de 4 a 6 dígitos"
              >
                <UInput
                  v-model="companyForm.quickAccessPin"
                  type="password"
                  placeholder="Ex: 1234"
                  icon="i-heroicons-key"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Save -->
      <div
        class="flex justify-end pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800"
      >
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-check"
          :loading="loadingSave"
          class="rounded-xl px-6 font-bold"
          @click="handleSave"
        >
          Salvar Alterações
        </UButton>
      </div>
    </div>
  </UCard>
</template>
