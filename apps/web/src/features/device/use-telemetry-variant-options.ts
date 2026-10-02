import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { deviceRepository } from "@/features/device/repository";

export type TelemetryVariantOption = { value: string; label: string };

/** The variant catalog as filter options; empty for visitors, who can't read it. */
export function useTelemetryVariantOptions(): TelemetryVariantOption[] {
  const { me } = useOwnerDirectory();
  const catalog = useQuery({ ...deviceRepository.variantCatalog(), enabled: me != null, retry: false });
  return useMemo(
    () =>
      (catalog.data ?? [])
        .map((variant) => ({ value: variant.id, label: variant.name ?? variant.payload_kind }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalog.data],
  );
}
