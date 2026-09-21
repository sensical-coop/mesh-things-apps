// Measured and derived channels are shown across Status, Dashboard, and
// Alarms; quality channels (e.g. quality.completeness_ratio) are diagnostics
// about the pipeline itself, not device readings, so they're excluded
// everywhere a measurement list is displayed.
export function isChartableMeasurement(type: { origin: string; channel: string }): boolean {
  if (type.channel.startsWith("quality.")) return false;
  return type.origin === "measured" || type.origin === "derived";
}
