import { isDerivedChannel } from "@mtt/contracts/blueprint";

// Measured and derived channels are shown across Status, Dashboard, and
// Alarms; quality channels (e.g. quality.completeness_ratio) are diagnostics
// about the pipeline itself, not device readings, so they're excluded
// everywhere a measurement list is displayed.
export function isChartableMeasurement(type: { origin: string; channel: string }): boolean {
  return type.origin === "measured" || isDerivedMeasurement(type);
}

/**
 * A postprocessing output. The registry gives these origin "computed" (like
 * quality metrics) and files them all under the flat `derived` namespace.
 */
export function isDerivedMeasurement(type: { channel: string }): boolean {
  return isDerivedChannel(type.channel);
}

export function channelShortName(channel: string): string {
  return channel.slice(channel.indexOf(".") + 1) || channel;
}

/** The name a channel goes by wherever it is listed: its display name, else the channel without its namespace. */
export function measurementLabel(type: { channel: string; display_name?: string | null }): string {
  return type.display_name ?? channelShortName(type.channel);
}
