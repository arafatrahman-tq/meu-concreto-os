<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrar | Meu Concreto' })

// 1. Definition of the validation schema
const schema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  remember: z.boolean()
})

type Schema = z.output<typeof schema>
const state = reactive({ email: '', password: '', remember: false })
const loading = ref(false)
const showPassword = ref(false)
const formRef = ref()

const router = useRouter()
const { setUser } = useAuth()

const savedEmail = useCookie('mc_remember_email', {
  maxAge: 60 * 60 * 24 * 30
}) // 30 days

onMounted(() => {
  if (savedEmail.value) {
    state.email = savedEmail.value
    state.remember = true
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: event.data
    })

    if (state.remember) {
      savedEmail.value = state.email
    } else {
      savedEmail.value = null
    }

    setUser((data as any).user, (data as any).companies ?? [])
    await router.push('/')
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode

    // Server-side error mapping using setErrors
    if (status === 401) {
      formRef.value.setErrors([
        { name: 'password', message: 'E-mail ou senha incorretos.' }
      ])
    } else if (status === 403) {
      formRef.value.setErrors([
        {
          name: 'email',
          message: 'Acesso negado: dispositivo não autorizado.'
        }
      ])
    } else if (status === 400) {
      formRef.value.setErrors([
        { name: 'email', message: 'Preencha todos os campos corretamente.' }
      ])
    } else {
      formRef.value.setErrors([
        {
          name: 'email',
          message: 'Erro ao conectar ao servidor. Tente novamente.'
        }
      ])
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Full-viewport container with professional background image -->
  <div
    class="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 p-6"
    style="
      background-image: url(&quot;/login-hero.jpg&quot;);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    "
  >
    <!-- Multi-layered overlay for depth and readability -->
    <div
      class="absolute inset-0 bg-linear-to-br from-primary-950/80 via-zinc-950/70 to-emerald-950/80 lg:opacity-90"
    />
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.4)_100%)]"
    />

    <!-- Content container -->
    <div
      class="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12 xl:gap-24"
    >
      <!-- ─── LEFT PANEL — Branding & Slogan ──────────────────────── -->
      <div class="hidden lg:flex flex-col flex-1 text-white">
        <!-- Logo -->
        <div class="flex items-center gap-4 mb-12">
          <div
            class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl ring-1 ring-white/30"
          >
            <UIcon
              name="i-lucide-anvil"
              class="w-8 h-8 text-white"
            />
          </div>
          <div class="flex flex-col leading-none">
            <span class="text-2xl font-black tracking-tighter uppercase">MEU<span class="text-white/60">CONCRETO</span></span>
            <span
              class="text-[10px] font-bold text-white/50 uppercase tracking-[0.4em]"
            >OPERATIONAL SYSTEM</span>
          </div>
        </div>

        <!-- Headline -->
        <div class="space-y-6">
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/20 backdrop-blur-sm border border-primary-400/30"
          >
            <div class="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span
              class="text-[10px] font-black uppercase tracking-widest text-primary-200"
            >Plataforma de Gestão</span>
          </div>
          <h1 class="text-5xl xl:text-6xl font-black leading-tight">
            Gestão inteligente<br>
            <span class="text-primary-400">para sua</span><br>
            concreteira.
          </h1>
          <p class="text-lg text-white/70 leading-relaxed max-w-lg">
            Sua operação em tempo real: orçamentos, vendas, logística e
            financeiro em um só lugar.
          </p>
        </div>

        <!-- Feature List -->
        <div class="mt-12 grid grid-cols-2 gap-6 pb-2">
          <div
            v-for="feat in [
              {
                icon: 'i-heroicons-bolt',
                title: 'Agilidade',
                desc: 'Processamento instantâneo'
              },
              {
                icon: 'i-heroicons-shield-check',
                title: 'Segurança',
                desc: 'Dados protegidos e backups'
              },
              {
                icon: 'i-heroicons-chart-bar',
                title: 'Estatísticas',
                desc: 'Dashboard completo'
              },
              {
                icon: 'i-heroicons-map',
                title: 'Logística',
                desc: 'Controle de agendamentos'
              }
            ]"
            :key="feat.title"
            class="flex gap-4"
          >
            <div
              class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10"
            >
              <UIcon
                :name="feat.icon"
                class="w-5 h-5"
              />
            </div>
            <div>
              <p class="text-sm font-bold">
                {{ feat.title }}
              </p>
              <p class="text-[11px] text-white/50 leading-tight mt-0.5">
                {{ feat.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── RIGHT PANEL — Login Form ────────────────────────────── -->
      <div class="w-full max-w-md lg:shrink-0 transform lg:translate-y-4">
        <!-- Mobile Logo -->
        <div class="lg:hidden flex flex-col items-center mb-10">
          <div
            class="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg mb-4"
          >
            <UIcon
              name="i-lucide-anvil"
              class="w-7 h-7 text-white"
            />
          </div>
          <h2 class="text-xl font-black text-white uppercase tracking-widest">
            MEU CONCRETO
          </h2>
        </div>

        <!-- Form Card -->
        <div
          class="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-8 lg:p-10 rounded-4xl shadow-2xl border border-white/20 relative overflow-hidden"
        >
          <!-- Subtle top gradient bar -->
          <div
            class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary-500 to-emerald-500"
          />

          <!-- Header -->
          <div class="mb-10 text-center lg:text-left">
            <h2
              class="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight"
            >
              Login
            </h2>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Acesse sua conta para gerenciar sua operação
            </p>
          </div>

          <!-- Refined Form Area with UForm -->
          <UForm
            ref="formRef"
            :schema="schema"
            :state="state"
            class="space-y-6"
            @submit="onSubmit"
          >
            <!-- E-MAIL -->
            <UFormField
              label="Endereço de E-mail"
              name="email"
              eager-validation
              :ui="{
                label:
                  'text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400'
              }"
            >
              <UInput
                v-model="state.email"
                type="email"
                placeholder="exemplo@suaempresa.com"
                icon="i-heroicons-envelope"
                size="lg"
                class="w-full rounded-2xl"
                :disabled="loading"
              />
            </UFormField>

            <!-- SENHA -->
            <UFormField
              label="Senha de Acesso"
              name="password"
              eager-validation
              :ui="{
                label:
                  'text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400'
              }"
            >
              <UInput
                v-model="state.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                icon="i-heroicons-lock-closed"
                size="lg"
                class="w-full rounded-2xl"
                :disabled="loading"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    :icon="
                      showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                    "
                    class="cursor-pointer hover:text-primary-500 transition-colors"
                    :padded="false"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <!-- LEMBRAR / ESQUECI SENHA -->
            <div class="flex items-center justify-between py-1">
              <UCheckbox
                v-model="state.remember"
                label="Lembrar acesso"
                :disabled="loading"
                :ui="{
                  label:
                    'text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer',
                  container: 'flex items-center gap-2',
                  base: 'rounded-sm focus:ring-primary-500 text-primary-500'
                }"
              />
              <UButton
                label="Esqueceu a senha?"
                variant="link"
                color="neutral"
                size="xs"
                class="text-[10px] font-black uppercase tracking-widest p-0 hover:text-primary-500"
                to="/forgot-password"
              />
            </div>

            <!-- SUBMIT BUTTON -->
            <UButton
              type="submit"
              block
              size="xl"
              :loading="loading"
              icon="i-heroicons-arrow-right-end-on-rectangle"
              class="rounded-2xl py-6 font-black uppercase tracking-[0.2em] shadow-lg shadow-primary-500/20"
            >
              {{ loading ? "Autenticando..." : "Entrar no Sistema" }}
            </UButton>
          </UForm>
        </div>

        <p
          class="mt-8 text-[10px] font-bold text-white/30 dark:text-zinc-600 uppercase tracking-[0.3em] text-center"
        >
          © 2026 MEU CONCRETO — TECNOLOGIA OPERACIONAL
        </p>
      </div>
    </div>
  </div>
</template>
