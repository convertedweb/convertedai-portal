"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export function FormTimePicker({ defaultValue = "08:00", disabled, name }: { defaultValue?: string; disabled?: boolean; name: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hour, minute] = value.split(":");

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    // A kiválasztott óra és perc legyen látható a megnyitáskor.
    rootRef.current?.querySelectorAll(".selected").forEach((element) => element.scrollIntoView({ block: "center" }));
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="form-date-picker form-time-picker" ref={rootRef}>
      <input disabled={disabled} name={name} type="hidden" value={value} />
      <button aria-expanded={open} className="form-date-picker-trigger has-value" disabled={disabled} onClick={() => setOpen((current) => !current)} type="button">
        <span>{value}</span><Clock size={15} />
      </button>
      {open && (
        <div className="date-filter-popover form-date-picker-popover time-picker-popover">
          <div className="time-picker-columns">
            <div className="date-filter-days time-picker-column">
              {hours.map((item) => <button className={item === hour ? "selected" : ""} key={item} onClick={() => setValue(`${item}:${minute}`)} type="button">{item}</button>)}
            </div>
            <div className="date-filter-days time-picker-column">
              {minutes.map((item) => <button className={item === minute ? "selected" : ""} key={item} onClick={() => setValue(`${hour}:${item}`)} type="button">{item}</button>)}
            </div>
          </div>
          <div className="date-filter-popover-actions"><button onClick={() => setOpen(false)} type="button">Kész</button></div>
        </div>
      )}
    </div>
  );
}
