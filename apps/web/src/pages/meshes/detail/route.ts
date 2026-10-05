import { createElement } from "react";
import { NotFound } from "@/components/not-found";
import { requireUuid } from "@/lib/not-found";
import { routes } from "@/router";
import { MeshDetailPage } from "./page";

export const meshDetailPage = {
  path: routes.consoleChild.mesh,
  component: MeshDetailPage,
  beforeLoad: ({ params }: { params: { meshId: string } }) => requireUuid(params.meshId),
  notFoundComponent: () => createElement(NotFound, { kind: "mesh" }),
};
