import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiMenuLine } from "@remixicon/react";
import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import { useSpaciousLayout } from "fumadocs-ui/layouts/spacious";
import { useIntl } from "react-intl";
import { DocumentationActions } from "@/components/actions";

export function DocumentationHeader() {
  const { slots } = useSpaciousLayout();
  const { open, setOpen } = useSidebar();
  const { formatMessage } = useIntl();

  return (
    <header id="nd-subnav" className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-background-secondary-default px-3 [grid-area:header] md:hidden">
      <slots.navTitle className="me-auto inline-flex items-center gap-2" />
      <DocumentationActions />
      {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
      <Button variant="secondary" size="small" iconOnly leadingIcon={RiMenuLine} aria-label={formatMessage({ id: "page.docs.ui.openSidebar", defaultMessage: "Open sidebar" })} aria-expanded={open} onClick={() => setOpen(!open)} />
    </header>
  );
}
