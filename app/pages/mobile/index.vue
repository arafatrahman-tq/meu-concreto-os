<script setup lang="ts">
import { reactive, ref } from 'vue'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Acesso Rápido | Mobile' })

const router = useRouter()
const toast = useToast()
const { setUser } = useAuth()

// Lembrar Empresa
const rememberedCode = useCookie('mc_mobile_code', {
  maxAge: 60 * 60 * 24 * 30
})
const rememberMe = ref(!!rememberedCode.value)

const form = reactive({
  code: rememberedCode.value || '',
  pin: [] as number[] // UPinInput com type="number" exige number[]
})

const { data: companiesList, pending: loadingCompanies } = await useFetch<any[]>('/api/auth/mobile-companies')

const loading = ref(false)

// Estado Reativo de Erros
const formErrors = reactive<Record<string, string>>({})
const clearErrors = () => {
  for (const key in formErrors) delete formErrors[key]
}

const handleLogin = async () => {
  clearErrors()
  let isValid = true

  if (!form.code) {
    formErrors.code = 'Selecione uma empresa.'
    isValid = false
  }

  // O PIN deve ter 4 dígitos exatos
  const pinString = form.pin.join('')
  if (pinString.length !== 4) {
    formErrors.pin = 'O PIN deve conter 4 dígitos.'
    isValid = false
  }

  if (!isValid) return

  loading.value = true
  try {
    const res = await $fetch<{ user: any, companies: any[] }>('/api/auth/mobile-login', {
      method: 'POST',
      body: {
        code: form.code,
        pin: pinString
      }
    })

    if (rememberMe.value) {
      rememberedCode.value = form.code
    } else {
      rememberedCode.value = null
    }

    setUser(res.user, res.companies)
    window.location.href = '/mobile/agendar'
  } catch (e: any) {
    // Retorna o erro em vermelho direto no input do PIN
    formErrors.pin = e.data?.message || 'Código ou PIN inválidos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-sm mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex justify-center pt-2">
      <AppLogo
        :square="true"
        class="w-12 h-12"
      />
    </div>

    <div class="space-y-5">
      <!-- Seletor de Empresa -->
      <UFormField
        label="Selecionar Empresa"
        :error="formErrors.code || (!companiesList?.length && !loadingCompanies ? 'Nenhuma empresa disponível' : undefined)"
        required
      >
        <USelectMenu
          v-model="form.code"
          :items="companiesList || []"
          value-key="code"
          label-key="name"
          placeholder="Escolha sua empresa..."
          size="lg"
          :loading="loadingCompanies"
          icon="i-heroicons-building-office"
          class="w-full"
          :ui="{ base: 'h-12' }"
        />
      </UFormField>

      <!-- PIN Code Input Nativo do Nuxt UI -->
      <UFormField
        label="PIN de Acesso"
        :error="formErrors.pin"
        required
        class="flex flex-col items-center text-center"
      >
        <!-- 'otp' prop permite que iOS/Android preencham auto. a senha -->
        <!-- 'mask' converte os números digitados em '•' -->
        <UPinInput
          v-model="form.pin"
          :length="4"
          type="number"
          size="xl"
          mask
          otp
          placeholder="○"
          @complete="handleLogin"
        />
      </UFormField>

      <div class="flex items-center gap-2 py-2">
        <UCheckbox
          v-model="rememberMe"
          label="Lembrar empresa neste celular"
        />
      </div>

      <div class="pt-2">
        <UButton
          block
          size="xl"
          color="primary"
          label="Acessar Painel"
          icon="i-heroicons-arrow-right-circle"
          class="rounded-2xl h-14 font-bold text-lg shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
          :loading="loading"
          @click="handleLogin"
        />
      </div>
    </div>

    <!-- Footer support -->
    <p class="text-center text-xs font-bold text-zinc-500 mt-20">
      Precisa de ajuda? <br>
      Fale com o gerente da sua empresa.
    </p>
  </div>
</template>
