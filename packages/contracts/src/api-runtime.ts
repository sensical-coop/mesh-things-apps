import type { CreateClientConfig } from "./generated/client.gen";

export const DEFAULT_API_URL = "http://localhost:8787";

function apiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return DEFAULT_API_URL;
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: apiBaseUrl(),
  credentials: "include",
});
