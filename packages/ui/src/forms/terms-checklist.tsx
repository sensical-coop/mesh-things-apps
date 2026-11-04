import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@mtt/ui/components/ui/field";
import { type ReactElement, type ReactNode } from "react";
import { splitLinks } from "@mtt/ui/forms/text-links";

export type TermsStatement = { id: string; text: string };

const linkClass = "underline underline-offset-2 text-accent-500";

/** The statements the API served, one checkbox each. The app supplies the footnote, links included. */
export function TermsChecklist({
  statements,
  footnote,
  accepted,
  onToggle,
  idPrefix,
}: {
  statements: readonly TermsStatement[];
  footnote?: ReactNode;
  accepted: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
  /** Prefix for the checkbox ids, so two lists on a page don't clash. */
  idPrefix: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        {statements.map((statement) => (
          <Field key={statement.id} orientation="horizontal">
            <Checkbox
              id={`${idPrefix}-${statement.id}`}
              checked={accepted.has(statement.id)}
              onCheckedChange={(checked) => onToggle(statement.id, checked === true)}
            />
            <FieldLabel htmlFor={`${idPrefix}-${statement.id}`} className="text-body-regular text-text-primary">
              {/* One inline run: the label is a flex row, and bare text beside a link would split into columns. */}
              <span>
                {splitLinks(statement.text).map((segment, index) =>
                  segment.href ? (
                    <a key={index} href={segment.href} target="_blank" rel="noreferrer" className={linkClass}>
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
      {footnote ? <p className="text-caption-1-regular text-text-tertiary">{footnote}</p> : null}
    </div>
  );
}
