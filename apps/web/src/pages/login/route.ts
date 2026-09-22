import { routes } from "@/router";
import { LoginPage } from "./page";

export const authLoginPage = {
  path: routes.login,
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): { accountDeleted?: true } => ({
    accountDeleted: search.accountDeleted === true || search.accountDeleted === "true" ? true : undefined,
  }),
};
