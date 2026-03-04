import { computed } from 'vue'

export interface AuthCompany {
  id: number
  name: string
  role: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  companyId: number | null
  defaultCompanyId: number | null
}

export const useAuth = () => {
  const cookieOpts = {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax" as const,
    watch: true // Garante que atualizações no browser reflitam no state do Nuxt
  }

  // Lemos o cookie apenas para preenchimento inicial seguro (SSR)
  const _userCookie = useCookie<AuthUser | null>("mc_user", {
    default: () => null,
    ...cookieOpts,
  })

  const _companiesCookie = useCookie<AuthCompany[]>("mc_companies", {
    default: () => [],
    ...cookieOpts,
  })

  const _activeCompanyCookie = useCookie<number | null>("mc_active_company", {
    default: () => null,
    ...cookieOpts,
  })

  // Usamos useState para garantir que TODA a aplicação compartilhe a exata MESMA referência em memória
  // E o inicializamos usando o valor do Cookie
  const user = useState<AuthUser | null>('auth_user_state', () => _userCookie.value)
  const companies = useState<AuthCompany[]>('auth_companies_state', () => _companiesCookie.value)
  const activeCompanyId = useState<number | null>('auth_active_company_state', () => _activeCompanyCookie.value)

  // ─────────────────────────────────────────────
  // Computed Properties (Reativas)
  // ─────────────────────────────────────────────
  const isLoggedIn = computed(() => !!user.value)

  const activeCompany = computed(
    () =>
      companies.value?.find((c) => c.id === activeCompanyId.value) ??
      companies.value?.[0] ??
      null
  )

  const companyId = computed(
    () => activeCompanyId.value ?? user.value?.companyId ?? null
  )

  // ─────────────────────────────────────────────
  // Cross-Tab Synchronization (Coerência entre abas)
  // ─────────────────────────────────────────────
  // Se os cookies mudarem (ex: logout em outra aba), atualizamos o estado reativo
  watch(_userCookie, (newVal) => {
    // Verificação simples para evitar loops desnecessários
    if (JSON.stringify(newVal) !== JSON.stringify(user.value)) {
      user.value = newVal
    }
  }, { deep: true })

  watch(_companiesCookie, (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(companies.value)) {
      companies.value = newVal || []
    }
  }, { deep: true })

  watch(_activeCompanyCookie, (newVal) => {
    if (newVal !== activeCompanyId.value) {
      activeCompanyId.value = newVal
    }
  })

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  // Função auxiliar privada para sincronizar o state global com o cookie persistente
  const syncCookies = () => {
    _userCookie.value = user.value
    _companiesCookie.value = companies.value
    _activeCompanyCookie.value = activeCompanyId.value
  }

  const setUser = (u: AuthUser, comps: AuthCompany[] = []) => {
    user.value = u
    companies.value = comps

    const stillValid = comps.find((c) => c.id === activeCompanyId.value)

    if (u.defaultCompanyId && comps.some(c => c.id === u.defaultCompanyId)) {
      activeCompanyId.value = u.defaultCompanyId
    } else if (!stillValid) {
      activeCompanyId.value = u.defaultCompanyId ?? comps[0]?.id ?? u.companyId ?? null
    }

    // Persiste tudo no navegador
    syncCookies()
  }

  const switchCompany = (id: number) => {
    activeCompanyId.value = id
    syncCookies()
  }

  const clearUser = () => {
    user.value = null
    companies.value = []
    activeCompanyId.value = null
    syncCookies()
  }

  return {
    // Retornamos os `useState` para a UI (garantia absoluta de reatividade cruzada)
    user,
    companies,
    activeCompanyId,
    activeCompany,
    companyId,
    isLoggedIn,
    setUser,
    clearUser,
    switchCompany,
  }
}
