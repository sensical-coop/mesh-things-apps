// Baked in at build time from the repo-root .env. The docs app is its own origin;
// this is the web app the header mark links to.
export const webAppUrl = import.meta.env.VITE_WEB_URL || "http://localhost:5173";
