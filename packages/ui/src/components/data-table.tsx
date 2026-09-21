import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
} from "@tanstack/react-table/legacy";
import { type ReactElement, type ReactNode, useState } from "react";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpSLine } from "@remixicon/react";
import { cx } from "@mtt/ui/utils/cx";

// ponytail: TanStack Table v9 column values are invariant across mixed columns.
export type DataTableColumn<T> = any;

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  empty?: ReactNode;
  getRowId?: (row: T) => string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  pageRangeOfLabel?: string;
};

export function DataTable<T>({
  data,
  columns,
  empty,
  getRowId,
  previousPageLabel = "Previous page",
  nextPageLabel = "Next page",
  pageRangeOfLabel = "of",
}: DataTableProps<T>): ReactElement {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const table = useLegacyTable({
    data: data as never[],
    columns,
    onSortingChange: setSorting as never,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
    getRowId: getRowId as never,
  });

  const rows = table.getRowModel().rows;
  const total = data.length;
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div className="oa-arrive flex min-h-0 flex-col">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] caption-bottom text-left text-body-2-regular">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cx(
                        "h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary",
                        canSort && "cursor-pointer select-none",
                      )}
                      aria-sort={
                        canSort ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined) : undefined
                      }
                      tabIndex={canSort ? 0 : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                header.column.toggleSorting();
                              }
                            }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? (
                          sorted === "asc" ? (
                            <RiArrowUpSLine className="size-3" />
                          ) : sorted === "desc" ? (
                            <RiArrowDownSLine className="size-3" />
                          ) : (
                            <RiArrowDownSLine className="size-3 opacity-40" />
                          )
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="text-text-primary hover:bg-background-primary-hover"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-8 px-3.5 py-0 align-middle whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 px-3.5 text-center text-body-regular text-text-secondary">
                  {empty ?? "Nothing to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > pageSize ? (
        <div className="flex h-12 min-w-0 shrink-0 flex-wrap items-center justify-between gap-2 px-3.5 text-caption-1-regular text-text-secondary">
          <span>
            {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} {pageRangeOfLabel} {total}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              leadingIcon={RiArrowLeftSLine}
              aria-label={previousPageLabel}
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              leadingIcon={RiArrowRightSLine}
              aria-label={nextPageLabel}
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
