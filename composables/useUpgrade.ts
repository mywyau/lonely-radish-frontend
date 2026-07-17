export async function useUpgrade(billing: "monthly" | "yearly") {
  await navigateTo({
    path: "/billing/success",
    query: {
      mock: "1",
      plan: billing,
    },
  });
}
