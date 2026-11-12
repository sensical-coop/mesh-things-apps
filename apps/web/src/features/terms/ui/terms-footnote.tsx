import { TermsLink } from "@mtt/ui/forms/terms-link";
import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { type TermsKind } from "@/features/terms/model";
import { inlineLinkClass } from "@/lib/link-class";
import { routes } from "@/router";

export function TermsFootnote({ kind }: { kind: TermsKind }): ReactElement {
  const { formatMessage } = useIntl();
  if (kind === "account") {
    return <TermsLink href={routes.terms} />;
  }
  return (
    <>
      {formatMessage(
        {
          id: "feature.terms.termsAndDpaLink",
          defaultMessage: "Read the <terms>Mesh Things Terms</terms> and the <dpa>Data Processing Agreement</dpa>.",
        },
        {
          terms: (chunks: ReactNode) => (
            <Link to={routes.terms} target="_blank" className={inlineLinkClass}>
              {chunks}
            </Link>
          ),
          dpa: (chunks: ReactNode) => (
            <Link to={routes.dpa} target="_blank" className={inlineLinkClass}>
              {chunks}
            </Link>
          ),
        },
      )}
    </>
  );
}
