export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth();

  // Public pages that don't require authentication
  const publicPaths = ["/login", "/mobile"];

  // Special case for mobile routes (/mobile acts as a separate entry)
  if (
    !isLoggedIn.value &&
    to.path.startsWith("/mobile") &&
    to.path !== "/mobile"
  ) {
    // If trying to go to /mobile/agendar without login, go to /mobile (the PIN page)
    return navigateTo("/mobile", { redirectCode: 302 });
  }

  // Redirect to /login if not authenticated (works on both SSR and client)
  if (
    !isLoggedIn.value &&
    !publicPaths.includes(to.path) &&
    !to.path.startsWith("/mobile")
  ) {
    return navigateTo("/login", { redirectCode: 302 });
  }

  // Redirect to dashboard if already authenticated and trying to open /login
  if (isLoggedIn.value && (to.path === "/login" || to.path === "/mobile")) {
    const target = to.path === "/mobile" ? "/mobile/agendar" : "/";
    return navigateTo(target, { replace: true });
  }
});
