import type { Terms } from "@mtt/contracts";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@mtt/ui/components/ui/field";
import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { useIntl } from "react-intl";
import type { TermsKind } from "@/features/terms/model";
import { splitLinks } from "@/lib/text-links";
import { routes } from "@/router";

export type TermsChecklistProps = {
  terms: Terms;
  /** Data terms (mesh, source, sink) are accepted under the DPA, so their footnote links it too. */
  kind: TermsKind;
  accepted: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
  /** Prefix for the checkbox ids, so two lists on a page don't clash. */
  idPrefix: string;
};

const linkClass = "underline underline-offset-2 text-accent-500";

/** The statements the API served, one checkbox each, and its footnote. */
export function TermsChecklist({ terms, kind, accepted, onToggle, idPrefix }: TermsChecklistProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        {terms.statements.map((statement) => (
          <Field key={statement.id} orientation="horizontal">
            <Checkbox
              id={`${idPrefix}-${statement.id}`}
              checked={accepted.has(statement.id)}
              onCheckedChange={(checked) => onToggle(statement.id, checked)}
            />
            <FieldLabel htmlFor={`${idPrefix}-${statement.id}`} className="text-body-regular text-text-primary">
              {/* One inline run: the label is a flex row, and bare text beside a link would split into columns. */}
              <span>
                {splitLinks(statement.text).map((segment, index) =>
                  segment.href ? (
                    <a
                      key={index}
                      href={segment.href}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClass}
                    >
                      {segment.text}
                    </a>
                  ) : (
                    segment.text
                  ),
                )}
              </span>
            </FieldLabel>
          </Field>
        ))}
      </FieldGroup>
      <p className="text-caption-1-regular text-text-tertiary">
        {terms.footnote}{" "}
        {kind === "account" ? (
          <Link to={routes.terms} target="_blank" className={linkClass}>
            {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
          </Link>
        ) : (
          formatMessage(
            {
              id: "feature.terms.termsAndDpaLink",
              defaultMessage: "Read the <terms>Mesh Things Terms</terms> and the <dpa>Data Processing Agreement</dpa>.",
            },
            {
              terms: (chunks: ReactNode) => (
                <Link to={routes.terms} target="_blank" className={linkClass}>
                  {chunks}
                </Link>
              ),
              dpa: (chunks: ReactNode) => (
                <Link to={routes.dpa} target="_blank" className={linkClass}>
                  {chunks}
                </Link>
              ),
            },
          )
        )}
      </p>
    </div>
  );
}
