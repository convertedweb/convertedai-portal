"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const weekdays = ["Hé", "Ke", "Sze", "Cs", "Pé", "Szo", "Va"];

function parseDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstVisible = new Date(firstOfMonth);
  firstVisible.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    return date;
  });
}

export function FormDatePicker({ defaultValue = "", disabled, name, onValueChange, required, value: controlledValue }: { defaultValue?: string; disabled?: boolean; name: string; onValueChange?: (value: string) => void; required?: boolean; value?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(parseDate(defaultValue) ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const todayValue = toDateValue(new Date());
  const monthLabel = new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(viewDate);
  const displayValue = selectedDate
    ? new Intl.DateTimeFormat("hu-HU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(selectedDate)
    : "Válassz dátumot";

  useEffect(() => {
    if (controlledValue !== undefined) setValue(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const reset = () => setValue(defaultValue);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue]);

  function selectDate(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <div className="form-date-picker" ref={rootRef}>
      <input disabled={disabled} name={name} required={required} type="hidden" value={value} />
      <button
        aria-expanded={open}
        className={`form-date-picker-trigger ${value ? "has-value" : ""}`}
        disabled={disabled}
        onClick={() => {
          setViewDate(selectedDate ?? new Date());
          setOpen((current) => !current);
        }}
        type="button"
      >
        <span>{displayValue}</span><CalendarDays size={17} />
      </button>
      {open && (
        <div className="date-filter-popover form-date-picker-popover">
          <div className="date-filter-popover-header">
            <div className="date-filter-popover-title">
              <span className="date-filter-popover-icon"><CalendarDays size={16} /></span>
              <div><span>Dátum kiválasztása</span><strong>{monthLabel}</strong></div>
            </div>
            <div className="date-filter-popover-navigation">
              <button aria-label="Előző hónap" onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} type="button"><ChevronLeft size={16} /></button>
              <button aria-label="Következő hónap" onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} type="button"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="date-filter-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="date-filter-days">
            {days.map((date) => {
              const dateValue = toDateValue(date);
              return (
                <button
                  aria-label={new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "long", year: "numeric" }).format(date)}
                  className={`${dateValue === value ? "selected" : ""} ${dateValue === todayValue ? "today" : ""} ${date.getMonth() !== viewDate.getMonth() ? "muted" : ""}`}
                  key={dateValue}
                  onClick={() => selectDate(dateValue)}
                  type="button"
                >{date.getDate()}</button>
              );
            })}
          </div>
          <div className="date-filter-popover-actions">
            <button onClick={() => selectDate("")} type="button">Törlés</button>
            <button onClick={() => selectDate(todayValue)} type="button">Ma</button>
          </div>
        </div>
      )}
    </div>
  );
}
