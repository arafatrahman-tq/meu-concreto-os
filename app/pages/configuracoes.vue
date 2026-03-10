<script setup lang="ts">
definePageMeta({ layout: "default" });
useSeoMeta({ title: "Configurações | Meu Concreto" });

const { user, companyId } = useAuth();

// Small fetch to get company name for the account card
const { data: companyBasicData, refresh: refreshBasicCompany } =
  await useFetch<{
    company: { name: string; city: string | null; state: string | null };
  }>(() => `/api/companies/${companyId.value}`);

const companyBasic = computed(() => companyBasicData.value?.company ?? null);
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- ── Page Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
          Configurações
        </h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie os dados da empresa, seu perfil e preferências do sistema.
        </p>
      </div>
    </div>

    <!-- ── Layout: 2 columns on lg+ ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ══ LEFT COLUMN ══════════════════════════════════════════════════ -->
      <div class="lg:col-span-2 space-y-6">
        <!-- ── 1. Empresa ── -->
        <SettingsCompanyCard
          :company-id="companyId"
          @updated="refreshBasicCompany"
        />

        <!-- ── 2. Meu Perfil ── -->
        <SettingsProfileCard :user="user" />

        <!-- ── 2b. Alterar Senha ── -->
        <SettingsPasswordCard :user-id="user?.id" />

        <!-- ── 3. Observações do PDF ── -->
        <SettingsPdfNotesCard
          :company-id="companyId"
          @updated="refreshBasicCompany"
        />

        <!-- ── 4. WhatsApp ── -->
        <SettingsWhatsappCard
          :company-id="companyId"
          :user="user"
          :company-name="companyBasic?.name"
        />
      </div>

      <!-- ══ RIGHT COLUMN ═════════════════════════════════════════════════ -->
      <div class="space-y-6">
        <!-- ── 3. User card ── -->
        <SettingsAccountCard
          :user="user"
          :company-name="companyBasic?.name"
          :city="companyBasic?.city"
          :state="companyBasic?.state"
        />

        <!-- ── 4. Aparência ── -->
        <SettingsAppearanceCard />

        <!-- ── 5. Info do Sistema ── -->
        <SettingsSystemCard :company-id="companyId" />
      </div>
    </div>
  </div>
</template>
