import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_docs/")({
  beforeLoad: () => {
    throw redirect({ href: "/overview" });
  },
});
