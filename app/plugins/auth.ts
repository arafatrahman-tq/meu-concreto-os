export default defineNuxtPlugin(() => {
  const { clearUser } = useAuth()
  const route = useRoute()

  // Intercept all $fetch errors globally (ofetch)
  const originalFetch = globalThis.$fetch

  if (import.meta.client) {
    globalThis.$fetch = originalFetch.create({
      onResponseError({ response }) {
        const isPublicPath
          = route.path === '/login' || route.path.startsWith('/mobile')
        if (response.status === 401 && !isPublicPath) {
          clearUser()
          navigateTo('/login')
        }
      }
    })
  }
})
