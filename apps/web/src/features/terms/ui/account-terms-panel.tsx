import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { useAccountTermsStanding } from "@/features/terms/use-account-terms-standing";
import { AcceptAccountTermsDialog } from "@/features/terms/ui/accept-account-terms-dialog";
import { TermsStandingChip } from "@/features/terms/ui/terms-standing-chip";

/** Profile: the account terms accepted at signup. Mesh and source terms live on each mesh and source. */
export function AccountTermsPanel(): ReactElement | null {
  const { formatMessage } = useIntl();
  const standing = useAccountTermsStanding();
  const [open, setOpen] = useState(false);
  if (!standing) return null;

  const message =
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
        : formatMessage({
            id: "feature.terms.account.ok",
            defaultMessage:
              "You accepted the Terms of Use and Privacy Policy. Each mesh you create has its own data terms, shown on the mesh.",
          });

  return (
    <>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle className="flex items-center gap-2">
            {formatMessage({ id: "feature.terms.panel.title", defaultMessage: "Terms" })}
            <TermsStandingChip standing={standing} />
          </FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "feature.terms.account.description",
              defaultMessage: "The account terms you accepted when signing up.",
            })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <div className="flex flex-col gap-4">
            <StatusCopy>{message}</StatusCopy>
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
