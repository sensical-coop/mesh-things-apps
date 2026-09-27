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
  return type.channel.startsWith("derived.");
}

/** A channel's short name, as the latest-reading cards show it: `environment_metrics.temperature` → `temperature`. */
export function channelShortName(channel: string): string {
  return channel.slice(channel.indexOf(".") + 1) || channel;
}
