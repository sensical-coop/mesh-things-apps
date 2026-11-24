import { defineMessages, type MessageDescriptor } from "react-intl";
import { routes } from "@/router";

export type NavItem = {
  to: string;
  label: MessageDescriptor;
  /** Shown under the label in a header dropdown. */
  description?: MessageDescriptor;
  /** Highlighted only on its own page, not on its children. */
  exact?: boolean;
  /** Sources, sinks and the archive are for operators. */
  operatorOnly?: boolean;
};

export type NavGroup = { title: MessageDescriptor; items: readonly NavItem[] };

const m = defineMessages({
  meshes: { id: "console.nav.meshes", defaultMessage: "Meshes" },
  devices: { id: "console.nav.devices", defaultMessage: "Devices" },
  alarms: { id: "console.nav.alarms", defaultMessage: "Alarms" },
  alarmsDescription: {
    id: "console.header.automation.alarmsDescription",
    defaultMessage: "Alarms for each measurement",
  },
  blueprints: { id: "console.nav.blueprints", defaultMessage: "Blueprints" },
  blueprintsDescription: {
    id: "console.header.automation.blueprintsDescription",
    defaultMessage: "Computations on incoming readings",
  },
  csvDownloads: { id: "console.nav.csvDownloads", defaultMessage: "CSV downloads" },
  csvDownloadsDescription: {
    id: "console.header.data.csvDownloadsDescription",
    defaultMessage: "Download meshes' data as CSV files",
  },
  archive: { id: "console.nav.archive", defaultMessage: "Archive" },
  archiveDescription: {
    id: "console.header.data.archiveDescription",
    defaultMessage: "Parquet files of the devices you store in S3",
  },
  sources: { id: "console.nav.sources", defaultMessage: "Sources" },
  sourcesDescription: {
    id: "console.header.data.sourcesDescription",
    defaultMessage: "Remote MQTT brokers bridged into this instance",
  },
  sinks: { id: "console.nav.sinks", defaultMessage: "Sinks" },
  sinksDescription: {
    id: "console.header.data.sinksDescription",
    defaultMessage: "Readings published via MQTT",
  },
  automation: { id: "console.nav.automation", defaultMessage: "Automation" },
  data: { id: "console.nav.data", defaultMessage: "Data" },
});

export const NAV_PAGES: readonly NavItem[] = [
  { to: routes.meshes, label: m.meshes, exact: true },
  { to: routes.devices, label: m.devices },
];

const AUTOMATION: readonly NavItem[] = [
  { to: routes.alarms, label: m.alarms, description: m.alarmsDescription },
  { to: routes.blueprints, label: m.blueprints, description: m.blueprintsDescription },
];

/** What the footer's Product column lists. */
export const NAV_PRODUCT: readonly NavItem[] = [...NAV_PAGES, ...AUTOMATION];

export const NAV_GROUPS: readonly NavGroup[] = [
  { title: m.automation, items: AUTOMATION },
  {
    title: m.data,
    items: [
      { to: routes.csvDownloads, label: m.csvDownloads, description: m.csvDownloadsDescription },
      { to: routes.archive, label: m.archive, description: m.archiveDescription, operatorOnly: true },
      { to: routes.sources, label: m.sources, description: m.sourcesDescription, operatorOnly: true },
      { to: routes.sinks, label: m.sinks, description: m.sinksDescription, operatorOnly: true },
    ],
  },
];
