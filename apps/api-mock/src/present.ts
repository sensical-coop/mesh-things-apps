import type { Device } from "@mtt/domain/device/Device";
import { TELEMETRY_VARIANTS } from "./store";

export function haversineKm(a: Device, b: Device): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Synthetic links: each device hears the next, both ways, so the map has something to draw. */
export function meshLinksJson(devices: Device[]) {
  const now = Date.now();
  return devices.slice(1).flatMap((device, i) => {
    const prev = devices[i]!;
    return [
      [prev, device, "direct"],
      [device, prev, "traceroute"],
    ].map(([from, to, source], j) => ({
      from_node: (from as Device).nodeId,
      to_node: (to as Device).nodeId,
      from_device_uuid: (from as Device).uuid,
      to_device_uuid: (to as Device).uuid,
      source,
      samples: 12 - i - j,
      snr_mean: 6 - i * 4 - j,
      last_snr: 5 - i * 4,
      first_seen: new Date(now - 6 * 86_400_000).toISOString(),
      last_seen: new Date(now - (i + 1) * 600_000).toISOString(),
      distance_km: haversineKm(from as Device, to as Device),
    }));
  });
}

export function meshTraceroutesJson(devices: Device[]) {
  if (devices.length < 2) return [];
  const origin = devices[0]!;
  const target = devices[devices.length - 1]!;
  const relays = devices.slice(1, -1).map((d) => d.nodeId);
  const towards = [origin.nodeId, ...relays, target.nodeId];
  return Array.from({ length: 6 }, (_, i) => ({
    id: 100 - i,
    from_node: target.nodeId,
    to_node: origin.nodeId,
    packet_id: 9000 - i,
    request_id: 8000 - i,
    origin: origin.nodeId,
    target: target.nodeId,
    towards,
    snr_towards: towards.slice(1).map((_, j) => 6 - j * 2.5 - i * 0.5),
    back: [...towards].reverse(),
    snr_back: towards.slice(1).map((_, j) => 5 - j * 2 - i * 0.25),
    complete: true,
    gateway_ids: devices.filter((d) => d.isGateway).map((d) => d.nodeId),
    heard_at: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
    distance_km: null,
  }));
}

export const MESH_STATS_RANGES = {
  "1h": { window: "1m", buckets: 60, stepMs: 60_000 },
  "24h": { window: "15m", buckets: 96, stepMs: 900_000 },
  "7d": { window: "1h", buckets: 168, stepMs: 3_600_000 },
  "30d": { window: "6h", buckets: 120, stepMs: 21_600_000 },
} as const;

