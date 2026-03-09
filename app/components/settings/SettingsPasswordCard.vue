<script setup lang="ts">
const props = defineProps<{
  userId: number | undefined;
}>();

const toast = useToast();

const passwordForm = reactive({
  current: "",
  newPass: "",
  confirm: "",
});

const passwordErrors = reactive<Record<string, string>>({});

const clearErrors = () => {
  for (const key in passwordErrors) delete passwordErrors[key];
};

const showCurrentPass = ref(false);
const showNewPass = ref(false);
const loading = ref(false);

const validate = (): boolean => {
  clearErrors();
  let isValid = true;

  if (!passwordForm.current) {
    passwordErrors.current = "Informe a senha atual.";
    isValid = false;
  }

  if (passwordForm.newPass.length < 6) {
    passwordErrors.newPass = "A nova senha deve ter pelo menos 6 caracteres.";
    isValid = false;
  }

  if (passwordForm.newPass !== passwordForm.confirm) {
    passwordErrors.confirm = "As senhas não conferem.";
    isValid = false;
  }

  return isValid;
};

const handleUpdate = async () => {
  if (!validate()) return;
  if (!props.userId) return;

  loading.value = true;
  try {
    await $fetch<{ ok: boolean }>(`/api/users/${props.userId}/password`, {
      method: "PATCH",
      body: {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      },
    });
    toast.add({
      title: "Senha alterada",
      description: "Sua senha foi atualizada com sucesso.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
    passwordForm.current = "";
    passwordForm.newPass = "";
    passwordForm.confirm = "";
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string };
    toast.add({
      title: "Erro ao alterar senha",
      description: err?.data?.message ?? err?.message ?? "Tente novamente.",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0"
        >
          <UIcon
            name="i-heroicons-lock-closed"
            class="w-5 h-5 text-orange-500"
          />
        </div>
        <div>
          <h2
            class="text-sm font-black uppercase tracking-widest text-zinc-400"
          >
            Alterar Senha
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Redefina sua senha de acesso
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <UFormField label="Senha atual" required :error="passwordErrors.current">
        <UInput
          v-model="passwordForm.current"
          :type="showCurrentPass ? 'text' : 'password'"
          placeholder="Digite sua senha atual"
          class="w-full"
          size="lg"
          autocomplete="current-password"
        >
          <template #trailing>
            <UButton
              :icon="
                showCurrentPass ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
              "
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showCurrentPass = !showCurrentPass"
            />
          </template>
        </UInput>
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Nova senha" required :error="passwordErrors.newPass">
          <UInput
            v-model="passwordForm.newPass"
            :type="showNewPass ? 'text' : 'password'"
            placeholder="Mínimo 6 caracteres"
            class="w-full"
            size="lg"
            autocomplete="new-password"
          >
            <template #trailing>
              <UButton
                :icon="
                  showNewPass ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showNewPass = !showNewPass"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          label="Confirmar nova senha"
          required
          :error="passwordErrors.confirm"
        >
          <UInput
            v-model="passwordForm.confirm"
            :type="showNewPass ? 'text' : 'password'"
            placeholder="Repita a nova senha"
            class="w-full"
            size="lg"
            autocomplete="new-password"
          />
        </UFormField>
      </div>

      <div
        class="flex justify-end pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800"
      >
        <UButton
          color="warning"
          size="lg"
          icon="i-heroicons-lock-closed"
          :loading="loading"
          class="rounded-xl px-6 font-bold"
          @click="handleUpdate"
        >
          Atualizar Senha
        </UButton>
      </div>
    </div>
  </UCard>
</template>
