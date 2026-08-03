export function normalizeLoginRedirectPath(targetUrl?: string | null) {
  if (!process.client || !targetUrl) return "/";

  if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
    return isSignInPath(targetUrl) ? "/" : targetUrl;
  }

  try {
    const url = new URL(targetUrl, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/";
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    return isSignInPath(path) ? "/" : path;
  } catch {
    return "/";
  }
}

function isSignInPath(path: string) {
  return path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') === '/please-sign-in';
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

export async function businessLogin() {
  if (!import.meta.client) return;
  window.location.assign('/api/auth/login?intent=business&mode=switch&returnTo=%2Fbusiness');
}

export async function businessSignup() {
  if (!import.meta.client) return;
  window.location.assign('/api/auth/login?intent=business&mode=signup&returnTo=%2Fbusiness');
}

export async function logout() {
  if (!import.meta.client) return;
  useMeStateV2().clear();
  window.location.assign("/api/auth/logout");
}
