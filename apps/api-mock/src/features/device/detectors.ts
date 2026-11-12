// Mirrors meshtastic-things' common/detectors.py DETECTOR_SPECS exactly — a
// fixed catalog. "measurement" scoped kinds go in a
// channel's enabled_detectors; the one "device" scoped kind (absence) hangs
// off Device.absence_detection_enabled instead and is deliberately excluded from the
// settable list below.
export type DetectorSpec = {
  name: string;
  scope: "measurement" | "device";
  requires: string[];
  description: string;
};

export const DETECTOR_CATALOG: DetectorSpec[] = [
  {
    name: "flat_value",
    scope: "measurement",
    requires: [],
    description: "Fires when a channel reports the same value for a whole window.",
  },
  {
    name: "range",
    scope: "measurement",
    requires: ["valid_min", "valid_max"],
    description: "Fires when a reading falls outside the range configured for this device.",
  },
  {
    name: "completeness",
    scope: "measurement",
    requires: ["reading_interval_seconds"],
    description: "Fires when a channel's history has gaps against its expected reading interval.",
  },
  {
    name: "absence",
    scope: "device",
    requires: ["publish_interval_seconds"],
    description: "Fires when a device stops publishing for several of its publish intervals.",
  },
];

export const MEASUREMENT_DETECTORS = DETECTOR_CATALOG.filter((spec) => spec.scope === "measurement")
  .map((spec) => spec.name)
  .sort();
