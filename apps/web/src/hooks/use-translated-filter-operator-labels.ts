import { useMemo } from "react";
import { useIntl } from "react-intl";
import type { FilterOperatorLabels } from "@mtt/ui/components/reui/filters/filters-operators";

export function useTranslatedFilterOperatorLabels(): FilterOperatorLabels {
  const { formatMessage } = useIntl();

  return useMemo<FilterOperatorLabels>(
    () => ({
      contains: formatMessage({ id: "common.filterOperators.contains", defaultMessage: "contains" }),
      not_contains: formatMessage({
        id: "common.filterOperators.notContains",
        defaultMessage: "does not contain",
      }),
      starts_with: formatMessage({ id: "common.filterOperators.startsWith", defaultMessage: "starts with" }),
      ends_with: formatMessage({ id: "common.filterOperators.endsWith", defaultMessage: "ends with" }),
      is: formatMessage({ id: "common.filterOperators.is", defaultMessage: "is" }),
      is_not: formatMessage({ id: "common.filterOperators.isNot", defaultMessage: "is not" }),
      is_any_of: formatMessage({ id: "common.filterOperators.isAnyOf", defaultMessage: "is any of" }),
      is_none_of: formatMessage({ id: "common.filterOperators.isNoneOf", defaultMessage: "is none of" }),
      has_any_of: formatMessage({ id: "common.filterOperators.hasAnyOf", defaultMessage: "has any of" }),
      has_all_of: formatMessage({ id: "common.filterOperators.hasAllOf", defaultMessage: "has all of" }),
      has_none_of: formatMessage({ id: "common.filterOperators.hasNoneOf", defaultMessage: "has none of" }),
      eq: formatMessage({ id: "common.filterOperators.eq", defaultMessage: "equals" }),
      neq: formatMessage({ id: "common.filterOperators.neq", defaultMessage: "does not equal" }),
      gt: formatMessage({ id: "common.filterOperators.gt", defaultMessage: "is greater than" }),
      gte: formatMessage({
        id: "common.filterOperators.gte",
        defaultMessage: "is greater than or equal to",
      }),
      lt: formatMessage({ id: "common.filterOperators.lt", defaultMessage: "is less than" }),
      lte: formatMessage({ id: "common.filterOperators.lte", defaultMessage: "is less than or equal to" }),
      between: formatMessage({ id: "common.filterOperators.between", defaultMessage: "is between" }),
      not_between: formatMessage({ id: "common.filterOperators.notBetween", defaultMessage: "is not between" }),
      is_before: formatMessage({ id: "common.filterOperators.isBefore", defaultMessage: "is before" }),
      is_after: formatMessage({ id: "common.filterOperators.isAfter", defaultMessage: "is after" }),
      is_on_or_before: formatMessage({
        id: "common.filterOperators.isOnOrBefore",
        defaultMessage: "is on or before",
      }),
      is_on_or_after: formatMessage({
        id: "common.filterOperators.isOnOrAfter",
        defaultMessage: "is on or after",
      }),
      empty: formatMessage({ id: "common.filterOperators.empty", defaultMessage: "is empty" }),
      not_empty: formatMessage({ id: "common.filterOperators.notEmpty", defaultMessage: "is not empty" }),
    }),
    [formatMessage],
  );
}
