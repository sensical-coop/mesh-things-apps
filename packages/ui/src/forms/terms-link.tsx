import { type ReactElement } from "react";
import { useIntl } from "react-intl";

/** Link to the full terms; opens in a new tab so a half-filled form survives. */
export function TermsLink({ href }: { href: string }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <a className="text-accent-500 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
      {formatMessage({ id: "feature.terms.termsLink", defaultMessage: "Read the Mesh Things Terms." })}
    </a>
  );
}
