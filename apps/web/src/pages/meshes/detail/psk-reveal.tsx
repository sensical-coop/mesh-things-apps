import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiEyeLine, RiEyeOffLine, RiFileCopyLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";

export function PskReveal({ value }: { value: string }): ReactElement {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex oa-arrive flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <code className="min-w-0 font-mono text-body-2-regular break-all text-text-primary">
        {open ? value : "••••••••"}
      </code>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          leadingIcon={open ? RiEyeOffLine : RiEyeLine}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? formatMessage({ id: "page.meshes.detail.psk.hide", defaultMessage: "Hide" })
            : formatMessage({ id: "page.meshes.detail.psk.show", defaultMessage: "Show" })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          leadingIcon={RiFileCopyLine}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true));
          }}
        >
          {copied
            ? formatMessage({ id: "page.meshes.detail.psk.copied", defaultMessage: "Copied" })
            : formatMessage({ id: "page.meshes.detail.psk.copy", defaultMessage: "Copy" })}
        </Button>
      </div>
    </div>
  );
}
