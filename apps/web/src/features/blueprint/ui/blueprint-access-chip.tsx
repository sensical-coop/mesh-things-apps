import type { PostprocessingBlueprint } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type BlueprintAccessChipProps = {
  blueprint: Pick<PostprocessingBlueprint, "is_public">;
};

export function BlueprintAccessChip({ blueprint }: BlueprintAccessChipProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <Chip variant="caption" color={blueprint.is_public ? "blue" : "neutral"} className="rounded-full">
      {blueprint.is_public
        ? formatMessage({ id: "feature.blueprint.access.public", defaultMessage: "Public" })
        : formatMessage({ id: "feature.blueprint.access.private", defaultMessage: "Private" })}
    </Chip>
  );
}
