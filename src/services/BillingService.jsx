import api from "../api";

export async function createBillingSession(currency) {
  const query = currency ? `?currency=${encodeURIComponent(String(currency).toLowerCase())}` : "";
  const { data } = await api.post(`/billing/checkout-session${query}`);
  return data || {};
}

export async function getMySubscription() {
  const { data } = await api.get("/subscriptions/me");
  return data;
}
