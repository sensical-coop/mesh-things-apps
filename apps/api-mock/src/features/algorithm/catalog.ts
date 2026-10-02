import type { Algorithm } from "@mtt/contracts/types";

// The algorithm registry of meshtastic-things (common/algorithms), as GET /algorithms returns it.
// Refresh it from a running registry: `curl /algorithms`.
export const ALGORITHMS: Algorithm[] = [
  {
    name: "absolute_humidity",
    inputs: ["temperature", "relative_humidity"],
    outputs: ["absolute_humidity"],
    params: [],
    mode: "pointwise",
    doc: "Absolute humidity in g/m3 from temperature (degC) and RH (%).",
    output_units: {
      absolute_humidity: "g/m3",
    },
  },
  {
    name: "dew_point",
    inputs: ["temperature", "relative_humidity"],
    outputs: ["dew_point"],
    params: [],
    mode: "pointwise",
    doc: "Dew point in degC from temperature (degC) and relative humidity (%).\n\n    Magnus-Tetens approximation, accurate to about 0.4 degC over\n    0-60 degC / 1-100 %RH.",
    output_units: {
      dew_point: "degC",
    },
  },
  {
    name: "ec_sensor_ppb",
    inputs: ["working", "auxiliary", "temperature"],
    outputs: ["concentration_ppb"],
    params: [
      {
        name: "sensitivity",
        calibration: true,
        required: true,
        default: null,
        unit: "mV/ppb",
        doc: "Working electrode response per ppb, non-zero.",
      },
      {
        name: "working_zero",
        calibration: true,
        required: false,
        default: 0.0,
        unit: "mV",
        doc: "Working electrode reading in clean air.",
      },
      {
        name: "auxiliary_zero",
        calibration: true,
        required: false,
        default: 0.0,
        unit: "mV",
        doc: "Auxiliary electrode reading in clean air.",
      },
      {
        name: "temperature_coefficient",
        calibration: false,
        required: false,
        default: 0.0,
        unit: "1/degC",
        doc: "Auxiliary correction per degree from the reference.",
      },
      {
        name: "reference_temperature",
        calibration: false,
        required: false,
        default: 20.0,
        unit: "degC",
        doc: "",
      },
    ],
    mode: "pointwise",
    doc: "Electrochemical four-electrode sensor -> concentration in ppb.\n\n    The auxiliary electrode is not exposed to the target gas, so it tracks\n    the same thermal/baseline drift as the working electrode without the\n    signal. Subtracting it (after its own temperature correction) is what\n    isolates the gas response:\n\n        ppb = ((working - working_zero) - n_t * (auxiliary - auxiliary_zero))\n              / sensitivity\n\n    where n_t = 1 + temperature_coefficient * (temperature - reference).\n\n    `sensitivity` is in the same units as the electrode readings per ppb\n    (e.g. mV/ppb) - it must be non-zero.",
    output_units: {
      concentration_ppb: "ppb",
    },
  },
  {
    name: "linear_temperature_correction",
    inputs: ["value", "temperature"],
    outputs: ["corrected"],
    params: [
      {
        name: "coefficient",
        calibration: true,
        required: true,
        default: null,
        unit: "1/degC",
        doc: "Fractional change in reading per degree C.",
      },
      {
        name: "reference_temperature",
        calibration: false,
        required: false,
        default: 20.0,
        unit: "degC",
        doc: "",
      },
    ],
    mode: "pointwise",
    doc: "Remove a linear temperature dependence from a reading.\n\n    corrected = value / (1 + coefficient * (temperature - reference))\n\n    `coefficient` is the fractional change in reading per degree C.",
    output_units: {
      corrected: "@value",
    },
  },
  {
    name: "lookup_table",
    inputs: ["value"],
    outputs: ["calibrated"],
    params: [
      {
        name: "points",
        calibration: true,
        required: true,
        default: null,
        unit: null,
        doc: "[[raw, calibrated], ...] pairs, at least one. Interpolated linearly, clamped at the ends.",
      },
    ],
    mode: "pointwise",
    doc: "Non-linear calibration curve, linearly interpolated between points.",
    output_units: {
      calibrated: "@value",
    },
  },
  {
    name: "offset_scale",
    inputs: ["value"],
    outputs: ["calibrated"],
    params: [
      {
        name: "scale",
        calibration: true,
        required: false,
        default: 1.0,
        unit: null,
        doc: "Multiplier applied before the offset.",
      },
      {
        name: "offset",
        calibration: true,
        required: false,
        default: 0.0,
        unit: null,
        doc: "Added after scaling, in the channel's unit.",
      },
    ],
    mode: "pointwise",
    doc: "Linear calibration: value * scale + offset.",
    output_units: {
      calibrated: "@value",
    },
  },
  {
    name: "ppb_to_ugm3",
    inputs: ["concentration_ppb", "temperature"],
    outputs: ["concentration_ugm3"],
    params: [
      {
        name: "molecular_weight",
        calibration: false,
        required: true,
        default: null,
        unit: "g/mol",
        doc: "For example NO2 46.01, O3 48.00, CO 28.01, SO2 64.07.",
      },
      {
        name: "pressure_hpa",
        calibration: false,
        required: false,
        default: 1013.25,
        unit: "hPa",
        doc: "",
      },
    ],
    mode: "pointwise",
    doc: "Convert a volume mixing ratio (ppb) to a mass concentration (ug/m3).\n\n    Needs temperature (and ideally pressure) because the conversion depends\n    on the molar volume of air at the actual conditions, not at STP:\n\n        molar_volume = 22.414 * (T/273.15) * (1013.25/P)\n        ug/m3 = ppb * molecular_weight / molar_volume\n\n    `molecular_weight` in g/mol - e.g. NO2 46.01, O3 48.00, CO 28.01,\n    SO2 64.07.",
    output_units: {
      concentration_ugm3: "ug/m3",
    },
  },
];

export function algorithmNamed(name: string): Algorithm | undefined {
  return ALGORITHMS.find((algorithm) => algorithm.name === name);
}
