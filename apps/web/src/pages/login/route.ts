import { routes } from "@/router";
import { LoginPage } from "./page";

export const authLoginPage = {
  path: routes.login,
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): { accountDeleted?: true; next?: string } => ({
    accountDeleted: search.accountDeleted === true || search.accountDeleted === "true" ? true : undefined,
    next: typeof search.next === "string" ? search.next : undefined,
  }),
};
