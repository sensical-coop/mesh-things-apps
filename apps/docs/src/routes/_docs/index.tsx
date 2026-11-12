import { createFileRoute, redirect } from "@tanstack/react-router";
import { LANDING_HREF } from "@/lib/paths";

export const Route = createFileRoute("/_docs/")({
  beforeLoad: () => {
    throw redirect({ href: LANDING_HREF });
  },
});
