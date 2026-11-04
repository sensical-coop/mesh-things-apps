import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { authRepository } from "@/features/auth/repository";
import { writeStartSearch } from "@/start-search";
import type { StartStep } from "@/start-step";
import { StartProgress } from "./start-progress";

export function StartHeader({
  step,
  meshId,
  signedInLabel,
}: {
  step: StartStep;
  meshId?: string;
  signedInLabel?: string;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const logout = useMutation({
    ...authRepository.logout(),
    onSuccess: () => {
      queryClient.clear();
      writeStartSearch({ step: "account" }, "replace");
    },
  });
  const later = meshId ? `/console/meshes/${meshId}` : signedInLabel ? "/console/meshes" : "/";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <a href="/" aria-label="Sensical" className="rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring">
          <BrandMark className="h-3" />
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ButtonLink href={later} variant="secondary" size="small">
            {formatMessage({ id: "page.start.finishLater", defaultMessage: "Finish later" })}
          </ButtonLink>
        </div>
      </div>
      <StartProgress step={step} />
      {signedInLabel ? (
        <p className="text-body-small flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary">
          <span className="max-w-full truncate">{signedInLabel}</span>
          <Button type="button" size="small" variant="secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>
            {formatMessage({ id: "page.start.signOut", defaultMessage: "Not you? Sign out" })}
          </Button>
        </p>
      ) : null}
    </header>
  );
}
