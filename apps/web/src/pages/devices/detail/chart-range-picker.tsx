import { Calendar } from "@mtt/ui/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@mtt/ui/components/ui/popover";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils/cx";
import { RiCalendarLine } from "@remixicon/react";
import { type ReactElement, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CHART_RANGE_PRESETS,
  type DeviceChartRange,
  customRangeFromDates,
  customRangeSelection,
} from "./chart-range";

type DeviceChartRangePickerProps = {
  value: DeviceChartRange;
  onChange: (range: DeviceChartRange) => void;
};

function RangeRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}): ReactElement {
  return (
    <button
      type="button"
      className={cx(
        "flex h-8 w-full items-center rounded-lg px-3 text-left text-body-regular text-text-primary outline-none",
        "hover:bg-background-primary-hover",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected && "bg-background-secondary-default",
      )}
      aria-current={selected || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DeviceChartRangePicker({ value, onChange }: DeviceChartRangePickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  useEffect(() => {
    if (open) setDraft(customRangeSelection(value));
  }, [open, value]);

  function applyPreset(preset: (typeof CHART_RANGE_PRESETS)[number]) {
    onChange({
      kind: "preset",
      label: preset.label,
      start: preset.start,
      window: preset.window,
    });
    setOpen(false);
  }

  function applyCustom() {
    if (!draft?.from) return;
    onChange(customRangeFromDates(draft.from, draft.to ?? draft.from));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" size="small" variant="secondary" leadingIcon={RiCalendarLine} className="max-w-full">
            <span className="truncate">{value.label}</span>
          </Button>
        }
      />
      <PopoverContent
        className="oa-squircle w-auto gap-0 border border-separator-border bg-background-primary-default p-1 text-text-primary shadow-dropdown"
        align="end"
        sideOffset={4}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex min-w-44 flex-col gap-0.5 p-1" role="group" aria-label="Quick range">
            {CHART_RANGE_PRESETS.map((preset) => (
              <RangeRow
                key={preset.start}
                selected={value.kind === "preset" && value.start === preset.start}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </RangeRow>
            ))}
          </div>
          <div className="oa-squircle-inset flex flex-col gap-2 bg-background-secondary-default p-2">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.to ?? draft?.from}
              disabled={{ after: new Date() }}
              weekStartsOn={1}
              numberOfMonths={1}
              className="bg-transparent p-0"
              classNames={{
                weekday:
                  "flex-1 rounded-(--cell-radius) text-body-2-regular text-text-primary select-none",
                caption_label: "text-body-medium text-text-primary select-none",
              }}
            />
            <Button type="button" size="small" className="self-end" disabled={!draft?.from} onClick={applyCustom}>
              Apply dates
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
