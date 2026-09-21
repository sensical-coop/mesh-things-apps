import { routes } from "@/router";
import { AlarmsPage } from "./page";

export const alarmListPage = {
  path: routes.consoleChild.alarms,
  component: AlarmsPage,
};
