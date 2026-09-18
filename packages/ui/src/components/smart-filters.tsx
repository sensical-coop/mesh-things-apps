import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryStates } from "nuqs";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiFilter3Line } from "@remixicon/react";
import { Filters } from "@mtt/ui/components/reui/filters/filters";
import { createFilterQuery, flattenFilterConditions } from "@mtt/ui/components/reui/filters/filters-query";
import type { FilterField, FilterQuery } from "@mtt/ui/components/reui/filters/filters-types";
import {
  filterUrlPatchEquals,
  parseAsFilterValue,
  queryToUrlPatch,
  serializeListFilterValue,
  toWireOperator,
  urlStateToQuery,
} from "@mtt/ui/lib/filter-url";

const NONE_ARITY = new Set(["empty", "not_empty"]);

function isActiveCondition(operator: string, values: unknown[]): boolean {
  if (NONE_ARITY.has(operator)) return true;
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
};

export type SmartFilters = {
  fields: FilterField[];
  query: FilterQuery;
  active: boolean;
  onChange: (next: FilterQuery) => void;
  clear: () => void;
  queryString: string;
};

export function useSmartFilters({ specs }: { specs: FilterSpec[] }): SmartFilters {
  const fields = useMemo<FilterField[]>(
    () =>
      specs.map(({ urlKey: _urlKey, key, ...field }) => ({
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
  const queryString = useMemo(
    () =>
      active
        .map((c) => {
          const wire = { operator: toWireOperator(c.operator), values: c.values.map(String) };
          return `${encodeURIComponent(c.field)}=${encodeURIComponent(serializeListFilterValue(wire))}`;
        })
        .join("&"),
    [active],
  );
  // ponytail: fixed 400ms — text filters refire per keystroke
  const debouncedQueryString = useDebouncedValue(queryString, 400);

  return {
    fields,
    query,
    active: active.length > 0,
    onChange,
    clear,
    queryString: debouncedQueryString,
  };
}

export function SmartFilterToolbar({ filters }: { filters: SmartFilters }): ReactNode {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Filters
        fields={filters.fields}
        query={filters.query}
        onQueryChange={filters.onChange}
        size="sm"
        showClear
        trigger={
          <Button type="button" variant="secondary" size="small" leadingIcon={RiFilter3Line}>
            Add filter
          </Button>
        }
      />
    </div>
  );
}
