import type { DeviceRead, TelemetryVariantRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { DeviceAlarmsRow } from "./device-alarms-row";

/** Devices shown before "Show more"; collapsed rows cost no requests, this only keeps the page short. */
const PAGE_SIZE = 25;
/** A mesh this small opens every device, as the page did before it grew a request per device. */
const AUTO_EXPAND_MAX = 5;

export type MeshAlarmsListProps = {
  devices: readonly DeviceRead[];
  variants: readonly TelemetryVariantRead[];
};

/** One mesh's devices, collapsed unless the mesh is small. Key it by mesh so state resets on switching. */
export function MeshAlarmsList({ devices, variants }: MeshAlarmsListProps): ReactElement {
  const { formatMessage } = useIntl();
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const autoExpand = devices.length <= AUTO_EXPAND_MAX;
  const shown = devices.slice(0, visible);
  const remaining = devices.length - shown.length;

  function toggle(uuid: string) {
    setToggled((current) => new Map(current).set(uuid, !(current.get(uuid) ?? autoExpand)));
  }

  return (
    <div className="flex flex-col gap-6">
      {shown.map((device) => (
        <DeviceAlarmsRow
          key={device.uuid}
          device={device}
          variants={variants}
          expanded={toggled.get(device.uuid) ?? autoExpand}
          onToggle={() => toggle(device.uuid)}
        />
      ))}
      {remaining > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption-1-regular text-text-secondary">
          <span>
            {formatMessage(
              { id: "page.alarms.list.shownOf", defaultMessage: "{shown} of {total} devices" },
              { shown: shown.length, total: devices.length },
            )}
          </span>
          <Button type="button" size="xs" variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
            {formatMessage(
              { id: "page.alarms.list.showMore", defaultMessage: "Show {count} more" },
              { count: Math.min(PAGE_SIZE, remaining) },
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
