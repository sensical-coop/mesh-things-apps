import { useMemo } from "react";
import { useIntl } from "react-intl";

/** Fumadocs UI strings, keyed the way `fumadocs-ui` looks them up, from the app catalogs. */
export function useDocsTranslations(): Record<string, string> {
  const { formatMessage } = useIntl();

  return useMemo(() => {
    const search = formatMessage({ id: "page.docs.ui.search", defaultMessage: "Search" });
    const openSidebar = formatMessage({ id: "page.docs.ui.openSidebar", defaultMessage: "Open sidebar" });
    const closeSidebar = formatMessage({ id: "page.docs.ui.closeSidebar", defaultMessage: "Close sidebar" });

    return {
      "Search(search trigger)": search,
      "Search(search dialog)": search,
      "Open Search(search trigger)(aria-label)": formatMessage({
        id: "page.docs.ui.openSearch",
        defaultMessage: "Open search",
      }),
      "Close Search(search dialog)(aria-label)": formatMessage({
        id: "page.docs.ui.closeSearch",
        defaultMessage: "Close search",
      }),
      "No results found(search dialog)": formatMessage({
        id: "page.docs.ui.noResults",
        defaultMessage: "No results found",
      }),
      "Search failed(search dialog)": formatMessage({
        id: "page.docs.ui.searchFailed",
        defaultMessage: "The search could not be completed",
      }),
      "On this page(table of contents)": formatMessage({
        id: "page.docs.ui.onThisPage",
        defaultMessage: "On this page",
      }),
      "Table of Contents(inline table of contents)": formatMessage({
        id: "page.docs.ui.tableOfContents",
        defaultMessage: "Table of contents",
      }),
      "No Headings(table of contents)": formatMessage({
        id: "page.docs.ui.noHeadings",
        defaultMessage: "No headings",
      }),
      "Next Page(pagination)": formatMessage({ id: "page.docs.ui.nextPage", defaultMessage: "Next page" }),
      "Previous Page(pagination)": formatMessage({
        id: "page.docs.ui.previousPage",
        defaultMessage: "Previous page",
      }),
      "Open Sidebar(aria-label)": openSidebar,
      "Open Sidebar(sidebar)(aria-label)": openSidebar,
      "Close Sidebar(aria-label)": closeSidebar,
      "Close Sidebar(sidebar)(aria-label)": closeSidebar,
      "Collapse Sidebar(sidebar)(aria-label)": formatMessage({
        id: "page.docs.ui.collapseSidebar",
        defaultMessage: "Collapse sidebar",
      }),
      "Hide Sidebar(sidebar)": formatMessage({ id: "page.docs.ui.hideSidebar", defaultMessage: "Hide sidebar" }),
      "Show Sidebar(sidebar)": formatMessage({ id: "page.docs.ui.showSidebar", defaultMessage: "Show sidebar" }),
      "Copy Text(code block)(aria-label)": formatMessage({
        id: "page.docs.ui.copyCode",
        defaultMessage: "Copy code",
      }),
      "Copied Text(code block)(aria-label)": formatMessage({
        id: "page.docs.ui.copiedCode",
        defaultMessage: "Code copied",
      }),
      "Copy Anchor Link(heading anchor)(aria-label)": formatMessage({
        id: "page.docs.ui.copyLink",
        defaultMessage: "Copy link to section",
      }),
      "Copied Anchor Link(heading anchor)(aria-label)": formatMessage({
        id: "page.docs.ui.copiedLink",
        defaultMessage: "Link copied",
      }),
    };
  }, [formatMessage]);
}
