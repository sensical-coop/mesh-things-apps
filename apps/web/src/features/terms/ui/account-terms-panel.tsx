import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { type ReactElement, type ReactNode, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { useAccountTermsStanding } from "@/features/terms/use-account-terms-standing";
import { AcceptAccountTermsDialog } from "@/features/terms/ui/accept-account-terms-dialog";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";

/** Profile: the account terms accepted at signup. Mesh and source terms live on each mesh and source. */
export function AccountTermsPanel(): ReactElement | null {
  const { formatMessage, formatDate } = useIntl();
  const { me } = useMe();
  const standing = useAccountTermsStanding();
  const [open, setOpen] = useState(false);
  if (!standing) return null;

  const accepted = standing !== "none" && me?.terms_accepted_version;
  const notice =
    standing === "outdated"
      ? formatMessage({
          id: "feature.terms.account.outdated",
          defaultMessage: "The Terms of Use or Privacy Policy changed since you accepted them. Accept the new version.",
        })
      : standing === "none"
        ? formatMessage({
            id: "feature.terms.account.none",
            defaultMessage: "There's no acceptance of the terms on record for this account.",
          })
        : null;

  return (
    <>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle className="flex items-center gap-2">
            {formatMessage({ id: "feature.terms.panel.title", defaultMessage: "Terms" })}
            <TermsStandingChip standing={standing} />
          </FrameTitle>
        </FrameHeader>
        <FramePanel>
          <div className="flex flex-col gap-4">
            {accepted ? (
              <dl className="grid gap-3 sm:grid-cols-3">
                <TermsRow
                  label={formatMessage({ id: "feature.terms.account.document", defaultMessage: "Document" })}
                  value={formatMessage({
                    id: "feature.terms.account.documentValue",
                    defaultMessage: "Terms of Use and Privacy Policy",
                  })}
                />
                <TermsRow
                  label={formatMessage({ id: "feature.terms.account.version", defaultMessage: "Version" })}
                  value={<span className="font-mono">{me?.terms_accepted_version}</span>}
                />
                <TermsRow
                  label={formatMessage({ id: "feature.terms.account.acceptedOn", defaultMessage: "Accepted on" })}
                  value={me?.terms_accepted_at ? formatDate(me.terms_accepted_at, { dateStyle: "long" }) : "—"}
                />
              </dl>
            ) : null}
            {notice ? <StatusCopy>{notice}</StatusCopy> : null}
            {standing === "ok" ? null : (
              <div>
                <Button type="button" size="small" onClick={() => setOpen(true)}>
                  {formatMessage({ id: "feature.terms.account.review", defaultMessage: "Review and accept" })}
                </Button>
              </div>
            )}
          </div>
        </FramePanel>
      </Frame>
      <AcceptAccountTermsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function TermsRow({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption-1-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-body-medium break-words text-text-primary">{value}</dd>
    </div>
  );
}
