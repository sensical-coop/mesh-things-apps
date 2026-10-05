import { createElement } from "react";
import { NotFound } from "@/components/not-found";
import { requireUuid } from "@/lib/not-found";
import { routes } from "@/router";
import { OperatorRequestPage } from "./page";

export const operatorRequestDetailPage = {
  path: routes.consoleChild.operatorRequest,
  component: OperatorRequestPage,
  beforeLoad: ({ params }: { params: { requestId: string } }) => requireUuid(params.requestId),
  notFoundComponent: () => createElement(NotFound, { kind: "operatorRequest" }),
};
