<script setup lang="ts">
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

definePageMeta({ layout: "default" });
useSeoMeta({ title: "Agendamentos | Meu Concreto" });

const { companyId, user } = useAuth();
const toast = useToast();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type ScheduleStatus = "pending" | "confirmed" | "completed" | "cancelled";
type ScheduleType =
  | "concrete_delivery"
  | "pump_service"
  | "site_visit"
  | "other";

interface Schedule {
  id: number;
  title: string;
  description?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  location?: string | null;
  status: ScheduleStatus;
  type: ScheduleType;
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  whatsappSent: boolean;
  saleId?: number | null;
  companyId: number;
  userId: number;
  createdAt: string;
  user?: {
    name: string;
  };
}

interface ScheduleForm {
  id?: number;
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  location: string;
  status: ScheduleStatus;
  type: ScheduleType;
  date: string;
  startTime: string;
  endTime: string;
  saleId: number | null;
}

// ─────────────────────────────────────────────
// Data Handling
// ─────────────────────────────────────────────
const {
  data: schedulesData,
  pending,
  refresh,
} = await useFetch("/api/schedules", {
  query: computed(() => ({ companyId: companyId.value })),
});

const schedules = computed(() => schedulesData.value?.schedules || []);

// ─────────────────────────────────────────────
// UI State
// ─────────────────────────────────────────────
const isOpen = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const searchTerm = ref("");
const statusFilter = ref<ScheduleStatus | "all">("all");
const typeFilter = ref<ScheduleType | "all">("all");

// Delete modal
const isDeleteModalOpen = ref(false);
const deleteTarget = ref<Schedule | null>(null);
const loadingDelete = ref(false);
const loadingWhatsapp = ref<number | null>(null);

const defaultForm: ScheduleForm = {
  id: undefined,
  title: "",
  description: "",
  customerName: "",
  customerPhone: "",
  location: "",
  status: "pending",
  type: "concrete_delivery",
  date: new Date().toLocaleDateString("sv"),
  startTime: "08:00",
  endTime: "10:00",
  saleId: null,
};

const form = ref<ScheduleForm>({ ...defaultForm });

// 1. Estado Reativo de Erros
const formErrors = reactive<Record<string, string>>({});

// 2. Limpar Erros
const clearErrors = () => {
  for (const key in formErrors) {
    delete formErrors[key];
  }
};

// 3. Função de Validação
const validateForm = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!form.value.title || form.value.title.trim().length < 3) {
    formErrors.title = "O título deve ter pelo menos 3 caracteres.";
    isValid = false;
  }

  if (!form.value.date) {
    formErrors.date = "A data é obrigatória.";
    isValid = false;
  }

  if (!form.value.type) {
    formErrors.type = "Selecione o tipo de agendamento.";
    isValid = false;
  }

  if (!form.value.status) {
    formErrors.status = "Selecione o status.";
    isValid = false;
  }

  return isValid;
};

// 4. Limpar erros ao fechar/abrir
watch(isOpen, (val) => {
  if (!val) clearErrors();
});

