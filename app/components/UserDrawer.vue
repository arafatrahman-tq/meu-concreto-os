<script setup lang="ts">
import type { User, UserRole, UserCompanyEntry } from '~/types/users'
import { USER_ROLE_OPTS } from '~/types/users'
import type { AuthUser } from '~/composables/useAuth'

const props = defineProps<{
  open: boolean;
  editMode: boolean;
  editingId: number | null;
  initialData?: User | null;
  allCompanies: any[];
  authUser: AuthUser | null;
  currentCompanyId: number | null;
}>();

const emit = defineEmits(["update:open", "saved"]);

const { user } = useAuth();
const toast = useToast();

function roleColor(role: string) {
  if (role === "admin") return "error";
  if (role === "manager") return "warning";
  return "neutral";
}

function roleLabel(role: string) {
  return USER_ROLE_OPTS.find((r) => r.value === role)?.label ?? role;
}

// ─── Form State ───────────────────────────────────────────────────────────────
const form = reactive({
  companyId: null as number | null,
  defaultCompanyId: null as number | null,
  name: "",
  email: "",
  document: "",
  phone: "",
  role: "user" as UserRole,
  active: true,
  password: "",
});

const saving = ref(false);
const formErrors = reactive<Record<string, string>>({});

function clearErrors() {
  for (const key in formErrors) {
    delete formErrors[key];
  }
}

function validateForm(): boolean {
  clearErrors();
  let isValid = true;

  if (form.name.trim().length < 3) {
    formErrors.name = "Nome deve ter no mínimo 3 caracteres.";
    isValid = false;
  }

  if (!props.editMode) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      formErrors.email = "Insira um e-mail válido.";
      isValid = false;
    }

    const cpfDigits = form.document.replace(/\D/g, "");
    if (cpfDigits.length < 11) {
      formErrors.document = "CPF deve ter 11 dígitos.";
      isValid = false;
    }

    if (form.password.length < 6) {
      formErrors.password = "Senha deve ter no mínimo 6 caracteres.";
      isValid = false;
    }

    if (!form.companyId && props.allCompanies.length > 0) {
      formErrors.companyId = "Selecione a empresa principal.";
      isValid = false;
    }
  }

  return isValid;
}

// ─── Company Management ───────────────────────────────────────────────────────
const userCompanyList = ref<UserCompanyEntry[]>([]);
const companiesLoading = ref(false);
const addCompanySearch = ref("");
const selectedCompanyToAdd = ref<{ id: number; name: string } | null>(null);
const addCompanyRole = ref<UserRole>("user");
const addingCompany = ref(false);
const removingCompanyId = ref<number | null>(null);

const filteredCompaniesForAdd = computed(() => {
  const q = addCompanySearch.value.toLowerCase();
  const already = new Set(userCompanyList.value.map((uc) => uc.companyId));
  return props.allCompanies
    .filter(
      (c: any) => !already.has(c.id) && (!q || c.name.toLowerCase().includes(q))
    )
    .slice(0, 8);
});

// ─── Password Reset (Admin only) ─────────────────────────────────────────────
const adminPasswordForm = reactive({ newPass: "", confirm: "" });
const showAdminPass = ref(false);
const savingPassword = ref(false);

// Synchronize with initial data when editing
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      clearErrors();
      if (props.editMode && props.initialData) {
        form.name = props.initialData.name;
        form.email = props.initialData.email;
        form.defaultCompanyId = props.initialData.defaultCompanyId || null;
        form.document = props.initialData.document || "";
        form.phone = props.initialData.phone || "";
        form.role = props.initialData.role;
        form.active = props.initialData.active;
        if (props.editingId) loadUserCompanies(props.editingId);
      } else {
        resetForm();
      }
    }
  }
);

function resetForm() {
  form.companyId = props.currentCompanyId;
  form.defaultCompanyId = null;
  form.name = "";
  form.email = "";
  form.document = "";
  form.phone = "";
  form.role = "user";
  form.active = true;
  form.password = "";
  userCompanyList.value = [];
  selectedCompanyToAdd.value = null;
  addCompanySearch.value = "";
  addCompanyRole.value = "user";
  adminPasswordForm.newPass = "";
  adminPasswordForm.confirm = "";
  showAdminPass.value = false;
}

async function loadUserCompanies(userId: number) {
  companiesLoading.value = true;
  try {
    const data = await $fetch<{ userCompanies: UserCompanyEntry[] }>(
      `/api/user-companies?userId=${userId}`
    );
    userCompanyList.value = data.userCompanies;
  } catch {
    userCompanyList.value = [];
  } finally {
    companiesLoading.value = false;
  }
}

