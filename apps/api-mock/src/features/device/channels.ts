import { isDerivedChannel } from "@mtt/contracts/blueprint";
import type { Device } from "@mtt/domain/device/Device";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import { DEVICE_NODE_ID, deviceMeasurementId, type Store } from "../../store";

export type DeviceChannel = { id: string; type: MeasurementType; producedBy: string | null };

export async function deviceChannels(store: Store, device: Device): Promise<DeviceChannel[]> {
  const types = store.measurements;
  // Only the Porch node reports telemetry in this mock.
  const reported =
    device.uuid === DEVICE_NODE_ID
      ? types.flatMap((type, i) => (isDerivedChannel(type.channel) ? [] : [{ id: deviceMeasurementId(i), type, producedBy: null }]))
      : [];
  const derived = store.postprocessings
    .filter((row) => row.deviceUuid === device.uuid)
    .flatMap((row) =>
      row.outputs.flatMap((output) => {
        const type = types.find((candidate) => candidate.id === output.measurementTypeId);
        return type ? [{ id: output.measurementId, type, producedBy: row.id }] : [];
      }),
    );
  return [...reported, ...derived];
}
