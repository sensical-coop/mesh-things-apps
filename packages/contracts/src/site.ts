const CONSOLE = "/console";

/** Console routes the web router nests under `console`, as relative segments. */
export const MESH_SEGMENTS = Object.freeze({ list: "meshes", detail: "meshes/$meshId" } as const);

/** Paths of the one origin that web, onboarding and the API's links share. `$param` as in the web router. */
export const SITE_PATHS = Object.freeze({
  docs: "/docs",
  start: "/start",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  terms: "/terms",
  dpa: "/dpa",
  console: CONSOLE,
  meshes: `${CONSOLE}/${MESH_SEGMENTS.list}`,
  mesh: `${CONSOLE}/${MESH_SEGMENTS.detail}`,
} as const);

/** A path with its `$params` filled in; a param it was not given stays as written. */
export function fillPath(path: string, params: Record<string, string>): string {
  return path.replaceAll(/\$([A-Za-z0-9_]+)/g, (_, name: string) => params[name] ?? `$${name}`);
}

/** `pnpm dev` ports. The web server forwards `/docs` and `/start` to the other two apps. */
export const DEV_PORTS = Object.freeze({
  web: 5173,
  /** The frontend Docker dev server publishes web here. */
  webDocker: 5174,
  docs: 5175,
  onboarding: 5176,
  api: 8787,
} as const);

/** Pages a verification or sign-in link may send the owner back to. Mirrors the API's REGISTRY__FRONTEND_RETURN_PATHS. */
export const RETURN_PATHS: readonly string[] = [SITE_PATHS.start];

/** Exact allow-listed path, or undefined. Rejects scheme, protocol-relative, traversal, and query suffixes. */
export function safeReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && RETURN_PATHS.includes(value) ? value : undefined;
}
