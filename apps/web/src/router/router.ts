const consoleRoot = "/console" as const;

const consoleChild = Object.freeze({
  index: "/",
  meshes: "meshes",
  mesh: "meshes/$meshId",
  devices: "devices",
  device: "devices/$deviceUuid",
  alarms: "alarms",
  blueprints: "blueprints",
  blueprint: "blueprints/$blueprintId",
  sources: "sources",
  sinks: "sinks",
  archive: "archive",
  csvDownloads: "csv-downloads",
  operatorRequests: "operator-requests",
  operatorRequest: "operator-requests/$requestId",
  dataDeletions: "data-deletions",
  profile: "profile",
} as const);

export const routes = Object.freeze({
  home: "/",
  docs: "/docs",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyPending: "/verify-pending",
  verifyEmail: "/verify-email",
  start: "/start",
  terms: "/terms",
  dpa: "/dpa",
  console: consoleRoot,
  meshes: `${consoleRoot}/${consoleChild.meshes}`,
  mesh: `${consoleRoot}/${consoleChild.mesh}`,
  devices: `${consoleRoot}/${consoleChild.devices}`,
  device: `${consoleRoot}/${consoleChild.device}`,
  alarms: `${consoleRoot}/${consoleChild.alarms}`,
  blueprints: `${consoleRoot}/${consoleChild.blueprints}`,
  blueprint: `${consoleRoot}/${consoleChild.blueprint}`,
  sources: `${consoleRoot}/${consoleChild.sources}`,
  sinks: `${consoleRoot}/${consoleChild.sinks}`,
  archive: `${consoleRoot}/${consoleChild.archive}`,
  csvDownloads: `${consoleRoot}/${consoleChild.csvDownloads}`,
  operatorRequests: `${consoleRoot}/${consoleChild.operatorRequests}`,
  operatorRequest: `${consoleRoot}/${consoleChild.operatorRequest}`,
  dataDeletions: `${consoleRoot}/${consoleChild.dataDeletions}`,
  profile: `${consoleRoot}/${consoleChild.profile}`,
  consoleChild,
} as const);

export function href(path: string, params: Record<string, string>): string {
  return path.replaceAll(/\$([A-Za-z0-9_]+)/g, (_, name: string) => params[name] ?? `$${name}`);
}
