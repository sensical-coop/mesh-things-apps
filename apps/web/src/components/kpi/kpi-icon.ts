import {
  RiAlarmWarningLine,
  RiBatteryChargeLine,
  RiCheckboxCircleLine,
  RiCloudy2Line,
  RiDashboard3Line,
  RiDropLine,
  RiFlashlightLine,
  RiMistLine,
  RiPercentLine,
  RiPieChart2Line,
  RiPulseLine,
  RiTempHotLine,
  RiWaterPercentLine,
  RiWifiLine,
  RiWindyLine,
  type RemixiconComponentType,
} from "@remixicon/react";

const kpiIconRules: [string, RemixiconComponentType][] = [
  ["dew", RiDropLine],
  ["temp", RiTempHotLine],
  ["humid", RiWaterPercentLine],
  ["press", RiDashboard3Line],
  ["baro", RiDashboard3Line],
  ["battery", RiBatteryChargeLine],
  ["volt", RiFlashlightLine],
  ["rssi", RiWifiLine],
  ["snr", RiWifiLine],
  ["signal", RiWifiLine],
  ["iaq", RiMistLine],
  ["voc", RiMistLine],
  ["co2", RiMistLine],
  ["pm", RiCloudy2Line],
  ["dust", RiCloudy2Line],
  ["wind", RiWindyLine],
  ["plausib", RiCheckboxCircleLine],
  ["complete", RiPieChart2Line],
  ["alarm", RiAlarmWarningLine],
  ["ratio", RiPercentLine],
];

export function kpiIconFor(text: string): RemixiconComponentType {
  const haystack = text.toLowerCase();
  return kpiIconRules.find(([needle]) => haystack.includes(needle))?.[1] ?? RiPulseLine;
}
