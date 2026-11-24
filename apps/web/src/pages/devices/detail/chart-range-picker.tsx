import { Calendar } from "@mtt/ui/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@mtt/ui/components/ui/popover";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiCalendarLine } from "@remixicon/react";
import { type ReactElement, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useIntl } from "react-intl";
import { useLocale } from "@mtt/ui/hooks/use-locale";
import {
  CHART_RANGE_PRESETS,
  type DeviceChartRange,
  customRangeFromDates,
  customRangeSelection,
  presetRange,
} from "./chart-range";
import { RangeRow } from "./range-row";

type DeviceChartRangePickerProps = {
  value: DeviceChartRange;
  onChange: (range: DeviceChartRange) => void;
};

export function DeviceChartRangePicker({ value, onChange }: DeviceChartRangePickerProps): ReactElement {
  const { formatMessage } = useIntl();
  const [locale] = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  useEffect(() => {
    if (open) setDraft(customRangeSelection(value));
  }, [open, value]);

  function applyPreset(preset: (typeof CHART_RANGE_PRESETS)[number]) {
    onChange(presetRange(preset));
    setOpen(false);
  }

  function applyCustom() {
    if (!draft?.from) return;
    onChange(customRangeFromDates(draft.from, draft.to ?? draft.from, locale));
    setOpen(false);
  }

  const presetMatch =
    value.kind === "preset" ? CHART_RANGE_PRESETS.find((preset) => preset.start === value.start) : undefined;
  const displayLabel =
    value.kind === "custom"
      ? value.label
      : presetMatch && formatMessage({ id: presetMatch.messageId, defaultMessage: presetMatch.label });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" size="small" variant="secondary" leadingIcon={RiCalendarLine} className="max-w-full">
            <span className="truncate">{displayLabel}</span>
          </Button>
        }
      />
      <PopoverContent
        className="w-auto gap-0 oa-squircle border border-separator-border bg-background-primary-default p-1 text-text-primary shadow-dropdown"
        align="end"
        sideOffset={4}
      >
        <div className="flex flex-col sm:flex-row">
          <div
            className="flex min-w-44 flex-col gap-0.5 p-1"
            role="group"
            aria-label={formatMessage({
              id: "page.devices.detail.chartRange.quickRange",
              defaultMessage: "Quick range",
            })}
          >
            {CHART_RANGE_PRESETS.map((preset) => (
              <RangeRow
                key={preset.start}
                selected={value.kind === "preset" && value.start === preset.start}
                onClick={() => applyPreset(preset)}
              >
                {formatMessage({ id: preset.messageId, defaultMessage: preset.label })}
              </RangeRow>
            ))}
          </div>
          <div className="flex flex-col gap-2 oa-squircle-inset bg-background-secondary-default p-2">
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
              {formatMessage({ id: "page.devices.detail.chartRange.applyDates", defaultMessage: "Apply dates" })}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
