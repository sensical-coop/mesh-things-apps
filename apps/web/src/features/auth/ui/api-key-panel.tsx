import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { RotateApiKeyDialog } from "@/features/auth/ui/rotate-api-key-dialog";

/** The console signs in with a session; the API key is only for scripts and gateways, so it's generated here on demand. */
export function ApiKeyPanel(): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "feature.auth.apiKey.title", defaultMessage: "API key" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.auth.apiKey.description",
            defaultMessage:
              "Generating an API here will replace your current one.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <Button type="button" variant="secondary" size="small" onClick={() => setOpen(true)}>
          {formatMessage({ id: "feature.auth.apiKey.generate", defaultMessage: "Generate new key" })}
        </Button>
      </FramePanel>
      <RotateApiKeyDialog open={open} onClose={() => setOpen(false)} />
    </Frame>
  );
}