/** Synthetic but stable traffic: the mock stores no readings, so the figures follow the mesh's devices. */
export function meshStatsJson(meshId: string, range: keyof typeof MESH_STATS_RANGES, devices: Device[]) {
  const { window, buckets, stepMs } = MESH_STATS_RANGES[range];
  const start = Math.floor(Date.now() / stepMs) * stepMs - (buckets - 1) * stepMs;
  const points = (base: number) =>
    Array.from({ length: buckets }, (_, i) => ({
      time: new Date(start + i * stepMs).toISOString(),
      value: Math.max(0, Math.round(base * (1 + 0.4 * Math.sin(i / 6)))),
    }));
  const nodes = devices.filter((device) => !device.isGateway);
  const gateways = devices.filter((device) => device.isGateway);
  const overlap = gateways.length > 1 ? 1.4 : 1;
  const traffic = [
    { portnum: 67, name: "TELEMETRY_APP", points: points(6 * Math.max(nodes.length, 1)) },
    { portnum: 3, name: "POSITION_APP", points: points(1) },
    { portnum: 1, name: "TEXT_MESSAGE_APP", points: points(1) },
    { portnum: null, name: "ENCRYPTED", points: points(0.5) },
  ].map((row) => {
    const receptions = row.points.reduce((n, p) => n + p.value, 0);
    return { ...row, receptions, packets: Math.round(receptions / overlap) };
  });
  const receptions = traffic.reduce((n, row) => n + row.receptions, 0);
  const packets = traffic.reduce((n, row) => n + row.packets, 0);
  const hourlyStart = new Date(start - (start % 3_600_000)).toISOString();
  return {
    mesh_id: meshId,
    range,
    window,
    activity_window: range === "7d" || range === "30d" ? "1d" : "1h",
    hourly_start: hourlyStart,
    generated_at: new Date().toISOString(),
    summary: {
      packets,
      receptions,
      receptions_per_packet: packets ? receptions / packets : null,
      bytes: packets * 24,
      decoded_packets: packets - traffic[traffic.length - 1]!.packets,
      rejected_packets: 0,
      active_nodes: nodes.length,
      channel_utilization_mean: nodes.length ? 6.3 : null,
      channel_utilization_peak: nodes.length ? 14.1 : null,
    },
    traffic,
    airtime: nodes.length
      ? [
          { channel: "device_metrics.air_util_tx", mean: 0.9, peak: 2.7, points: points(1) },
          { channel: "device_metrics.channel_utilization", mean: 6.3, peak: 14.1, points: points(6) },
        ]
      : [],
    nodes: nodes.map((device, i) => ({
      node_id: device.nodeId,
      device_uuid: device.uuid,
      packets: Math.round(packets / (i + 2)),
      receptions: Math.round(receptions / (i + 2)),
    })),
    gateways: gateways.map((device, i) => {
      const share = gateways.length === 1 ? 1 : i === 0 ? 0.6 : 0.4 / (gateways.length - 1);
      return {
        node_id: device.nodeId,
        device_uuid: device.uuid,
        receptions: Math.round(receptions * share),
        share,
        direct_receptions: Math.round(receptions * share * 0.7),
        rx_snr_mean: 5.5 - i * 3,
        rx_rssi_mean: -95 - i * 12,
      };
    }),
    hops: [
      { hops: 0, packets: Math.round(packets * 0.6) },
      { hops: 1, packets: Math.round(packets * 0.3) },
      { hops: 2, packets: Math.round(packets * 0.1) },
    ],
    signal: {
      snr: [-5, -2.5, 0, 2.5, 5, 7.5].map((bucket, i) => ({ bucket, receptions: [2, 5, 9, 14, 10, 4][i]! * 10 })),
      rssi: [-120, -110, -100, -90, -80].map((bucket, i) => ({ bucket, receptions: [3, 9, 15, 8, 2][i]! * 10 })),
    },
    gateway_pairs: gateways.slice(1).map((device) => ({
      gateway_a: gateways[0]!.nodeId,
      gateway_b: device.nodeId,
      device_uuid_a: gateways[0]!.uuid,
      device_uuid_b: device.uuid,
      common_packets: Math.round(packets * 0.4),
      snr_diff_mean: 3.2,
      rssi_diff_mean: 11.5,
    })),
    relays: gateways.flatMap((gateway) =>
      nodes.slice(0, 2).map((node, i) => ({
        gateway_id: gateway.nodeId,
        device_uuid: gateway.uuid,
        relay: node.nodeId & 0xff,
        receptions: 40 - i * 15,
        candidates: [{ node_id: node.nodeId, device_uuid: node.uuid }],
      })),
    ),
    activity: {
      nodes: points(Math.max(nodes.length, 1)).filter((_, i) => i % 6 === 0),
      gateways: points(Math.max(gateways.length, 1)).filter((_, i) => i % 6 === 0),
    },
  };
}

export function telemetryVariantJson(variant: (typeof TELEMETRY_VARIANTS)[number], at: string) {
  return {
    id: variant.id,
    payload_kind: variant.payloadKind,
    name: variant.name,
    description: null,
    default_reading_interval_seconds: variant.defaultReadingIntervalSeconds,
    created_at: at,
    updated_at: at,
  };
}
