// src/api.js
import axios from "axios";
import { getToken, isTokenExpired, clearToken } from "./services/tokenService";

// Prefer Vite env var, fall back to dev proxy path
const baseURL = import.meta?.env?.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header if token present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    if (isTokenExpired(token)) {
      clearToken();
      try {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      } catch {}
      return Promise.reject(new Error("Token expired"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Global 401 handler (keeps session clean)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.config?.url || "");
    const isBillingCall = url.includes("/billing/");
    if (status === 401 && !isBillingCall) {
      clearToken();
      try {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      } catch {}
    }
    return Promise.reject(err);
  }
);
