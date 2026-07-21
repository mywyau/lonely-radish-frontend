export function normalizeLoginRedirectPath(targetUrl?: string | null) {
  if (!process.client || !targetUrl) return "/";

  if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
    return targetUrl;
  }

  try {
    const url = new URL(targetUrl, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function useAuth() {
  if (import.meta.server) return { isAuthenticated: false, user: null };
  const session = await $fetch<{ authenticated: boolean; user: { email: string; name?: string } | null }>("/api/auth/session");
  return { isAuthenticated: session.authenticated, user: session.user };
}

export async function login(targetUrl?: string | null) {
  if (!import.meta.client) return;
  window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(normalizeLoginRedirectPath(targetUrl))}`);
}

export async function loginWithGoogle(targetUrl?: string | null) {
  await login(targetUrl);
}

export async function loginWithAnotherAccount(targetUrl?: string | null) {
  if (!import.meta.client) return;
  const returnTo = encodeURIComponent(normalizeLoginRedirectPath(targetUrl));
  window.location.assign(`/api/auth/login?mode=switch&returnTo=${returnTo}`);
}

export async function signup(targetUrl?: string | null) {
  if (!import.meta.client) return;
  const returnTo = encodeURIComponent(normalizeLoginRedirectPath(targetUrl));
  window.location.assign(`/api/auth/login?mode=signup&returnTo=${returnTo}`);
}

export async function logout() {
  if (!import.meta.client) return;
  window.location.assign("/api/auth/logout");
}
