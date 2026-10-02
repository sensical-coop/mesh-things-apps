import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";

export type CodeBlockProps = {
  code: string;
  /** What the code is, for screen readers and the copy button. */
  label: string;
};

/** Monospaced, scrollable, with a copy button that says when it copied. */
export function CodeBlock({ code, label }: CodeBlockProps): ReactElement {
  const { formatMessage } = useIntl();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="oa-squircle-inset relative bg-background-secondary-default">
      <pre
        className="overflow-x-auto p-4 pe-14 font-mono text-caption-1-regular leading-5 text-text-primary"
        aria-label={label}
        tabIndex={0}
      >
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        size="xs"
        variant="secondary"
        iconOnly
        leadingIcon={copied ? RiCheckLine : RiFileCopyLine}
        className="absolute end-3 top-3"
        aria-label={
          copied
            ? formatMessage({ id: "common.codeBlock.copied", defaultMessage: "Copied" })
            : formatMessage({ id: "common.codeBlock.copy", defaultMessage: "Copy {label}" }, { label })
        }
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => setCopied(true));
        }}
      />
    </div>
  );
}
