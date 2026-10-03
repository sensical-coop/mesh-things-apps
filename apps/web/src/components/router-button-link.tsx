import { ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { createLink } from "@tanstack/react-router";

/** A ButtonLink to a route in this app: navigates in place instead of reloading the page. */
export const RouterButtonLink = createLink(ButtonLink);
