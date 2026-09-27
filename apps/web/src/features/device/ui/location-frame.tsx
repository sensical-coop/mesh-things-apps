import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Map, MapControls, MapMarker, MarkerContent, useMap } from "@mtt/ui/components/ui/map";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiMapPinLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { deviceTitle, roundCoordinate } from "@/features/device/model";
import { deviceRepository } from "@/features/device/repository";
import { DeviceDot } from "@/features/device/ui/device-dot";
import { DeviceMapPin } from "@/features/device/ui/map-pin";
import { DeviceLocationSourceBadge } from "@/features/device/ui/location-source-badge";

type LngLat = { lng: number; lat: number };

// Where the picker opens for a device that has never reported a position.
const WORLD_VIEW = { center: [0, 20] as [number, number], zoom: 1.5 };

// The map's `center` only seeds the first render; follow the saved position
// when it moves afterwards (settings dialog, or a save from the picker).
function FollowPoint({ point }: { point: LngLat | null }): null {
  const { map } = useMap();
  const lng = point?.lng;
  const lat = point?.lat;
  const first = useRef(true);
  useEffect(() => {
    if (!map || lng === undefined || lat === undefined) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: reduce ? 0 : 600 });
  }, [map, lng, lat]);
  return null;
}

function PickOnClick({ onPick }: { onPick: (point: LngLat) => void }): null {
  const { map } = useMap();
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    const handleClick = (event: { lngLat: LngLat }) => onPickRef.current(event.lngLat);
    map.on("click", handleClick);
    canvas.style.cursor = "crosshair";
    return () => {
      map.off("click", handleClick);
      canvas.style.cursor = "";
    };
  }, [map]);
  return null;
}

export type DeviceLocationFrameProps = {
  device: DeviceRead | undefined;
  pending: boolean;
  canEdit: boolean;
};

export function DeviceLocationFrame({ device, pending, canEdit }: DeviceLocationFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LngLat | null>(null);
  const [editing, setEditing] = useState(false);
  const saved: LngLat | null =
    device?.latitude != null && device.longitude != null ? { lng: device.longitude, lat: device.latitude } : null;
  const pin = editing ? (draft ?? saved) : saved;
  const update = useMutation({
    ...deviceRepository.update(),
    onSuccess: async () => {
      if (!device) return;
      await queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: deviceRepository.retrieveKey({ path: { device_uuid: device.uuid } }),
      });
      stopEditing();
    },
  });

  function pick(point: LngLat) {
    setDraft({ lng: roundCoordinate(point.lng), lat: roundCoordinate(point.lat) });
  }

  function stopEditing() {
    setEditing(false);
    setDraft(null);
    update.reset();
  }

  function save() {
    if (!device || !draft) return;
    update.mutate({
      path: { device_uuid: device.uuid },
      body: { latitude: draft.lat, longitude: draft.lng },
    });
  }

  const label = device ? deviceTitle(device) : "";
  const description = editing
    ? formatMessage({
        id: "feature.device.location.editHint",
        defaultMessage:
          "Click the map or drag the pin. Once saved, the position is set manually and the node's own reports no longer move it.",
      })
    : !saved
      ? formatMessage({
          id: "page.devices.detail.location.noCoords",
          defaultMessage: "This device has no coordinates yet.",
        })
      : device?.location_overridden
        ? formatMessage({
            id: "feature.device.location.manualHint",
            defaultMessage: "Set by hand. The node's own position reports are ignored.",
          })
        : formatMessage({
            id: "page.devices.detail.location.hasCoords",
            defaultMessage: "Last reported coordinates on the map.",
          });

  return (
    <Frame className="shadow-card">
      <FrameHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <FrameTitle>{formatMessage({ id: "page.devices.detail.location.title", defaultMessage: "Location" })}</FrameTitle>
            {device && saved ? <DeviceLocationSourceBadge overridden={device.location_overridden} /> : null}
          </div>
          <FrameDescription>
            {description}
          </FrameDescription>
        </div>
        {device && canEdit && !editing ? (
          <Button type="button" size="xs" variant="secondary" leadingIcon={RiMapPinLine} onClick={() => setEditing(true)}>
            {saved
              ? formatMessage({ id: "feature.device.location.edit", defaultMessage: "Edit location" })
              : formatMessage({ id: "feature.device.location.set", defaultMessage: "Set location" })}
          </Button>
        ) : null}
      </FrameHeader>
      <FramePanel className="flex min-h-80 flex-1 flex-col gap-4">
        {pending ? (
          <div className="min-h-80 flex-1">
            <SkeletonRows rows={6} />
          </div>
        ) : null}
        {saved || editing ? (
          <div className="oa-arrive oa-squircle-inset min-h-80 flex-1 overflow-hidden">
            <Map
              center={saved ? [saved.lng, saved.lat] : WORLD_VIEW.center}
              zoom={saved ? 14 : WORLD_VIEW.zoom}
              className="h-full min-h-80 w-full"
            >
              <MapControls showLocate={editing} onLocate={(coords) => pick({ lng: coords.longitude, lat: coords.latitude })} />
              {editing ? <PickOnClick onPick={pick} /> : <FollowPoint point={saved} />}
              {pin ? (
                <MapMarker longitude={pin.lng} latitude={pin.lat} draggable={editing} onDragEnd={pick}>
                  <MarkerContent>
                    {editing ? (
                      <DeviceDot
                        isGateway={device?.is_gateway ?? false}
                        size="md"
                        className="cursor-grab shadow-dropdown active:cursor-grabbing"
                      />
                    ) : (
                      <DeviceMapPin isGateway={device?.is_gateway ?? false} label={label} pulse />
                    )}
                  </MarkerContent>
                </MapMarker>
              ) : null}
            </Map>
          </div>
        ) : (
          !pending && (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.location.noCoordsToPlot",
                defaultMessage: "No coordinates to plot.",
              })}
            </StatusCopy>
          )
        )}
        {editing ? (
          <div className="flex flex-col gap-3">
            <p className="text-caption-1-regular text-text-secondary tabular-nums" aria-live="polite">
              {draft
                ? `${draft.lat}, ${draft.lng}`
                : formatMessage({
                    id: "feature.device.location.noDraft",
                    defaultMessage: "No new position picked yet.",
                  })}
            </p>
            {update.error ? (
              <StatusCopy>
                {formatMessage({ id: "feature.device.location.saveFailed", defaultMessage: "Location wasn't saved." })}
                {formLevelMessage(update.error) ? ` ${formLevelMessage(update.error)}` : ""}
              </StatusCopy>
            ) : null}
            <div className={dialogActionsClass}>
              <Button type="button" variant="secondary" size="small" onClick={stopEditing}>
                {formatMessage({ id: "feature.device.location.cancel", defaultMessage: "Cancel" })}
              </Button>
              <Button type="button" size="small" disabled={!draft || update.isPending} onClick={save}>
                {update.isPending
                  ? formatMessage({ id: "feature.device.location.saving", defaultMessage: "Saving" })
                  : formatMessage({ id: "feature.device.location.save", defaultMessage: "Save location" })}
              </Button>
            </div>
          </div>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
