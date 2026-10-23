"use client";

import { Timer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type TimesheetEntryRow = { day: string; duration: string; id: string; range: string };

export function TimesheetTaskRows({ cells, entries, sub, taskId, title, total }: {
  cells: { day: string; text: string; weekend: boolean }[];
  entries: TimesheetEntryRow[];
  sub: string;
  taskId: string;
  title: string;
  total: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className={open ? "timesheet-task-open" : undefined}>
        <td>
          <div className="timesheet-task-cell">
            <button aria-expanded={open} aria-label={open ? "Időpontok elrejtése" : "Időpontok megjelenítése"} className="timesheet-expand" onClick={() => setOpen(!open)} type="button"><span className="timesheet-caret" /></button>
            <div><Link className="pm-task-title-link" href={`/admin/tasks/${taskId}`}>{title}</Link><span className="timesheet-sub">{sub}</span></div>
          </div>
        </td>
        {cells.map((cell) => <td className={`num${cell.weekend ? " weekend" : ""}`} key={cell.day}>{cell.text}</td>)}
        <td className="num total">{total}</td>
      </tr>
      {open && <tr className="timesheet-entry-count"><td colSpan={cells.length + 2}>{entries.length} időbejegyzés</td></tr>}
      {open && entries.map((entry) => (
        <tr className="timesheet-entry-row" key={entry.id}>
          <td><span className="timesheet-entry-range"><Timer size={13} />{entry.range}</span></td>
          {cells.map((cell) => <td className={`num${cell.weekend ? " weekend" : ""}`} key={cell.day}>{cell.day === entry.day ? entry.duration : ""}</td>)}
          <td />
        </tr>
      ))}
    </>
  );
}
