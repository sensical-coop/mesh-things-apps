import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiArrowLeftLine, RiRefreshLine } from "@remixicon/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { RouterButtonLink } from "@/components/router-button-link";
import { routes } from "@/router";

/**
 * What a route shows when it throws while rendering: the rest of the console
 * keeps working, and the page can be retried without a full reload.
 */
export function RouteError({ error, reset }: ErrorComponentProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <section className="oa-squircle oa-arrive flex flex-col items-start gap-3 bg-background-secondary-default p-6 shadow-card sm:p-10">
      <h1 className="text-title-2-medium tracking-tight text-text-primary">
        {formatMessage({ id: "routeError.title", defaultMessage: "This page couldn't be shown" })}
      </h1>
      <p className="max-w-prose text-body-regular text-text-secondary">
        {formatMessage({
          id: "routeError.description",
          defaultMessage: "Something in its data tripped it up. Try again, or head back to your meshes.",
        })}
      </p>
      {error instanceof Error && error.message ? (
        <p className="max-w-prose font-mono text-caption-1-regular text-text-tertiary">{error.message}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="small" variant="primary" leadingIcon={RiRefreshLine} onClick={reset}>
          {formatMessage({ id: "routeError.retry", defaultMessage: "Try again" })}
        </Button>
        <RouterButtonLink to={routes.meshes} size="small" variant="secondary" leadingIcon={RiArrowLeftLine}>
          {formatMessage({ id: "routeError.back", defaultMessage: "Back to meshes" })}
        </RouterButtonLink>
      </div>
    </section>
  );
}
