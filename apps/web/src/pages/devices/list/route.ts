import { routes } from "@/router";
import { DevicesPage } from "./page";

export const deviceListPage = {
  path: routes.consoleChild.devices,
  component: DevicesPage,
};
