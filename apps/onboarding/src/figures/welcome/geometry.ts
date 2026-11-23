import { pointOnRoute } from "../parts/air-waves";
import { ROUTE, ROUTE_START } from "../parts/mesh-scene";

export function packetTransform(progress: number): string {
  const at = pointOnRoute(ROUTE, progress);
  return `translate(${(at[0] - ROUTE_START[0]).toFixed(2)} ${(at[1] - ROUTE_START[1]).toFixed(2)})`;
}
