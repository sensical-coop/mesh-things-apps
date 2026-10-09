import type { DeviceRead, MeshTraffic, Point, RfLink } from "@mtt/contracts";

export const MESH_STATS_RANGES = ["1h", "24h", "7d", "30d"] as const;
export type MeshStatsRange = (typeof MESH_STATS_RANGES)[number];

const UNIT_MS: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

/** The API's bucket size (`15m`, `6h`) in milliseconds, or null when it doesn't parse. */
export function windowMs(window: string): number | null {
  const match = /^(\d+)([mhd])$/.exec(window);
  return match ? Number(match[1]) * UNIT_MS[match[2]!]! : null;
}

/** Receptions per bucket across every payload kind, oldest first. */
export function totalTraffic(traffic: MeshTraffic[]): Point[] {
  const byTime = new Map<string, number>();
  for (const row of traffic) {
    for (const point of row.points) {
      byTime.set(point.time, (byTime.get(point.time) ?? 0) + (typeof point.value === "number" ? point.value : 0));
    }
  }
  return [...byTime].sort(([a], [b]) => Date.parse(a) - Date.parse(b)).map(([time, value]) => ({ time, value }));
}

/** `TEXT_MESSAGE_APP` -> `text message`: Meshtastic's portnum name without the shouting. */
export function portnumLabel(name: string): string {
  return name.replace(/_APP$/, "").replace(/_/g, " ").toLowerCase();
}

/** A node number in the `!aabbccdd` form Meshtastic shows. */
export function nodeHex(nodeId: number): string {
  return `!${nodeId.toString(16).padStart(8, "0")}`;
}

/** A node as the mesh's device list names it, or its node ID in hex. */
export function trafficNodeLabel(
  entry: { node_id: number; device_uuid: string | null },
  devices: Map<string, DeviceRead>,
  title: (device: DeviceRead) => string,
): string {
  const device = entry.device_uuid ? devices.get(entry.device_uuid) : undefined;
  return device ? title(device) : nodeHex(entry.node_id);
}

/** The links window that matches a stats range; links are only kept by the day. */
export const LINK_WINDOWS: Record<MeshStatsRange, "24h" | "7d" | "30d"> = {
  "1h": "24h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
};

export const RANGE_MS: Record<MeshStatsRange, number> = {
  "1h": 3_600_000,
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
};

/** Two nodes that hear each other, whichever way and by whatever source. */
export type LinkPair = {
  key: string;
  a: number;
  b: number;
  /** The best mean SNR among the pair's links, in dB. */
  snr: number;
  samples: number;
  sources: string[];
  distanceKm: number | null;
  lastSeen: string;
};

/** Merges directional links into one entry per pair of nodes, longest first. */
export function pairLinks(links: RfLink[]): LinkPair[] {
  const pairs = new Map<string, LinkPair>();
  for (const link of links) {
    const [a, b] = link.from_node < link.to_node ? [link.from_node, link.to_node] : [link.to_node, link.from_node];
    const key = `${a}-${b}`;
    const pair = pairs.get(key);
    if (!pair) {
      pairs.set(key, {
        key,
        a,
        b,
        snr: link.snr_mean,
        samples: link.samples,
        sources: [link.source],
        distanceKm: link.distance_km,
        lastSeen: link.last_seen,
      });
      continue;
    }
    pair.snr = Math.max(pair.snr, link.snr_mean);
    pair.samples += link.samples;
    if (!pair.sources.includes(link.source)) pair.sources.push(link.source);
    if (Date.parse(link.last_seen) > Date.parse(pair.lastSeen)) pair.lastSeen = link.last_seen;
  }
  return [...pairs.values()].sort(
    (x, y) => (y.distanceKm ?? -1) - (x.distanceKm ?? -1) || y.samples - x.samples,
  );
}

/** 0 for a link at the edge of decoding (-15 dB) to 1 for a strong one (+10 dB). */
export function snrStrength(snr: number): number {
  return Math.min(1, Math.max(0, (snr + 15) / 25));
}

/** [longitude, latitude] of each device with a position, by node number. */
export function nodePositions(devices: DeviceRead[]): Map<number, [number, number]> {
  const positions = new Map<number, [number, number]>();
  for (const device of devices) {
    if (device.latitude != null && device.longitude != null) {
      positions.set(device.node_id, [device.longitude, device.latitude]);
    }
  }
  return positions;
}

/** The positioned stretch of a route; nodes without a position are skipped. */
export function routeCoordinates(nodes: number[], positions: Map<number, [number, number]>): [number, number][] {
  return nodes.flatMap((node) => {
    const position = positions.get(node);
    return position ? [position] : [];
  });
}

/** Devices first registered or discovered within the last `spanMs`. */
export function newDevices(devices: DeviceRead[], spanMs: number, now: number): number {
  return devices.filter((device) => now - Date.parse(device.discovered_at ?? device.created_at) <= spanMs).length;
}

/** Area in km² of the convex hull around [longitude, latitude] points, or null for fewer than three. */
export function hullAreaKm2(points: [number, number][]): number | null {
  if (points.length < 3) return null;
  // Equirectangular around the centroid: plenty accurate at mesh scale.
  const lat0 = (points.reduce((sum, [, lat]) => sum + lat, 0) / points.length) * (Math.PI / 180);
  const kmPerDegree = 111.32;
  const flat = points.map(([lon, lat]) => [lon * kmPerDegree * Math.cos(lat0), lat * kmPerDegree] as [number, number]);
  flat.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (pts: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of pts) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const hull = [...half(flat), ...half([...flat].reverse())];
  if (hull.length < 3) return null;
  let twice = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i]!;
    const [x2, y2] = hull[(i + 1) % hull.length]!;
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

/** Candidates for a relay byte that were heard directly by the gateway, so most likely the relay. */
export function confirmedRelays(candidates: number[], gatewayId: number, links: RfLink[]): Set<number> {
  const heard = new Set(links.filter((l) => l.to_node === gatewayId).map((l) => l.from_node));
  return new Set(candidates.filter((node) => heard.has(node)));
}

/**
 * A position history as [longitude, latitude] pairs in time order, from its two channels.
 * Repeats in a row are dropped: a packet heard by several gateways is stored once per gateway.
 */
export function positionTrack(latitudes: Point[], longitudes: Point[]): [number, number][] {
  const lon = new Map(longitudes.map((p) => [p.time, p.value]));
  const ordered = latitudes
    .flatMap((p) => {
      const lng = lon.get(p.time);
      return typeof p.value === "number" && typeof lng === "number" ? [{ time: p.time, at: [lng, p.value] as [number, number] }] : [];
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return ordered
    .filter((p, i) => i === 0 || p.at[0] !== ordered[i - 1]!.at[0] || p.at[1] !== ordered[i - 1]!.at[1])
    .map((p) => p.at);
}

/** Nodes and edges for a graph of every link pair, positioned or not. */
export function linkGraph(pairs: LinkPair[]): { nodes: number[]; edges: { a: number; b: number; snr: number }[] } {
  const nodes = new Set<number>();
  for (const pair of pairs) {
    nodes.add(pair.a);
    nodes.add(pair.b);
  }
  return { nodes: [...nodes].sort((x, y) => x - y), edges: pairs.map(({ a, b, snr }) => ({ a, b, snr })) };
}
