import { createElement } from "react";
import { NotFound } from "@/components/not-found";
import { requireUuid } from "@/lib/not-found";
import { routes } from "@/router";
import { DeviceDetailPage } from "./page";

export const deviceDetailPage = {
  path: routes.consoleChild.device,
  component: DeviceDetailPage,
  beforeLoad: ({ params }: { params: { deviceUuid: string } }) => requireUuid(params.deviceUuid),
  notFoundComponent: () => createElement(NotFound, { kind: "device" }),
};
