<script setup lang="ts">
const props = defineProps<{
    user: any;
}>();

const toast = useToast();

const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10)
        return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const profileForm = reactive({
    name: props.user?.name ?? "",
    phone: "",
});

const profileErrors = reactive<Record<string, string>>({});

const clearErrors = () => {
    for (const key in profileErrors) delete profileErrors[key];
};

watch(() => profileForm.phone, (val) => {
    const masked = formatPhone(val);
    if (masked !== val) profileForm.phone = masked;
});

const validate = (): boolean => {
    clearErrors();
    let isValid = true;

    if (!profileForm.name || profileForm.name.trim().length < 3) {
        profileErrors.name = "O nome deve ter pelo menos 3 caracteres.";
        isValid = false;
    }

    return isValid;
};

const loadingSave = ref(false);

const handleSave = async () => {
    if (!validate()) return;
    if (!props.user?.id) return;
    
    loadingSave.value = true;
    try {
        await $fetch(`/api/users/${props.user.id}`, {
            method: "PUT",
            body: {
                name: profileForm.name.trim(),
                phone: profileForm.phone.trim() || undefined,
            },
        });
        
        // Update local user object (shared via useAuth usually)
        if (props.user) props.user.name = profileForm.name.trim();
        
        toast.add({
            title: "Perfil atualizado",
            description: "Seus dados foram salvos com sucesso.",
            color: "success",
            icon: "i-heroicons-check-circle",
        });
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        toast.add({
            title: "Erro ao salvar",
            description: err?.data?.message ?? err?.message ?? "Tente novamente.",
            color: "error",
            icon: "i-heroicons-exclamation-circle",
        });
    } finally {
        loadingSave.value = false;
    }
};

const roleLabel = computed(() => {
    const map: Record<string, string> = {
        admin: "Administrador",
        manager: "Gerente",
        user: "Usuário",
    };
    return map[props.user?.role ?? "user"] ?? "Usuário";
});
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                    <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-sm font-black uppercase tracking-widest text-zinc-400">
                        Meu Perfil
                    </h2>
                    <p class="text-xs text-zinc-400 mt-0.5">
                        Gerencie seus dados pessoais
                    </p>
                </div>
            </div>
        </template>

        <div class="space-y-4">
            <!-- Name + Phone -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Nome" required :error="profileErrors.name">
                    <UInput v-model="profileForm.name" placeholder="Seu nome completo" icon="i-heroicons-user"
                        class="w-full" />
                </UFormField>
                <UFormField label="Telefone">
                    <UInput v-model="profileForm.phone" placeholder="(00) 00000-0000" icon="i-heroicons-phone"
                        class="w-full" />
                </UFormField>
            </div>

            <!-- Read-only fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="E-mail">
                    <UInput :model-value="user?.email ?? ''" disabled icon="i-heroicons-envelope" class="w-full opacity-60" />
                </UFormField>
                <UFormField label="Perfil de acesso">
                    <UInput :model-value="roleLabel" disabled icon="i-heroicons-shield-check" class="w-full opacity-60" />
                </UFormField>
            </div>

            <p class="text-xs text-zinc-400">
                E-mail e perfil de acesso só podem ser alterados por um administrador.
            </p>

            <!-- Save -->
            <div class="flex justify-end pt-2">
                <UButton color="primary" icon="i-heroicons-check" :loading="loadingSave" @click="handleSave">
                    Salvar Perfil
                </UButton>
            </div>
        </div>
    </UCard>
</template>
