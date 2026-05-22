import { Auth0Client, type Auth0ClientOptions } from "@auth0/auth0-spa-js";

let auth0Client: Auth0Client | null = null;

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

function getCurrentRoutePath() {
  const route = useRoute();
  return route.fullPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getLoginRedirectPath(targetUrl?: string | null) {
  return normalizeLoginRedirectPath(targetUrl || getCurrentRoutePath());
}

function getClient() {
  if (auth0Client) return auth0Client;

  const config = useRuntimeConfig();

  const options: Auth0ClientOptions = {
    domain: config.public.auth0Domain,
    clientId: config.public.auth0ClientId,
    authorizationParams: {
      redirect_uri: `${window.location.origin}/callback`,
      audience: config.public.auth0Audience,
      scope: "openid profile email offline_access",
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true,
    useRefreshTokensFallback: false,
    httpTimeoutInSeconds: 5,
    authorizeTimeoutInSeconds: 8,
  };

  auth0Client = new Auth0Client(options);
  return auth0Client;
}

export async function useAuth() {
  if (process.server) {
    return {
      client: null,
      user: null,
      isAuthenticated: false,
      getAccessToken: async () => null,
    };
  }

  const client = getClient();

  let isAuthenticated = false;
  let user = null;

  try {
    isAuthenticated = await client.isAuthenticated();
    user = isAuthenticated ? await client.getUser() : null;
  } catch (err) {
    console.error("[auth] init failed", err);
  }

  async function getAccessToken() {
    try {
      return await client.getTokenSilently();
    } catch (err: any) {
      const code = err?.error;

      if (
        code === "missing_refresh_token" ||
        code === "invalid_grant" ||
        code === "login_required" ||
        code === "consent_required" ||
        code === "interaction_required"
      ) {
        return null;
      }

      throw err;
    }
  }

  return {
    client,
    isAuthenticated,
    user,
    getAccessToken,
  };
}

export async function loginWithGoogle(targetUrl?: string | null) {
  if (!process.client) return;
  const { client } = await useAuth();
  if (!client) return;

  await client.loginWithRedirect({
    appState: {
      targetUrl: getLoginRedirectPath(targetUrl),
    },
    authorizationParams: {
      connection: "google-oauth2",
      prompt: "login",
    },
  });
}

export async function login(targetUrl?: string | null) {
  if (!process.client) return;

  const { client } = await useAuth();
  if (!client) return;

  await client.loginWithRedirect({
    appState: {
      targetUrl: getLoginRedirectPath(targetUrl),
    },
    authorizationParams: {
      prompt: "login",
    },
  });
}

export async function logout() {
  if (!process.client) return;

  const { state } = useMeStateV2();
  state.value = { status: "logged-out" };

  const { client } = await useAuth();
  if (!client) return;

  await client.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
}
