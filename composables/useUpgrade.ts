export async function useUpgrade(billing: "monthly" | "quarterly" | "yearly") {
  const result = await $fetch<{ url: string }>("/api/stripe/checkout", {
    method: "POST",
    body: { billing },
  });
  if (!result.url) throw new Error("Stripe Checkout did not return a destination");
  await navigateTo(result.url, { external: true });
}
