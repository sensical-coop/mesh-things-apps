export const routes = Object.freeze({
  home: "/",
  login: "/login",
  signup: "/signup",
  verifyPending: "/verify-pending",
  verifyEmail: "/verify-email",
  terms: "/terms",
  console: "/console",
  meshes: "/console/meshes",
  mesh: "/console/meshes/$meshId",
  devices: "/console/devices",
  device: "/console/devices/$deviceUuid",
  alarms: "/console/alarms",
  blueprints: "/console/blueprints",
  profile: "/console/profile",
  consoleChild: Object.freeze({
    index: "/",
    meshes: "meshes",
    mesh: "meshes/$meshId",
    devices: "devices",
    device: "devices/$deviceUuid",
    alarms: "alarms",
    blueprints: "blueprints",
    profile: "profile",
  }),
} as const);

export function href(path: string, params: Record<string, string>): string {
  return path.replaceAll(/\$([A-Za-z0-9_]+)/g, (_, name: string) => params[name] ?? `$${name}`);
}
