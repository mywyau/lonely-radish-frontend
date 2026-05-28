export async function useUpgrade(billing: "monthly" | "yearly") {
  const { getAccessToken } = await useAuth();

  const token = await getAccessToken();

  const res = await $fetch("/api/stripe/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: { billing },
  });

  window.location.replace(res.url);
}
