import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { BrandMark } from "@mtt/ui/components/brand-mark";
import { LanguageSwitcher } from "@mtt/ui/components/language-switcher";
import { authRepository } from "@/features/auth/repository";
import { writeStartSearch } from "@/start-search";
import type { StartStep } from "@/start-step";
import { StartProgress } from "./start-progress";

export function StartHeader({
  step,
  meshId,
  signedInLabel,
  onBack,
}: {
  step: StartStep;
  meshId?: string;
  signedInLabel?: string;
  /** Absent when no earlier step is reachable with the current account, mesh and gateway. */
  onBack?: () => void;
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
          {step === "done" ? null : (
            <ButtonLink href={later} variant="secondary" size="small">
              {formatMessage({ id: "page.start.finishLater", defaultMessage: "Finish later" })}
            </ButtonLink>
          )}
        </div>
      </div>
      <StartProgress step={step} />
      {signedInLabel || onBack ? (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {onBack ? (
            <Button type="button" variant="ghost" size="small" leadingIcon={RiArrowLeftLine} className="-ms-2" onClick={onBack}>
              {formatMessage({ id: "page.start.back", defaultMessage: "Back" })}
            </Button>
          ) : null}
          {signedInLabel ? (
            <p className="ms-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body-2-regular text-text-tertiary">
              <span className="max-w-full truncate text-text-secondary">{signedInLabel}</span>
              <span aria-hidden>·</span>
              <button
                type="button"
                className="rounded-sm underline underline-offset-2 outline-hidden hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:opacity-50"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                {formatMessage({ id: "page.start.signOut", defaultMessage: "Not you? Sign out" })}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
