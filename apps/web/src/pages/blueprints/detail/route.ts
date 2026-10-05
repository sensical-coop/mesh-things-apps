import { createElement } from "react";
import { NotFound } from "@/components/not-found";
import { requireUuid } from "@/lib/not-found";
import { routes } from "@/router";
import { BlueprintPage } from "./page";

export const blueprintDetailPage = {
  path: routes.consoleChild.blueprint,
  component: BlueprintPage,
  beforeLoad: ({ params }: { params: { blueprintId: string } }) => requireUuid(params.blueprintId),
  notFoundComponent: () => createElement(NotFound, { kind: "blueprint" }),
};
