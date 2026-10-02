import { routes } from "@/router";
import { OperatorRequestsPage } from "./page";

export const operatorRequestListPage = {
  path: routes.consoleChild.operatorRequests,
  component: OperatorRequestsPage,
};
