/** Base URL of the HTTP API, baked in at build time. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
