<script setup lang="ts">
const props = defineProps<{
  companyId: number | null
  user: any
  companyName?: string
}>()

const toast = useToast()

const { data: waData, refresh: refreshWA } = await useFetch<{
  settings: {
    apiUrl: string
    apiKey?: string | null
    phoneNumber?: string | null
    isConnected: boolean
    alertsEnabled: boolean
    reportsEnabled: boolean
    quotePdfToSeller: boolean
    quotePdfToCustomer: boolean
    schedulesReminderEnabled: boolean
    schedulesReminderLeadTimeHours: number
    schedulesReminderRecipients: string[]
    alertRecipients: string[]
    reportRecipients: string[]
    reportSchedule: 'daily' | 'weekly' | 'monthly'
    isGlobal: boolean
    useGlobal: boolean
  }
  isUsingGlobal: boolean
}>(() => `/api/whatsapp/settings?companyId=${props.companyId}`)

const waSettings = computed(() => waData.value?.settings ?? null)
const isUsingGlobal = computed(() => waData.value?.isUsingGlobal ?? false)

const REPORT_SCHEDULE_OPTS = [
  { label: 'Diário', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' }
]

const waForm = reactive({
  apiUrl: 'http://localhost:3025',
  apiKey: '',
  phoneNumber: '',
  alertsEnabled: false,
  reportsEnabled: false,
  quotePdfToSeller: false,
  quotePdfToCustomer: false,
  schedulesReminderEnabled: false,
  schedulesReminderLeadTimeHours: 24,
  schedulesReminderRecipients: [] as string[],
  alertRecipients: [] as string[],
  reportRecipients: [] as string[],
  reportSchedule: 'daily',
  isGlobal: false,
  useGlobal: false
})

watch(
  waSettings,
  (s) => {
    if (!s) return
    waForm.apiUrl = s.apiUrl ?? 'http://localhost:3025'
    waForm.apiKey = s.apiKey ?? ''
    waForm.phoneNumber = s.phoneNumber ?? ''
    waForm.alertsEnabled = s.alertsEnabled ?? false
    waForm.reportsEnabled = s.reportsEnabled ?? false
    waForm.quotePdfToSeller = s.quotePdfToSeller ?? false
    waForm.quotePdfToCustomer = s.quotePdfToCustomer ?? false
    waForm.schedulesReminderEnabled = s.schedulesReminderEnabled ?? false
    waForm.schedulesReminderLeadTimeHours
      = s.schedulesReminderLeadTimeHours ?? 24
    waForm.schedulesReminderRecipients = [
      ...(s.schedulesReminderRecipients ?? [])
    ]
    waForm.alertRecipients = [...(s.alertRecipients ?? [])]
    waForm.reportRecipients = [...(s.reportRecipients ?? [])]
    waForm.reportSchedule = s.reportSchedule ?? 'daily'
    waForm.isGlobal = s.isGlobal ?? false
    waForm.useGlobal = s.useGlobal ?? false
  },
  { immediate: true }
)

const showApiKey = ref(false)
const waTestNum = ref('')
const loadingSave = ref(false)
const loadingConnect = ref(false)
const loadingDisconnect = ref(false)
const loadingTestPing = ref(false)
const loadingTestMsg = ref(false)
const loadingReport = ref(false)

const handleSave = async () => {
  loadingSave.value = true
  try {
    await $fetch(`/api/whatsapp/settings?companyId=${props.companyId}`, {
      method: 'PUT',
      body: {
        apiUrl: waForm.apiUrl,
        apiKey: waForm.apiKey,
        phoneNumber: waForm.phoneNumber || undefined,
        alertsEnabled: waForm.alertsEnabled,
        reportsEnabled: waForm.reportsEnabled,
        quotePdfToSeller: waForm.quotePdfToSeller,
        quotePdfToCustomer: waForm.quotePdfToCustomer,
        schedulesReminderEnabled: waForm.schedulesReminderEnabled,
        schedulesReminderLeadTimeHours: Number(
          waForm.schedulesReminderLeadTimeHours
        ),
        schedulesReminderRecipients:
          waForm.schedulesReminderRecipients.filter(Boolean),
        isGlobal: waForm.isGlobal,
        useGlobal: waForm.useGlobal,
        alertRecipients: waForm.alertRecipients.filter(Boolean),
        reportRecipients: waForm.reportRecipients.filter(Boolean),
        reportSchedule: waForm.reportSchedule
      }
    })
    toast.add({
      title: 'WhatsApp salvo',
      description: 'Configurações de WhatsApp atualizadas.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    await refreshWA()
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

const handleConnect = async () => {
  loadingConnect.value = true
  try {
    const res = await $fetch<{ ok: boolean, message: string }>(
      `/api/whatsapp/connect?companyId=${props.companyId}`,
      { method: 'POST' }
    )
    toast.add({
      title: res.ok ? 'Conectado' : 'Atenção',
      description: res.message,
      color: res.ok ? 'success' : 'warning',
      icon: res.ok
        ? 'i-heroicons-check-circle'
        : 'i-heroicons-exclamation-triangle'
    })
    await refreshWA()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro',
      description: err?.data?.message ?? err?.message ?? 'Falha ao conectar.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingConnect.value = false
  }
}

const handleDisconnect = async () => {
  loadingDisconnect.value = true
  try {
    await $fetch(`/api/whatsapp/disconnect?companyId=${props.companyId}`, {
      method: 'POST'
    })
    toast.add({
      title: 'Desconectado',
      description: 'WhatsApp desconectado com sucesso.',
      color: 'info',
      icon: 'i-heroicons-information-circle'
    })
    await refreshWA()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro',
      description:
        err?.data?.message ?? err?.message ?? 'Falha ao desconectar.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingDisconnect.value = false
  }
}

const handleTestPing = async () => {
  loadingTestPing.value = true
  try {
    const res = await $fetch<{ ok: boolean, message: string }>(
      `/api/whatsapp/test?companyId=${props.companyId}`,
      { method: 'POST', body: { mode: 'ping' } }
    )
    toast.add({
      title: res.ok ? 'API acessível' : 'Falha',
      description: res.message,
      color: res.ok ? 'success' : 'error',
      icon: res.ok
        ? 'i-heroicons-check-circle'
        : 'i-heroicons-exclamation-circle'
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro',
      description: err?.data?.message ?? err?.message ?? 'Falha ao testar.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingTestPing.value = false
  }
}

const handleTestMessage = async () => {
  if (!waTestNum.value || !/^\+\d{5,15}$/.test(waTestNum.value)) {
    toast.add({
      title: 'Número inválido',
      description: 'Use o formato +5511999999999',
      color: 'warning',
      icon: 'i-heroicons-exclamation-triangle'
    })
    return
  }
  loadingTestMsg.value = true
  try {
    const res = await $fetch<{ ok: boolean, message: string }>(
      `/api/whatsapp/test?companyId=${props.companyId}`,
      {
        method: 'POST',
        body: { mode: 'message', toNumber: waTestNum.value }
      }
    )
    toast.add({
      title: res.ok ? 'Mensagem enviada' : 'Falha',
      description: res.message,
      color: res.ok ? 'success' : 'error',
      icon: res.ok
        ? 'i-heroicons-check-circle'
        : 'i-heroicons-exclamation-circle'
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro',
      description: err?.data?.message ?? err?.message ?? 'Falha ao enviar.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingTestMsg.value = false
  }
}

const handleSendReport = async () => {
  loadingReport.value = true
  try {
    const res = await $fetch<{ ok: boolean, message: string }>(
      `/api/whatsapp/report?companyId=${props.companyId}`,
      {
        method: 'POST',
        body: { companyName: props.companyName ?? 'Meu Concreto' }
      }
    )
    toast.add({
      title: res.ok ? 'Relatório enviado' : 'Falha',
      description: res.message,
      color: res.ok ? 'success' : 'error',
      icon: res.ok
        ? 'i-heroicons-check-circle'
        : 'i-heroicons-exclamation-circle'
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro',
      description:
        err?.data?.message ?? err?.message ?? 'Falha ao enviar relatório.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingReport.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0"
        >
          <UIcon
            name="i-simple-icons-whatsapp"
            class="w-5 h-5 text-green-500"
          />
        </div>
        <div>
          <h2
            class="text-sm font-black uppercase tracking-widest text-zinc-400"
          >
            WhatsApp
          </h2>
          <div class="flex items-center gap-2 mt-0.5">
            <p class="text-xs text-zinc-400">
              Alertas automáticos e relatórios
            </p>
            <UBadge
              v-if="isUsingGlobal"
              color="primary"
              variant="soft"
              size="xs"
            >
              Global
            </UBadge>
          </div>
        </div>
        <UBadge
          :color="waSettings?.isConnected ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
          class="ml-auto shrink-0"
        >
          {{ waSettings?.isConnected ? "Conectado" : "Desconectado" }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Admin Only: Global Instance Provider Setting -->
      <div
        v-if="user?.role === 'admin'"
        class="p-4 rounded-xl border transition-colors duration-200"
        :class="
          waForm.isGlobal
            ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/10 dark:border-primary-800/30'
            : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700'
        "
      >
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-server-stack"
                class="w-5 h-5 text-primary-500"
              />
              <p class="text-sm font-bold text-zinc-900 dark:text-white">
                Provedor Global de WhatsApp
              </p>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
              Define esta empresa como a provedora oficial da conexão WhatsApp
              para todo o sistema.
              <span
                v-if="waForm.isGlobal"
                class="block mt-1 font-medium text-primary-600 dark:text-primary-400"
              >
                Outras empresas podem optar por usar esta conexão compartilhada.
              </span>
            </p>
          </div>
          <USwitch
            v-model="waForm.isGlobal"
            color="primary"
            size="md"
          />
        </div>
      </div>

      <!-- Option: Use Global Instance -->
      <div
        v-if="isUsingGlobal && !waForm.isGlobal"
        class="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div
              class="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-300"
            >
              <UIcon
                name="i-heroicons-globe-alt"
                class="w-5 h-5"
              />
            </div>
            <div>
              <p class="text-sm font-bold text-blue-900 dark:text-blue-100">
                Usar Conexão Compartilhada
              </p>
              <p
                class="text-xs text-blue-700/80 dark:text-blue-300/70 mt-1 max-w-sm"
              >
                Em vez de conectar um WhatsApp próprio, utilize a conexão da
                Instância Global configurada pelo administrador.
              </p>
            </div>
          </div>
          <USwitch
            v-model="waForm.useGlobal"
            color="primary"
            size="md"
          />
        </div>

        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-20"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-20"
          leave-to-class="opacity-0 -translate-y-2 max-h-0"
        >
          <div
            v-if="!waForm.useGlobal"
            class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/30"
          >
            <p
              class="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4"
              />
              Configure abaixo a sua conexão própria.
            </p>
          </div>
        </Transition>
      </div>

      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity"
        :class="{ 'opacity-40 pointer-events-none': waForm.useGlobal }"
      >
        <UFormField
          label="URL da API"
          class="md:col-span-2"
        >
          <UInput
            v-model="waForm.apiUrl"
            placeholder="http://localhost:3025"
            icon="i-heroicons-globe-alt"
            class="w-full"
            size="lg"
            :disabled="user?.role !== 'admin'"
          />
        </UFormField>

        <UFormField label="API Key">
          <div class="flex gap-2">
            <UInput
              v-model="waForm.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Sua chave de API"
              icon="i-heroicons-key"
              class="w-full"
              size="lg"
              :disabled="user?.role !== 'admin'"
            />
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="user?.role !== 'admin'"
              size="sm"
              :icon="showApiKey ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              @click="showApiKey = !showApiKey"
            />
          </div>
        </UFormField>

        <UFormField label="Número Remetente (WhatsApp)">
          <UInput
            v-model="waForm.phoneNumber"
            placeholder="+5511999999999"
            icon="i-heroicons-phone"
            class="w-full"
            size="lg"
            :disabled="user?.role !== 'admin'"
          />
        </UFormField>
      </div>

      <!-- Connection controls -->
      <div
        v-if="user?.role === 'admin' && !waForm.useGlobal"
        class="flex flex-wrap gap-2 pt-1"
      >
        <UButton
          color="success"
          variant="soft"
          icon="i-simple-icons-whatsapp"
          :loading="loadingConnect"
          @click="handleConnect"
        >
          Conectar
        </UButton>
        <UButton
          color="error"
          variant="soft"
          icon="i-heroicons-power"
          :loading="loadingDisconnect"
          :disabled="!waSettings?.isConnected"
          @click="handleDisconnect"
        >
          Desconectar
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-wifi"
          :loading="loadingTestPing"
          @click="handleTestPing"
        >
          Testar API
        </UButton>
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-800" />

      <!-- Alertas -->
      <div class="space-y-4">
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            Alertas em Tempo Real
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Notificar ao registrar nova venda ou orçamento
          </p>
        </div>

        <div class="space-y-3">
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-bell"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ativar Alertas
                </p>
                <p class="text-xs text-zinc-400">
                  Envio imediato para os números configurados
                </p>
              </div>
            </div>
            <USwitch
              v-model="waForm.alertsEnabled"
              color="success"
            />
          </div>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div
              v-if="waForm.alertsEnabled"
              class="space-y-3 overflow-hidden"
            >
              <div class="px-3 pt-2">
                <p
                  class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2"
                >
                  Destinatários dos Alertas
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(_, i) in waForm.alertRecipients"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <UInput
                      v-model="waForm.alertRecipients[i]"
                      icon="i-heroicons-phone"
                      placeholder="+55 (00) 00000-0000"
                      class="flex-1"
                      size="lg"
                    />
                    <UButton
                      color="error"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-trash"
                      @click="waForm.alertRecipients.splice(i, 1)"
                    />
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-plus"
                    class="w-full justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-2"
                    @click="waForm.alertRecipients.push('')"
                  >
                    Adicionar número
                  </UButton>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-800" />

      <!-- Reports -->
      <div class="space-y-4">
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            Relatórios Automáticos
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Envio periódico de resumo financeiro do período
          </p>
        </div>

        <div class="space-y-3">
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-chart-bar"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ativar Relatórios
                </p>
                <p class="text-xs text-zinc-400">
                  Resumo de caixa e faturamento agendado
                </p>
              </div>
            </div>
            <USwitch
              v-model="waForm.reportsEnabled"
              color="success"
            />
          </div>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div
              v-if="waForm.reportsEnabled"
              class="space-y-4 overflow-hidden"
            >
              <div class="px-3 pt-2 space-y-4">
                <UFormField label="Frequência do Envio">
                  <USelect
                    v-model="waForm.reportSchedule"
                    :items="REPORT_SCHEDULE_OPTS"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    size="lg"
                  />
                </UFormField>

                <div class="space-y-2">
                  <p
                    class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2"
                  >
                    Destinatários dos Relatórios
                  </p>
                  <div
                    v-for="(_, i) in waForm.reportRecipients"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <UInput
                      v-model="waForm.reportRecipients[i]"
                      icon="i-heroicons-phone"
                      placeholder="+55 (00) 00000-0000"
                      class="flex-1"
                      size="lg"
                    />
                    <UButton
                      color="error"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-trash"
                      @click="waForm.reportRecipients.splice(i, 1)"
                    />
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-plus"
                    size="sm"
                    class="w-full justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-2"
                    @click="waForm.reportRecipients.push('')"
                  >
                    Adicionar número
                  </UButton>
                </div>

                <UButton
                  color="success"
                  variant="soft"
                  icon="i-heroicons-paper-airplane"
                  :loading="loadingReport"
                  class="w-full"
                  @click="handleSendReport"
                >
                  Enviar Relatório Agora
                </UButton>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-800" />

      <!-- Orçamentos -->
      <div class="space-y-4">
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            Envio de Orçamentos (PDF)
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Enviar arquivo PDF profissional automaticamente via WhatsApp
          </p>
        </div>

        <div class="space-y-3">
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-user"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Enviar para o Vendedor
                </p>
                <p class="text-xs text-zinc-400">
                  PDF contendo logo e marca d'água
                </p>
              </div>
            </div>
            <USwitch
              v-model="waForm.quotePdfToSeller"
              color="success"
            />
          </div>

          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-users"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Enviar para o Cliente
                </p>
                <p class="text-xs text-zinc-400">
                  Automatiza entrega profissional ao concluir
                </p>
              </div>
            </div>
            <USwitch
              v-model="waForm.quotePdfToCustomer"
              color="success"
            />
          </div>
        </div>
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-800" />

      <!-- Scheduling Reminders -->
      <div class="space-y-4">
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            Lembretes de Agendamento
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Enviar alertas automáticos para as datas programadas
          </p>
        </div>

        <div class="space-y-3">
          <div
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="w-4 h-4 text-primary-500"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ativar Lembretes
                </p>
                <p class="text-xs text-zinc-400">
                  Envia lembrete aos números configurados
                </p>
              </div>
            </div>
            <USwitch
              v-model="waForm.schedulesReminderEnabled"
              color="success"
            />
          </div>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-2 max-h-0"
          >
            <div
              v-if="waForm.schedulesReminderEnabled"
              class="space-y-3 overflow-hidden"
            >
              <div class="px-3 pt-2">
                <div class="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p
                      class="text-xs font-black uppercase tracking-widest text-zinc-400"
                    >
                      Tempo de Antecedência
                    </p>
                    <p class="text-xs text-zinc-400">
                      Ex: 24 horas antes da entrega
                    </p>
                  </div>
                  <UInput
                    v-model="waForm.schedulesReminderLeadTimeHours"
                    type="number"
                    size="lg"
                    class="w-24"
                    suffix="horas"
                  />
                </div>

                <p
                  class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2"
                >
                  Destinatários dos Agendamentos
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(_, i) in waForm.schedulesReminderRecipients"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <UInput
                      v-model="waForm.schedulesReminderRecipients[i]"
                      icon="i-heroicons-phone"
                      placeholder="+55 (00) 00000-0000"
                      class="flex-1"
                      size="lg"
                    />
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="sm"
                      @click="waForm.schedulesReminderRecipients.splice(i, 1)"
                    />
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-plus"
                    size="sm"
                    class="w-full justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-2"
                    @click="waForm.schedulesReminderRecipients.push('')"
                  >
                    Adicionar número
                  </UButton>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-800" />

      <!-- Test message -->
      <div class="space-y-4">
        <div>
          <p class="text-sm font-bold text-zinc-900 dark:text-white">
            Mensagem de Teste
          </p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Valide sua conexão enviando uma mensagem manual para um número
          </p>
        </div>
        <div class="flex gap-2">
          <UInput
            v-model="waTestNum"
            placeholder="+55 (00) 00000-0000"
            icon="i-heroicons-chat-bubble-left-right"
            size="lg"
            class="flex-1"
          />
          <UButton
            color="success"
            size="lg"
            icon="i-heroicons-paper-airplane"
            :loading="loadingTestMsg"
            @click="handleTestMessage"
          >
            Enviar
          </UButton>
        </div>
      </div>

      <!-- Save -->
      <div
        class="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800"
      >
        <UButton
          color="primary"
          icon="i-heroicons-check"
          size="md"
          class="px-6 shadow-lg shadow-primary-500/20"
          :loading="loadingSave"
          @click="handleSave"
        >
          Salvar Configurações
        </UButton>
      </div>
    </div>
  </UCard>
</template>
