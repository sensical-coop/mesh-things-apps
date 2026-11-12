import { defineMessages, type MessageDescriptor } from "react-intl";

const m = defineMessages({
  howItWorks: { id: "page.home.header.howItWorks", defaultMessage: "How it works" },
  features: { id: "page.home.header.features", defaultMessage: "Features" },
  faq: { id: "page.home.header.faq", defaultMessage: "FAQ" },
});

/** The landing page's sections, linked from its header and from every footer. */
export const LANDING_SECTIONS: readonly { href: string; label: MessageDescriptor }[] = [
  { href: "/#why", label: m.howItWorks },
  { href: "/#features", label: m.features },
  { href: "/#faq", label: m.faq },
];
