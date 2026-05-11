export function getPleaseSignInRedirect(to: { fullPath?: string }) {
  return {
    path: "/please-sign-in",
    query: {
      redirect: to.fullPath || "/",
    },
  };
}
