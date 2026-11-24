import type { TelemetryVariantRead } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMe } from "@/features/auth/use-me";
import { variantTitle } from "@/features/device/model";
import { deviceRepository } from "@/features/device/repository";

export type TelemetryVariantOption = { value: string; label: string };

/** One catalog request: filter options plus the rows the alarms list names groups with. */
export function useTelemetryVariants(): { options: TelemetryVariantOption[]; variants: TelemetryVariantRead[] } {
  const { me } = useMe();
  const catalog = useQuery({ ...deviceRepository.variantCatalog(), enabled: me != null });
  const options = useMemo(
    () =>
      (catalog.data ?? [])
        .map((variant) => ({ value: variant.id, label: variantTitle(variant) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalog.data],
  );
  return { options, variants: catalog.data ?? [] };
}
