import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { type StartStep } from "@/start-step";
import { cx } from "@mtt/ui/utils";

const PARTS: { id: string; steps: readonly StartStep[] }[] = [
  { id: "account", steps: ["welcome", "account", "check-email"] },
  { id: "basics", steps: ["basics"] },
  { id: "mesh", steps: ["mesh"] },
  { id: "gateway", steps: ["register", "connect"] },
  { id: "next", steps: ["next-steps", "done"] },
];

export function StartProgress({ step }: { step: StartStep }): ReactElement {
  const { formatMessage } = useIntl();
  const labels: Record<string, string> = {
    account: formatMessage({ id: "page.start.progress.account", defaultMessage: "Account" }),
    basics: formatMessage({ id: "page.start.progress.basics", defaultMessage: "Concepts" }),
    mesh: formatMessage({ id: "page.start.progress.mesh", defaultMessage: "Mesh" }),
    gateway: formatMessage({ id: "page.start.progress.gateway", defaultMessage: "Gateway" }),
    next: formatMessage({ id: "page.start.progress.next", defaultMessage: "Next steps" }),
  };
  // "done" is past the last part: every segment reads as finished.
  const current = step === "done" ? PARTS.length : PARTS.findIndex((part) => part.steps.includes(step));

  return (
    <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={formatMessage({ id: "page.start.progress.label", defaultMessage: "Setup progress" })}>
      {PARTS.map((part, index) => {
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
              {labels[part.id]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
