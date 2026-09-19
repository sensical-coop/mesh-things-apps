import { useMemo } from "react";
import { useIntl } from "react-intl";
import type { FilterLabels } from "@mtt/ui/components/reui/filters/filters-types";

export function useTranslatedFilterLabels(): Partial<FilterLabels> {
  const { formatMessage } = useIntl();

  return useMemo<Partial<FilterLabels>>(
    () => ({
      addFilter: formatMessage({ id: "common.filters.addFilter", defaultMessage: "Add filter" }),
      advancedFilter: formatMessage({ id: "common.filters.advancedFilter", defaultMessage: "Advanced filter" }),
      builderEmpty: formatMessage({ id: "common.filters.builderEmpty", defaultMessage: "No filters yet" }),
      builderEmptyHint: formatMessage({
        id: "common.filters.builderEmptyHint",
        defaultMessage: "Add a filter to narrow down what you see.",
      }),
      addCondition: formatMessage({ id: "common.filters.addFilter", defaultMessage: "Add filter" }),
      addConditionGroup: formatMessage({ id: "common.filters.addConditionGroup", defaultMessage: "Add group" }),
      addToGroup: formatMessage({
        id: "common.filters.addToGroup",
        defaultMessage: "Add filter to this group",
      }),
      removeGroup: formatMessage({ id: "common.filters.removeGroup", defaultMessage: "Remove group" }),
      wrapInGroup: formatMessage({ id: "common.filters.wrapInGroup", defaultMessage: "Wrap in group" }),
      ungroup: formatMessage({ id: "common.filters.ungroup", defaultMessage: "Ungroup" }),
      moveToTopLevel: formatMessage({ id: "common.filters.moveToTopLevel", defaultMessage: "Move to top" }),
      moveToGroup: (position: number) =>
        formatMessage(
          { id: "common.filters.moveToGroup", defaultMessage: "Move to group {position}" },
          { position },
        ),
      reorder: formatMessage({ id: "common.filters.reorder", defaultMessage: "Reorder" }),
      reorderHint: formatMessage({
        id: "common.filters.reorderHint",
        defaultMessage: "Press Alt with Arrow Up or Arrow Down to reorder",
      }),
      groupAll: formatMessage({
        id: "common.filters.groupAll",
        defaultMessage: "All of the following are true...",
      }),
      groupAny: formatMessage({
        id: "common.filters.groupAny",
        defaultMessage: "Any of the following are true...",
      }),
      groupPlaceholder: formatMessage({
        id: "common.filters.groupPlaceholder",
        defaultMessage: "Drag filters here",
      }),
      clearAll: formatMessage({ id: "common.filters.clearAll", defaultMessage: "Clear all" }),
      groupMenu: formatMessage({ id: "common.filters.groupMenu", defaultMessage: "Group options" }),
      searchFields: formatMessage({ id: "common.filters.searchFields", defaultMessage: "Search attributes..." }),
      searchOperators: formatMessage({
        id: "common.filters.searchOperators",
        defaultMessage: "Search operators...",
      }),
      searchOptions: formatMessage({ id: "common.filters.searchOptions", defaultMessage: "Search..." }),
      back: formatMessage({ id: "common.filters.back", defaultMessage: "Back" }),
      clear: formatMessage({ id: "common.filters.clear", defaultMessage: "Clear" }),
      apply: formatMessage({ id: "common.filters.apply", defaultMessage: "Apply" }),
      discard: formatMessage({ id: "common.filters.discard", defaultMessage: "Discard changes" }),
      empty: formatMessage({ id: "common.filters.empty", defaultMessage: "No results" }),
      loading: formatMessage({ id: "common.filters.loading", defaultMessage: "Loading..." }),
      loadingMore: formatMessage({ id: "common.filters.loadingMore", defaultMessage: "Loading more..." }),
      loadMore: formatMessage({ id: "common.filters.loadMore", defaultMessage: "Load more" }),
      error: formatMessage({ id: "common.filters.error", defaultMessage: "Could not load" }),
      retry: formatMessage({ id: "common.filters.retry", defaultMessage: "Retry" }),
      where: formatMessage({ id: "common.filters.where", defaultMessage: "Where" }),
      and: formatMessage({ id: "common.filters.and", defaultMessage: "And" }),
      or: formatMessage({ id: "common.filters.or", defaultMessage: "Or" }),
      combinator: formatMessage({ id: "common.filters.combinator", defaultMessage: "Change combinator" }),
      combinatorLabel: (word: string) =>
        formatMessage(
          { id: "common.filters.combinatorLabel", defaultMessage: "{word}, change combinator" },
          { word },
        ),
      duplicate: formatMessage({ id: "common.filters.duplicate", defaultMessage: "Duplicate" }),
      negate: formatMessage({ id: "common.filters.negate", defaultMessage: "Negate" }),
      convertToAdvanced: formatMessage({
        id: "common.filters.convertToAdvanced",
        defaultMessage: "Advanced editor",
      }),
      remove: formatMessage({ id: "common.filters.remove", defaultMessage: "Remove" }),
      chipMenu: (fieldLabel: string) =>
        formatMessage(
          { id: "common.filters.chipMenu", defaultMessage: "{fieldLabel} filter options" },
          { fieldLabel },
        ),
      filtersLabel: formatMessage({ id: "common.filters.filtersLabel", defaultMessage: "Filters" }),
      filterLabel: (condition: string) => condition,
      readOnly: formatMessage({
        id: "common.filters.readOnly",
        defaultMessage: "Read only. These filters cannot be changed.",
      }),
      valuePlaceholder: formatMessage({
        id: "common.filters.valuePlaceholder",
        defaultMessage: "enter text...",
      }),
      selectPlaceholder: formatMessage({ id: "common.filters.selectPlaceholder", defaultMessage: "Select..." }),
      noValue: formatMessage({ id: "common.filters.noValue", defaultMessage: "no value" }),
      selectCondition: formatMessage({
        id: "common.filters.selectCondition",
        defaultMessage: "Select condition",
      }),
      incomplete: formatMessage({ id: "common.filters.incomplete", defaultMessage: "incomplete filter" }),
      branchAffordance: formatMessage({ id: "common.filters.branchAffordance", defaultMessage: "opens a list" }),
      exclusiveHint: formatMessage({
        id: "common.filters.exclusiveHint",
        defaultMessage: "cannot be combined with the other options",
      }),
      exclusiveAnnouncement: (label: string, cleared: number) =>
        cleared === 1
          ? formatMessage(
              {
                id: "common.filters.exclusiveAnnouncement.one",
                defaultMessage: "{label} selected. 1 other selection cleared.",
              },
              { label },
            )
          : formatMessage(
              {
                id: "common.filters.exclusiveAnnouncement.other",
                defaultMessage: "{label} selected. {cleared} other selections cleared.",
              },
              { label, cleared },
            ),
      itemCount: (count: number) =>
        formatMessage({ id: "common.filters.itemCount", defaultMessage: "{count} items" }, { count }),
      fieldsLabel: formatMessage({ id: "common.filters.fieldsLabel", defaultMessage: "Attributes" }),
      resultsAnnouncement: (count: number) =>
        count === 1
          ? formatMessage({ id: "common.filters.resultsAnnouncement.one", defaultMessage: "1 result" })
          : formatMessage(
              { id: "common.filters.resultsAnnouncement.other", defaultMessage: "{count} results" },
              { count },
            ),
      actionsLabel: formatMessage({ id: "common.filters.actionsLabel", defaultMessage: "Actions" }),
      countAnnouncement: (count: number) =>
        count === 1
          ? formatMessage({ id: "common.filters.countAnnouncement.one", defaultMessage: "1 filter applied" })
          : formatMessage(
              { id: "common.filters.countAnnouncement.other", defaultMessage: "{count} filters applied" },
              { count },
            ),
      valueCount: (count: number) =>
        formatMessage({ id: "common.filters.valueCount", defaultMessage: "{count} selected" }, { count }),
      valueDetail: (summary: string, values: string[]) =>
        formatMessage(
          { id: "common.filters.valueDetail", defaultMessage: "{summary}: {values}" },
          { summary, values: values.join(", ") },
        ),
      valueRange: (from: string, to: string) =>
        formatMessage({ id: "common.filters.valueRange", defaultMessage: "{from} to {to}" }, { from, to }),
      rangeFrom: (fieldLabel: string) =>
        formatMessage({ id: "common.filters.rangeFrom", defaultMessage: "{fieldLabel} from" }, { fieldLabel }),
      rangeTo: (fieldLabel: string) =>
        formatMessage({ id: "common.filters.rangeTo", defaultMessage: "{fieldLabel} to" }, { fieldLabel }),
      rangeSeparator: formatMessage({ id: "common.filters.rangeSeparator", defaultMessage: "to" }),
      negated: (operatorLabel: string) =>
        formatMessage({ id: "common.filters.negated", defaultMessage: "not {operatorLabel}" }, { operatorLabel }),
      issueOperator: formatMessage({ id: "common.filters.issueOperator", defaultMessage: "Choose a condition" }),
      issueValue: formatMessage({ id: "common.filters.issueValue", defaultMessage: "Enter a value" }),
      issueRange: formatMessage({
        id: "common.filters.issueRange",
        defaultMessage: "Enter both ends of the range",
      }),
      issueRangeOrder: formatMessage({
        id: "common.filters.issueRangeOrder",
        defaultMessage: "The end of the range comes before its start",
      }),
      issueEmptyGroup: formatMessage({
        id: "common.filters.issueEmptyGroup",
        defaultMessage: "This group has no conditions yet",
      }),
      issueSummary: (count: number) =>
        count === 1
          ? formatMessage({ id: "common.filters.issueSummary.one", defaultMessage: "1 row needs attention" })
          : formatMessage(
              { id: "common.filters.issueSummary.other", defaultMessage: "{count} rows need attention" },
              { count },
            ),
    }),
    [formatMessage],
  );
}
