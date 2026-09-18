export const routes = Object.freeze({
  home: "/",
  login: "/login",
  console: "/console",
  meshes: "/console/meshes",
  mesh: "/console/meshes/$meshId",
  devices: "/console/devices",
  device: "/console/devices/$deviceUuid",
  blueprints: "/console/blueprints",
  consoleChild: Object.freeze({
    index: "/",
    meshes: "meshes",
    mesh: "meshes/$meshId",
    devices: "devices",
    device: "devices/$deviceUuid",
    blueprints: "blueprints",
  }),
} as const);

export function href(path: string, params: Record<string, string>): string {
  return path.replaceAll(/\$([A-Za-z0-9_]+)/g, (_, name: string) => params[name] ?? `$${name}`);
}
