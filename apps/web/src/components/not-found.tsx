import { RiArrowLeftLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { RouterButtonLink } from "@/components/router-button-link";
import { routes } from "@/router";

export type NotFoundKind = "page" | "mesh" | "device" | "blueprint" | "operatorRequest";

export type NotFoundProps = {
  /** What was missing: picks the copy and where the way back leads. */
  kind?: NotFoundKind;
};

/** The console's 404: an unknown path, a malformed id, or an id the API doesn't know. */
export function NotFound({ kind = "page" }: NotFoundProps): ReactElement {
  const { formatMessage } = useIntl();
  const copy = {
    page: {
      title: formatMessage({ id: "notFound.page.title", defaultMessage: "Page not found" }),
      description: formatMessage({
        id: "notFound.page.description",
        defaultMessage: "Nothing lives at this address. Check the link, or head back to your meshes.",
      }),
      back: formatMessage({ id: "notFound.page.back", defaultMessage: "Back to meshes" }),
      to: routes.meshes,
    },
    mesh: {
      title: formatMessage({ id: "notFound.mesh.title", defaultMessage: "Mesh not found" }),
      description: formatMessage({
        id: "notFound.mesh.description",
        defaultMessage: "This mesh doesn't exist, or you don't have access to it.",
      }),
      back: formatMessage({ id: "notFound.mesh.back", defaultMessage: "Back to meshes" }),
      to: routes.meshes,
    },
    device: {
      title: formatMessage({ id: "notFound.device.title", defaultMessage: "Device not found" }),
      description: formatMessage({
        id: "notFound.device.description",
        defaultMessage: "This device doesn't exist, or you don't have access to it.",
      }),
      back: formatMessage({ id: "notFound.device.back", defaultMessage: "Back to devices" }),
      to: routes.devices,
    },
    blueprint: {
      title: formatMessage({ id: "notFound.blueprint.title", defaultMessage: "Blueprint not found" }),
      description: formatMessage({
        id: "notFound.blueprint.description",
        defaultMessage: "This blueprint doesn't exist, or you don't have access to it.",
      }),
      back: formatMessage({ id: "notFound.blueprint.back", defaultMessage: "Back to blueprints" }),
      to: routes.blueprints,
    },
    operatorRequest: {
      title: formatMessage({ id: "notFound.operatorRequest.title", defaultMessage: "Request not found" }),
      description: formatMessage({
        id: "notFound.operatorRequest.description",
        defaultMessage: "This operator request doesn't exist.",
      }),
      back: formatMessage({ id: "notFound.operatorRequest.back", defaultMessage: "Back to operator requests" }),
      to: routes.operatorRequests,
    },
  }[kind];

  return (
    <section className="oa-squircle oa-arrive flex flex-col items-start gap-3 bg-background-secondary-default p-6 shadow-card sm:p-10">
      <p className="font-mono text-caption-1-regular text-text-tertiary">404</p>
      <h1 className="text-title-2-medium tracking-tight text-text-primary">{copy.title}</h1>
      <p className="max-w-prose text-body-regular text-text-secondary">{copy.description}</p>
      <RouterButtonLink to={copy.to} size="small" variant="secondary" leadingIcon={RiArrowLeftLine} className="mt-2">
        {copy.back}
      </RouterButtonLink>
    </section>
  );
}
