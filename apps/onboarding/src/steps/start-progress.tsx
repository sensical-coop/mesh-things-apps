import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { type StartStep } from "@/start-step";
import { cx } from "@mtt/ui/utils";

export function StartProgress({ step }: { step: StartStep }): ReactElement {
  const { formatMessage } = useIntl();
  const parts: { id: string; label: string; steps: readonly StartStep[] }[] = [
    { id: "account", label: formatMessage({ id: "page.start.progress.account", defaultMessage: "Account" }), steps: ["welcome", "account", "check-email"] },
    { id: "basics", label: formatMessage({ id: "page.start.progress.basics", defaultMessage: "Concepts" }), steps: ["basics"] },
    { id: "mesh", label: formatMessage({ id: "page.start.progress.mesh", defaultMessage: "Mesh" }), steps: ["mesh"] },
    { id: "gateway", label: formatMessage({ id: "page.start.progress.gateway", defaultMessage: "Gateway" }), steps: ["register", "connect"] },
    { id: "next", label: formatMessage({ id: "page.start.progress.next", defaultMessage: "Next steps" }), steps: ["next-steps"] },
  ];
  const current = step === "done" ? parts.length : parts.findIndex((part) => part.steps.includes(step));

  return (
    <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={formatMessage({ id: "page.start.progress.label", defaultMessage: "Setup progress" })}>
      {parts.map((part, index) => {
        const state = index < current ? "done" : index === current ? "current" : "pending";
        return (
          <li key={part.id} className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={cx(
                "h-1 rounded-full",
                state === "pending" ? "bg-separator-border" : "bg-accent-500",
                state === "done" && "opacity-50",
              )}
            />
            <span
              className={cx(
                "truncate text-body-2-regular",
                state === "current" ? "text-text-primary" : "text-text-tertiary",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {part.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