async function handleSave() {
  if (!validateForm()) {
    toast.add({
      title: "Atenção",
      description: "Corrija os campos destacados em vermelho.",
      color: "error",
    });
    return;
  }

  saving.value = true;
  try {
    if (props.editMode && props.editingId) {
      const updated = await $fetch(`/api/users/${props.editingId}`, {
        method: "PUT",
        body: {
          name: form.name.trim(),
          phone: form.phone,
          role: form.role,
          active: form.active,
          defaultCompanyId: form.defaultCompanyId,
        },
      });

      // Update local session if editing self
      if (user.value && props.editingId === user.value.id) {
        const u = (updated as any).user;
        if (u) {
          user.value.defaultCompanyId = u.defaultCompanyId;
          user.value.name = u.name;
        }
      }

      toast.add({
        title: "Usuário atualizado",
        description: `${form.name} foi atualizado com sucesso.`,
        color: "success",
      });
    } else {
      await $fetch("/api/users", {
        method: "POST",
        body: {
          companyId: form.companyId,
          name: form.name.trim(),
          email: form.email.trim(),
          document: form.document,
          phone: form.phone,
          role: form.role,
          active: form.active,
          password: form.password,
        },
      });
      toast.add({
        title: "Usuário criado",
        description: `${form.name} foi cadastrado com sucesso.`,
        color: "success",
      });
    }
    emit("update:open", false);
    emit("saved");
  } catch (e: any) {
    const errMsg =
      e.statusCode === 409
        ? "E-mail ou CPF já cadastrado para outro usuário."
        : e.data?.message ?? "Erro ao salvar. Tente novamente.";
    toast.add({
      title: "Erro ao salvar",
      description: errMsg,
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function handleAdminResetPassword() {
  if (adminPasswordForm.newPass.length < 6) {
    toast.add({
      title: "Senha inválida",
      description: "A nova senha deve ter pelo menos 6 caracteres.",
      color: "warning",
    });
    return;
  }
  if (adminPasswordForm.newPass !== adminPasswordForm.confirm) {
    toast.add({
      title: "Senhas não conferem",
      description: "A confirmação não corresponde à nova senha.",
      color: "warning",
    });
    return;
  }
  if (!props.editingId) return;
  savingPassword.value = true;
  try {
    await $fetch(`/api/users/${props.editingId}/password`, {
      method: "PATCH",
      body: { newPassword: adminPasswordForm.newPass },
    });
    toast.add({
      title: "Senha redefinida",
      description: "A senha do usuário foi alterada com sucesso.",
      color: "success",
    });
    adminPasswordForm.newPass = "";
    adminPasswordForm.confirm = "";
  } catch (e: any) {
    toast.add({
      title: "Erro",
      description:
        e?.data?.message ??
        e?.data?.statusMessage ??
        "Não foi possível redefinir a senha.",
      color: "error",
    });
  } finally {
    savingPassword.value = false;
  }
}

async function addCompanyToUser() {
  if (!selectedCompanyToAdd.value || !props.editingId) return;
  addingCompany.value = true;
  try {
    await $fetch("/api/user-companies", {
      method: "POST",
      body: {
        userId: props.editingId,
        companyId: selectedCompanyToAdd.value.id,
        role: addCompanyRole.value,
      },
    });
    toast.add({
      title: "Empresa vinculada",
      description: `${selectedCompanyToAdd.value.name} adicionada ao usuário.`,
      color: "success",
    });
    selectedCompanyToAdd.value = null;
    addCompanySearch.value = "";
    addCompanyRole.value = "user";
    await loadUserCompanies(props.editingId);
  } catch (e: any) {
    toast.add({
      title: "Erro",
      description: e.data?.message ?? "Não foi possível vincular a empresa.",
      color: "error",
    });
  } finally {
    addingCompany.value = false;
  }
}

async function removeCompanyFromUser(entry: UserCompanyEntry) {
  if (!props.editingId) return;
  removingCompanyId.value = entry.id;
  try {
    await $fetch(`/api/user-companies/${entry.id}`, { method: "DELETE" });
    toast.add({
      title: "Empresa removida",
      description: `${entry.companyName} desvinculada do usuário.`,
      color: "warning",
    });
    if (form.defaultCompanyId === entry.companyId) {
      form.defaultCompanyId = null;
    }
    await loadUserCompanies(props.editingId);
  } catch {
    toast.add({
      title: "Erro",
      description: "Não foi possível remover a empresa.",
      color: "error",
    });
  } finally {
    removingCompanyId.value = null;
  }
}
</script>

<template>
  <USlideover
    :open="open"
    :title="editMode ? 'Editar Usuário' : 'Novo Usuário'"
    :description="
      editMode
        ? 'Atualize as informações do usuário abaixo.'
        : 'Preencha os dados para cadastrar um novo usuário.'
    "
    :ui="{ footer: 'p-0 block' }"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
        <!-- Dados pessoais -->
        <div>
          <p
            class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4"
          >
            Dados Pessoais
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Nome completo *"
              class="col-span-full"
              :error="formErrors.name"
            >
              <UInput
                v-model="form.name"
                placeholder="Ex: João da Silva"
                icon="i-heroicons-user"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="E-mail *"
              class="col-span-full"
              :error="formErrors.email"
            >
              <UInput
                v-model="form.email"
                type="email"
                placeholder="joao@empresa.com.br"
                icon="i-heroicons-envelope"
                class="w-full"
                :disabled="editMode"
              />
              <template v-if="editMode" #hint>
                <span class="text-xs text-zinc-400"
                  >E-mail não pode ser alterado</span
                >
              </template>
            </UFormField>

            <UFormField
              label="CPF *"
              :error="formErrors.document"
            >
              <UInput
                v-model="form.document"
                placeholder="000.000.000-00"
                icon="i-heroicons-identification"
                class="w-full"
                :disabled="editMode"
                maxlength="14"
                @update:model-value="(v) => (form.document = maskDocument(v))"
              />
              <template v-if="editMode" #hint>
                <span class="text-xs text-zinc-400"
                  >CPF não pode ser alterado</span
                >
              </template>
            </UFormField>

            <UFormField label="Telefone">
              <UInput
                v-model="form.phone"
                placeholder="(00) 9.0000-0000"
                icon="i-heroicons-phone"
                class="w-full"
                maxlength="16"
                @update:model-value="(v) => (form.phone = maskPhone(v))"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Acesso e permissões -->
        <div>
          <p
            class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4"
          >
            Acesso e Permissões
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Perfil de acesso *"
              class="col-span-full"
              :error="formErrors.role"
            >
              <USelectMenu
                v-model="form.role"
                :items="(USER_ROLE_OPTS as any)"
                value-key="value"
                label-key="label"
                icon="i-heroicons-shield-check"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="!editMode"
              label="Senha *"
              class="col-span-full"
              :error="formErrors.password"
            >
              <UInput
                v-model="form.password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                icon="i-heroicons-lock-closed"
                class="w-full"
              />
            </UFormField>

            <!-- Status Toggle Row (Standard Design System) -->
            <UFormField label="Status" class="col-span-full">
              <div
                class="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
              >
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      form.active
                        ? 'bg-primary-100 dark:bg-primary-500/10 text-primary-500'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500',
                    ]"
                  >
                    <UIcon
                      :name="
                        form.active
                          ? 'i-heroicons-check-circle'
                          : 'i-heroicons-pause-circle'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                  <div>
                    <p
                      class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {{ form.active ? "Usuário ativo" : "Usuário inativo" }}
                    </p>
                    <p class="text-[10px] text-zinc-400">
                      {{
                        form.active
                          ? "Usuário pode acessar o sistema normalmente"
                          : "O acesso deste usuário está bloqueado"
                      }}
                    </p>
                  </div>
                </div>
                <USwitch v-model="form.active" color="primary" />
              </div>
            </UFormField>

            <UFormField
              v-if="!editMode"
              label="Empresa Principal *"
              description="O usuário será vinculado a esta empresa inicialmente."
              class="col-span-full"
              :error="formErrors.companyId"
            >
              <USelectMenu
                v-model="form.companyId"
                :items="allCompanies"
                value-key="id"
                label-key="name"
                placeholder="Selecionar Empresa..."
                icon="i-heroicons-building-office-2"
                class="w-full"
                open-on-focus
                @update:model-value="clearErrors"
              >
                <template #item="{ item }">
                  <div class="flex items-center gap-2 py-0.5">
                    <UIcon
                      name="i-heroicons-building-office-2"
                      class="w-4 h-4 text-zinc-400"
                    />
                    <span class="text-sm font-medium">{{ item.name }}</span>
                  </div>
                </template>
              </USelectMenu>
            </UFormField>
          </div>
        </div>

        <!-- Admin Password Reset -->
        <template v-if="editMode && authUser?.role === 'admin'">
          <USeparator />
          <div>
            <p
              class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4"
            >
              Redefinir Senha
            </p>
            <div
              class="rounded-xl ring-1 ring-orange-200 dark:ring-orange-500/20 bg-orange-50 dark:bg-orange-500/5 p-4 space-y-4"
            >
              <p class="text-xs text-orange-700 dark:text-orange-400">
                Como administrador, você pode definir uma nova senha sem
                precisar da senha atual.
              </p>
              <div class="grid grid-cols-1 gap-3">
                <UFormField label="Nova senha">
                  <UInput
                    v-model="adminPasswordForm.newPass"
                    :type="showAdminPass ? 'text' : 'password'"
                    placeholder="Mínimo 6 caracteres"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        :icon="
                          showAdminPass
                            ? 'i-heroicons-eye-slash'
                            : 'i-heroicons-eye'
                        "
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="showAdminPass = !showAdminPass"
                      />
                    </template>
                  </UInput>
                </UFormField>
                <UFormField label="Confirmar nova senha">
                  <UInput
                    v-model="adminPasswordForm.confirm"
                    :type="showAdminPass ? 'text' : 'password'"
                    placeholder="Repita a nova senha"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <UButton
                color="warning"
                variant="soft"
                icon="i-heroicons-lock-closed"
                size="sm"
                :loading="savingPassword"
                :disabled="!adminPasswordForm.newPass"
                class="w-full justify-center"
                @click="handleAdminResetPassword"
              >
                Redefinir Senha do Usuário
              </UButton>
            </div>
          </div>
        </template>

        <!-- Linked Companies -->
        <template v-if="editMode">
          <USeparator />
          <div>
            <div class="flex items-center justify-between mb-4">
              <p
                class="text-xs font-black uppercase tracking-widest text-zinc-400"
              >
                Empresas com Acesso
              </p>
              <span
                v-if="!companiesLoading"
                class="text-xs font-bold text-zinc-400"
              >
                {{ userCompanyList.length }} empresa{{
                  userCompanyList.length !== 1 ? "s" : ""
                }}
              </span>
            </div>

            <div v-if="companiesLoading" class="space-y-2">
              <USkeleton v-for="i in 2" :key="i" class="h-12 rounded-xl" />
            </div>

            <div
              v-else-if="userCompanyList.length === 0"
              class="flex flex-col items-center justify-center py-6 text-zinc-400 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
            >
              <UIcon
                name="i-heroicons-building-office-2"
                class="w-8 h-8 mb-2"
              />
              <p class="text-xs font-bold">Nenhuma empresa vinculada</p>
            </div>

            <div v-else class="space-y-2 mb-4">
              <div
                v-for="entry in userCompanyList"
                :key="entry.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900 group/entry"
              >
                <div
                  class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
                >
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="w-4 h-4 text-primary-500"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <span
                    class="text-sm font-bold text-zinc-900 dark:text-white truncate block"
                    >{{ entry.companyName }}</span
                  >
                  <UBadge
                    :color="roleColor(entry.role)"
                    variant="soft"
                    size="xs"
                  >
                    {{ roleLabel(entry.role) }}
                  </UBadge>
                </div>
                <UTooltip text="Definir como empresa padrão">
                  <UButton
                    :icon="
                      form.defaultCompanyId === entry.companyId
                        ? 'i-heroicons-star-20-solid'
                        : 'i-heroicons-star'
                    "
                    :color="
                      form.defaultCompanyId === entry.companyId
                        ? 'warning'
                        : 'neutral'
                    "
                    variant="ghost"
                    size="xs"
                    class="shrink-0"
                    @click="form.defaultCompanyId = entry.companyId"
                  />
                </UTooltip>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  :loading="removingCompanyId === entry.id"
                  class="opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0"
                  @click="removeCompanyFromUser(entry)"
                />
              </div>
            </div>

            <!-- Add company row -->
            <div
              class="rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-3"
            >
              <p class="text-xs font-bold text-zinc-500">
                Vincular nova empresa
              </p>
              <div class="flex gap-2">
                <USelectMenu
                  v-model="selectedCompanyToAdd"
                  v-model:search-term="addCompanySearch"
                  :items="filteredCompaniesForAdd"
                  label-key="name"
                  placeholder="Buscar Empresa..."
                  icon="i-heroicons-building-office-2"
                  class="flex-1"
                  open-on-focus
                >
                  <template #item="{ item }">
                    <div class="flex items-center gap-2 py-0.5">
                      <UIcon
                        name="i-heroicons-building-office-2"
                        class="w-4 h-4 text-zinc-400"
                      />
                      <span class="text-sm font-medium">{{ item.name }}</span>
                    </div>
                  </template>
                </USelectMenu>
                <USelect
                  v-model="addCompanyRole"
                  :items="(USER_ROLE_OPTS as any)"
                  value-key="value"
                  label-key="label"
                  class="w-36"
                />
              </div>
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-plus"
                size="sm"
                :loading="addingCompany"
                :disabled="!selectedCompanyToAdd"
                class="w-full justify-center"
                @click="addCompanyToUser"
              >
                Vincular empresa
              </UButton>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div
        class="flex items-center gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div class="flex-1 min-w-0">
          <UButton
            color="neutral"
            variant="outline"
            class="w-full"
            @click="emit('update:open', false)"
          >
            Cancelar
          </UButton>
        </div>
        <div class="flex-1 min-w-0">
          <UButton
            color="primary"
            class="w-full"
            :loading="saving"
            icon="i-heroicons-check"
            @click="handleSave"
          >
            {{ editMode ? "Salvar alterações" : "Cadastrar usuário" }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