const filteredSchedules = computed(() => {
  return schedules.value.filter((s: Schedule) => {
    const matchStatus =
      statusFilter.value === "all" || s.status === statusFilter.value;
    const matchType = typeFilter.value === "all" || s.type === typeFilter.value;
    const matchSearch =
      !searchTerm.value ||
      s.title.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(searchTerm.value.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });
});

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────
const stats = computed(() => {
  const all = schedules.value as Schedule[];
  return {
    total: all.length,
    pending: all.filter((s) => s.status === "pending").length,
    confirmed: all.filter((s) => s.status === "confirmed").length,
    completed: all.filter((s) => s.status === "completed").length,
  };
});

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────
const openCreate = () => {
  isEditing.value = false;
  form.value = { ...defaultForm };
  isOpen.value = true;
};

const openEdit = (schedule: Schedule) => {
  isEditing.value = true;
  form.value = {
    id: schedule.id,
    title: schedule.title,
    description: schedule.description || "",
    customerName: schedule.customerName || "",
    customerPhone: schedule.customerPhone || "",
    location: schedule.location || "",
    status: schedule.status,
    type: schedule.type,
    date: new Date(schedule.date).toLocaleDateString("sv"),
    startTime: schedule.startTime || "08:00",
    endTime: schedule.endTime || "10:00",
    saleId: schedule.saleId || null,
  };
  isOpen.value = true;
};

const saveSchedule = async () => {
  if (!validateForm()) return;
  isSaving.value = true;
  try {
    const payload = {
      ...form.value,
      companyId: companyId.value,
      userId: user.value?.id,
      date: `${form.value.date}T12:00:00.000Z`,
    };

    if (isEditing.value && form.value.id) {
      await $fetch(`/api/schedules/${form.value.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.add({
        title: "Sucesso",
        description: "Agendamento atualizado",
        color: "success",
      });
    } else {
      await $fetch("/api/schedules", {
        method: "POST",
        body: payload,
      });
      toast.add({
        title: "Sucesso",
        description: "Agendamento criado e notificação enviada",
        color: "success",
      });
    }

    isOpen.value = false;
    refresh();
  } catch (err: any) {
    toast.add({
      title: "Erro",
      description:
        err.data?.message || err.message || "Erro ao salvar agendamento",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = (schedule: Schedule) => {
  deleteTarget.value = schedule;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  loadingDelete.value = true;
  try {
    await $fetch(`/api/schedules/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    isDeleteModalOpen.value = false;
    toast.add({
      title: "Agendamento excluído",
      description: `"${deleteTarget.value.title}" foi removido.`,
      color: "neutral",
      icon: "i-heroicons-trash",
    });
    refresh();
  } catch {
    toast.add({
      title: "Erro",
      description: "Falha ao remover agendamento.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingDelete.value = false;
    deleteTarget.value = null;
  }
};
const sendScheduleWhatsapp = async (schedule: Schedule) => {
  loadingWhatsapp.value = schedule.id;
  try {
    const res = await $fetch(`/api/schedules/${schedule.id}/send-whatsapp`, {
      method: "POST",
    });

    if (res.ok) {
      toast.add({
        title: "Notificação Enviada",
        description: res.message,
        color: "success",
        icon: "i-simple-icons-whatsapp",
      });
      refresh();
    } else {
      throw new Error(res.message);
    }
  } catch (err: any) {
    toast.add({
      title: "Erro ao Enviar",
      description:
        err.data?.message || err.message || "Falha na conexão com WhatsApp",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loadingWhatsapp.value = null;
  }
};
// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────
const formatDateFull = (date: string | Date) =>
  format(new Date(date), "dd MMM yyyy", { locale: ptBR });

const getStatusColor = (status: ScheduleStatus) => {
  switch (status) {
    case "completed":
      return "success";
    case "confirmed":
      return "info";
    case "pending":
      return "warning";
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
};

const getStatusLabel = (status: ScheduleStatus) => {
  switch (status) {
    case "completed":
      return "Concluído";
    case "confirmed":
      return "Confirmado";
    case "pending":
      return "Pendente";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
};

const getTypeLabel = (type: ScheduleType) => {
  switch (type) {
    case "concrete_delivery":
      return "Entrega Concreto";
    case "pump_service":
      return "Serviço Bomba";
    case "site_visit":
      return "Visita Técnica";
    case "other":
      return "Outro";
    default:
      return type;
  }
};

const getTypeIcon = (type: ScheduleType) => {
  switch (type) {
    case "concrete_delivery":
      return "i-lucide-truck";
    case "pump_service":
      return "i-lucide-pipette";
    case "site_visit":
      return "i-heroicons-map-pin";
    default:
      return "i-heroicons-calendar";
  }
};
</script>

<template>
  <div class="p-6 lg:p-8 space-y-6">
    <!-- Page Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Agendamentos
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie entregas e serviços programados
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        size="md"
        class="shrink-0"
        @click="openCreate"
      >
        Novo Agendamento
      </UButton>
    </div>

    <!-- ── KPI Strip ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div
        v-for="(kpi, i) in [
          {
            label: 'Total',
            value: stats.total,
            suffix: 'agendamentos',
            icon: 'i-heroicons-calendar',
            color: 'text-primary-500',
            bg: 'bg-primary-50 dark:bg-primary-500/10',
          },
          {
            label: 'Pendentes',
            value: stats.pending,
            suffix: 'aguardando',
            icon: 'i-heroicons-clock',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
          },
          {
            label: 'Confirmados',
            value: stats.confirmed,
            suffix: 'confirmados',
            icon: 'i-heroicons-check-badge',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
          },
          {
            label: 'Concluídos',
            value: stats.completed,
            suffix: 'realizados',
            icon: 'i-heroicons-check-circle',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
        ]"
        :key="i"
        class="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight"
          >
            {{ kpi.label }}
          </span>
          <div
            :class="[
              kpi.bg,
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            ]"
          >
            <UIcon :name="kpi.icon" :class="['w-5 h-5', kpi.color]" />
          </div>
        </div>
        <p
          class="text-3xl font-black text-zinc-900 dark:text-white tabular-nums"
        >
          {{ kpi.value }}
        </p>
        <p class="text-xs text-zinc-400 font-medium -mt-2">
          {{ kpi.suffix }}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h3
            class="text-sm font-black uppercase tracking-widest text-zinc-400 shrink-0"
          >
            Lista de Programações
          </h3>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <UInput
              v-model="searchTerm"
              size="sm"
              placeholder="Buscar título ou cliente..."
              icon="i-heroicons-magnifying-glass"
              class="w-44 lg:w-56"
            />
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'Todos os status', value: 'all' },
                { label: 'Pendente', value: 'pending' },
                { label: 'Confirmado', value: 'confirmed' },
                { label: 'Concluído', value: 'completed' },
                { label: 'Cancelado', value: 'cancelled' },
              ]"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-40"
            />
            <USelect
              v-model="typeFilter"
              :items="[
                { label: 'Todos os tipos', value: 'all' },
                { label: 'Entrega Concreto', value: 'concrete_delivery' },
                { label: 'Serviço Bomba', value: 'pump_service' },
                { label: 'Visita Técnica', value: 'site_visit' },
                { label: 'Outro', value: 'other' },
              ]"
              value-key="value"
              label-key="label"
              size="sm"
              class="w-40"
            />
          </div>
        </div>
      </template>

      <!-- Loading skeleton -->
      <div v-if="pending" class="space-y-3 py-2">
        <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
      </div>

      <!-- Table Section -->
      <div v-else-if="filteredSchedules.length > 0" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800">
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-left"
              >
                Data/Hora
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-left"
              >
                Título
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-left"
              >
                Cliente
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-left"
              >
                Tipo
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-left"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 text-right"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in filteredSchedules"
              :key="s.id"
              class="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors group"
            >
              <!-- Date Column -->
              <td class="px-4 py-3.5">
                <div class="flex flex-col">
                  <span class="font-bold text-zinc-900 dark:text-white">
                    {{ formatDateFull(s.date) }}
                  </span>
                  <span
                    v-if="s.startTime"
                    class="text-xs text-zinc-400 font-medium"
                  >
                    {{ s.startTime }}
                    {{ s.endTime ? `- ${s.endTime}` : "" }}
                  </span>
                </div>
              </td>

              <!-- Title Column -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-zinc-700 dark:text-zinc-200">
                    {{ s.title }}
                  </span>
                  <UIcon
                    v-if="s.whatsappSent"
                    name="i-simple-icons-whatsapp"
                    class="w-4 h-4 text-green-500"
                  />
                </div>
              </td>

              <!-- Customer Column -->
              <td class="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                {{ s.customerName || "—" }}
              </td>

              <!-- Type Column -->
              <td class="px-4 py-3.5">
                <div
                  class="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-tighter"
                >
                  <UIcon :name="getTypeIcon(s.type)" class="w-4 h-4" />
                  {{ getTypeLabel(s.type) }}
                </div>
              </td>

              <!-- Status Column -->
              <td class="px-4 py-3.5">
                <UBadge
                  :color="getStatusColor(s.status)"
                  variant="soft"
                  size="sm"
                >
                  {{ getStatusLabel(s.status) }}
                </UBadge>
              </td>

              <!-- Actions Column -->
              <td class="px-4 py-3.5 text-right">
                <div
                  class="flex items-center justify-end gap-0.5 opacity-100 transition-opacity"
                >
                  <UTooltip text="Enviar WhatsApp">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-simple-icons-whatsapp"
                      size="xs"
                      :loading="loadingWhatsapp === s.id"
                      @click="sendScheduleWhatsapp(s)"
                    />
                  </UTooltip>
                  <UTooltip text="Editar Agendamento">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      size="xs"
                      @click="openEdit(s)"
                    />
                  </UTooltip>
                  <UTooltip text="Excluir">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="xs"
                      @click="confirmDelete(s)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div
        v-if="!pending && filteredSchedules.length === 0"
        class="flex flex-col items-center justify-center py-16 text-zinc-400"
      >
        <UIcon name="i-heroicons-calendar" class="w-12 h-12 mb-3" />
        <p class="text-sm font-bold">Nenhum agendamento encontrado</p>
        <UButton
          color="primary"
          variant="link"
          class="mt-2"
          @click="openCreate"
        >
          Criar o primeiro agendamento
        </UButton>
      </div>
    </UCard>

    <!-- Create/Edit Slideover -->
    <USlideover
      v-model:open="isOpen"
      side="right"
      :ui="{ footer: 'p-0 block' }"
    >
      <template #header>
        <div class="flex items-center justify-between gap-1.5 w-full">
          <div>
            <h2
              class="text-lg font-black text-zinc-900 dark:text-white leading-none"
            >
              {{ isEditing ? "Editar Agendamento" : "Novo Agendamento" }}
            </h2>
            <p class="text-xs text-zinc-500 mt-1">Preencha os dados abaixo</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="isOpen = false"
          />
        </div>
      </template>

      <template #body>
        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-4">
            <UFormField label="Título" required :error="formErrors.title">
              <UInput
                v-model="form.title"
                placeholder="Ex: Entrega Obra Central"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Descrição (Opcional)">
              <UTextarea
                v-model="form.description"
                placeholder="Detalhes adicionais..."
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Tipo" required :error="formErrors.type">
                <USelect
                  v-model="form.type"
                  :items="[
                    { label: 'Entrega Concreto', value: 'concrete_delivery' },
                    { label: 'Serviço Bomba', value: 'pump_service' },
                    { label: 'Visita Técnica', value: 'site_visit' },
                    { label: 'Outro', value: 'other' },
                  ]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Status" required :error="formErrors.status">
                <USelect
                  v-model="form.status"
                  :items="[
                    { label: 'Pendente', value: 'pending' },
                    { label: 'Confirmado', value: 'confirmed' },
                    { label: 'Concluído', value: 'completed' },
                    { label: 'Cancelado', value: 'cancelled' },
                  ]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Data" required :error="formErrors.date">
                <UInput v-model="form.date" type="date" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-2">
                <UFormField label="Início">
                  <UInput v-model="form.startTime" type="time" class="w-full" />
                </UFormField>
                <UFormField label="Fim">
                  <UInput v-model="form.endTime" type="time" class="w-full" />
                </UFormField>
              </div>
            </div>

            <UFormField label="Cliente">
              <UInput
                v-model="form.customerName"
                placeholder="Nome do cliente"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Telefone (WhatsApp)">
              <UInput
                v-model="form.customerPhone"
                placeholder="(00) 00000-0000"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Localização">
              <UInput
                v-model="form.location"
                placeholder="Endereço da entrega"
                icon="i-heroicons-map-pin"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="border-t border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center gap-3 px-6 py-6">
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
                :loading="isSaving"
                icon="i-heroicons-check"
                @click="saveSchedule"
              >
                {{ isEditing ? "Salvar Alterações" : "Criar Agendamento" }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- ══════════════════════════════════════════
         MODAL — Delete Confirm
    ══════════════════════════════════════════ -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Agendamento">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p class="font-bold text-zinc-900 dark:text-white">
                Confirmar exclusão
              </p>
              <p class="text-sm text-zinc-500 mt-1">
                Tem certeza que deseja excluir
                <strong class="text-zinc-700 dark:text-zinc-300">
                  "{{ deleteTarget?.title }}" </strong
                >? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="loadingDelete"
              icon="i-heroicons-trash"
              @click="handleDelete"
            >
              Excluir
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
