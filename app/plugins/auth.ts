export default defineNuxtPlugin(() => {
  const { clearUser } = useAuth();
  const route = useRoute();

  // Intercept all $fetch errors globally (ofetch)
  const originalFetch = globalThis.$fetch;

  if (import.meta.client) {
    globalThis.$fetch = originalFetch.create({
      onRequest({ options }) {
        options.headers = new Headers(options.headers || {});
        const hwid = getHardwareId();
        if (hwid) {
          options.headers.set("x-hwid", hwid);
        }
      },
      onResponseError({ response }) {
        const isPublicPath =
          route.path === "/login" || route.path.startsWith("/mobile");
        if (response.status === 401 && !isPublicPath) {
          clearUser();
          navigateTo("/login");
        }
      },
    });
  } else if (import.meta.server) {
    // Server-side internal Nuxt SSR fetch bypasses HWID check using runtime config
    globalThis.$fetch = originalFetch.create({
      onRequest({ options }) {
        const config = useRuntimeConfig();
        options.headers = new Headers(options.headers || {});
        options.headers.set("x-ssr-secret", config.sessionSecret || "");
      },
    });
  }
});
