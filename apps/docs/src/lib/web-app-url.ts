// Baked in at build time. Production must set VITE_WEB_URL to the public web origin.
// The localhost fallback exists only for `pnpm dev`, so a production build never
// sends visitors to their own machine.
export const webAppUrl = import.meta.env.VITE_WEB_URL || (import.meta.env.DEV ? "http://localhost:5173" : "");
