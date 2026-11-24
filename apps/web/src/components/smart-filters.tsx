import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryStates } from "nuqs";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiFilter3Line } from "@remixicon/react";
import { Filters } from "@mtt/ui/components/reui/filters/filters";
import { resolveFilterLabels } from "@mtt/ui/components/reui/filters/filters-i18n";
import { createFilterQuery, flattenFilterConditions } from "@mtt/ui/components/reui/filters/filters-query";
import type { FilterField, FilterQuery } from "@mtt/ui/components/reui/filters/filters-types";
import { serializeListFilterValue, valuelessFilterOperators } from "@mtt/contracts/list-filter";
import { useTranslatedFilterLabels, useTranslatedFilterOperatorLabels } from "./smart-filter-labels";
import {
  filterUrlPatchEquals,
  parseAsFilterValue,
  queryToUrlPatch,
  urlStateToQuery,
} from "./filter-url";

/** ReUI operator ids that are not the wire name. */
function toWireOperator(operator: string): string {
  switch (operator) {
    case "eq":
      return "equals";
    case "gt":
      return "greater_than";
    case "lt":
      return "less_than";
    default:
      return operator;
  }
}

function isActiveCondition(operator: string, values: unknown[]): boolean {
  if (valuelessFilterOperators.has(operator)) return true;
  return values.some((v) => v !== "" && v != null && String(v).trim() !== "");
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export type FilterSpec = Omit<FilterField, "id"> & {
  key: string;
  urlKey: string;
  /** Matched by the API, so it stays out of the query the page runs on loaded rows. */
  serverOnly?: boolean;
};

export type SmartFilters = {
  fields: FilterField[];
  query: FilterQuery;
  active: boolean;
  onChange: (next: FilterQuery) => void;
  clear: () => void;
  /** Filters the page runs on loaded rows. Server-only fields are left out. */
  queryString: string;
  /** Server-only fields, same encoding as `queryString`. */
  serverQueryString: string;
};

function conditionsQuery(conditions: { field: string; operator: string; values: unknown[] }[]): string {
  return conditions
    .map((c) => {
      const wire = { operator: toWireOperator(c.operator), values: c.values.map(String) };
      return `${encodeURIComponent(c.field)}=${encodeURIComponent(serializeListFilterValue(wire))}`;
    })
    .join("&");
}

export function useSmartFilters({ specs }: { specs: FilterSpec[] }): SmartFilters {
  const fields = useMemo<FilterField[]>(
    () =>
      specs.map(({ urlKey: _urlKey, serverOnly: _serverOnly, key, ...field }) => ({
        ...field,
        id: key,
        defaultOperator:
          field.type === "text" && !field.defaultOperator ? "contains" : field.defaultOperator,
      })),
    [specs],
  );
  const urlKeys = useMemo(() => Object.fromEntries(specs.map((s) => [s.key, s.urlKey])), [specs]);

  const parsers = useMemo(() => {
    const p: Record<string, typeof parseAsFilterValue> = {};
    for (const urlKey of new Set(Object.values(urlKeys))) p[urlKey] = parseAsFilterValue;
    return p;
  }, [urlKeys]);

  const [urlState, setUrlState] = useQueryStates(parsers, {
    history: "replace",
    shallow: true,
  });

  const urlQuery = useMemo(() => urlStateToQuery(urlState, urlKeys), [urlState, urlKeys]);
  const [draft, setDraft] = useState<FilterQuery | null>(null);
  const query = draft ?? urlQuery;

  const onChange = useCallback(
    (next: FilterQuery) => {
      setDraft(next);
      const patch = queryToUrlPatch(next, urlKeys);
      if (!filterUrlPatchEquals(patch, urlState)) void setUrlState(patch);
    },
    [setUrlState, urlKeys, urlState],
  );

  const clear = useCallback(() => {
    const empty = createFilterQuery([]);
    setDraft(empty);
    void setUrlState(queryToUrlPatch(empty, urlKeys));
  }, [setUrlState, urlKeys]);

  const active = flattenFilterConditions(query).filter((c) => isActiveCondition(c.operator, c.values));
  const serverKeys = useMemo(() => new Set(specs.filter((spec) => spec.serverOnly).map((spec) => spec.key)), [specs]);
  const queryString = useMemo(
    () => conditionsQuery(active.filter((condition) => !serverKeys.has(condition.field))),
    [active, serverKeys],
  );
  const serverQueryString = useMemo(
    () => conditionsQuery(active.filter((condition) => serverKeys.has(condition.field))),
    [active, serverKeys],
  );
  // ponytail: fixed 400ms — text filters refire per keystroke
  const debouncedQueryString = useDebouncedValue(queryString, 400);
  const debouncedServerQueryString = useDebouncedValue(serverQueryString, 400);

  return {
    fields,
    query,
    active: active.length > 0,
    onChange,
    clear,
    queryString: debouncedQueryString,
    serverQueryString: debouncedServerQueryString,
  };
}

export function SmartFilterToolbar({ filters }: { filters: SmartFilters }): ReactNode {
  const labels = resolveFilterLabels(useTranslatedFilterLabels());
  const operatorLabels = useTranslatedFilterOperatorLabels();
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Filters
        fields={filters.fields}
        query={filters.query}
        onQueryChange={filters.onChange}
        size="sm"
        showClear
        labels={labels}
        operatorLabels={operatorLabels}
        trigger={
          <Button type="button" variant="secondary" size="small" leadingIcon={RiFilter3Line}>
            {labels.addFilter}
          </Button>
        }
      />
    </div>
  );
}
