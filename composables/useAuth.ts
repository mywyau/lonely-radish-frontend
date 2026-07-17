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
  return {
    client: null,
    isAuthenticated: true,
    user: {
      email: "demo@lonelyradish.app",
      name: "Maya Lee",
    },
    getAccessToken: async () => "mock-local-token",
  };
}

export async function login(targetUrl?: string | null) {
  await navigateTo(normalizeLoginRedirectPath(targetUrl));
}

export async function loginWithGoogle(targetUrl?: string | null) {
  await login(targetUrl);
}

export async function logout() {
  await navigateTo("/");
}
