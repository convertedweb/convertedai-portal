"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useEffect, useMemo, useState } from "react";
import type { ProjectManagementTask } from "@/lib/project-management";
import { moveTaskDueDate } from "./actions";

const weekdays = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const maxChips = 3;
type Mode = "month" | "week";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
}

export function TaskCalendar({ tasks }: { tasks: ProjectManagementTask[] }) {
  const [items, setItems] = useState(tasks);
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const todayKey = dayKey(new Date());

  useEffect(() => setItems(tasks), [tasks]);

  const { byDay, undated } = useMemo(() => {
    const map = new Map<string, ProjectManagementTask[]>();
    const noDate: ProjectManagementTask[] = [];
    for (const task of items) {
      if (task.status === "archived") continue;
      if (!task.due_at) { noDate.push(task); continue; }
      const key = dayKey(new Date(task.due_at));
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return { byDay: map, undated: noDate };
  }, [items]);

  const days = useMemo(() => {
    const first = mode === "week" ? mondayOf(cursor) : mondayOf(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return Array.from({ length: mode === "week" ? 7 : 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
  }, [cursor, mode]);

  const shift = (delta: number) => setCursor((current) => mode === "week"
    ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + delta * 7)
    : new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const label = mode === "week"
    ? new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", year: "numeric" }).formatRange(days[0], days[6])
    : new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(cursor);
  const toggleExpanded = (key: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  async function dropTask(event: DragEvent<HTMLElement>, key: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    setOverDay(null);
    const task = items.find((item) => item.id === taskId);
    if (!task || (task.due_at && dayKey(new Date(task.due_at)) === key)) return;

    const previous = items;
    setItems((current) => current.map((item) => item.id === task.id ? { ...item, due_at: new Date(`${key}T23:59:59`).toISOString() } : item));
    const result = await moveTaskDueDate(task.id, key);
    if (result.error) {
      setItems(previous);
      setError(result.error);
    }
  }

  const chip = (task: ProjectManagementTask) => (
    <Link
      className={`task-calendar-chip priority-${task.priority}${task.status === "done" ? " done" : ""}${draggedId === task.id ? " dragging" : ""}`}
      draggable
      href={`/admin/tasks/${task.id}`}
      key={task.id}
      onDragEnd={() => { setDraggedId(null); setOverDay(null); }}
      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.id); setDraggedId(task.id); setError(null); }}
      title={`${task.title} · ${task.customerName}`}
    >{task.title}</Link>
  );

  return (
    <div className="task-calendar">
      {error && <div className="kanban-error" role="alert">{error}</div>}
      <div className="task-calendar-toolbar">
        <button aria-label={mode === "week" ? "Előző hét" : "Előző hónap"} onClick={() => shift(-1)} type="button"><ChevronLeft size={18} /></button>
        <h2>{label}</h2>
        <button aria-label={mode === "week" ? "Következő hét" : "Következő hónap"} onClick={() => shift(1)} type="button"><ChevronRight size={18} /></button>
        <div className="task-calendar-mode">
          <button aria-pressed={mode === "month"} className={mode === "month" ? "active" : ""} onClick={() => setMode("month")} type="button">Hónap</button>
          <button aria-pressed={mode === "week"} className={mode === "week" ? "active" : ""} onClick={() => setMode("week")} type="button">Hét</button>
        </div>
        <button className="task-calendar-today" onClick={() => setCursor(new Date())} type="button">Ma</button>
      </div>
      <div className={`task-calendar-grid ${mode}`}>
        {weekdays.map((name) => <div className="task-calendar-weekday" key={name}>{name}</div>)}
        {days.map((day) => {
          const key = dayKey(day);
          const dayTasks = byDay.get(key) ?? [];
          const showAll = mode === "week" || expanded.has(key);
          return (
            <div
              className={`task-calendar-day${mode === "month" && day.getMonth() !== cursor.getMonth() ? " outside" : ""}${key === todayKey ? " today" : ""}${overDay === key ? " drag-over" : ""}`}
              key={key}
              onDragEnter={() => setOverDay(key)}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverDay(null); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => void dropTask(event, key)}
            >
              <span className="task-calendar-date">{day.getDate()}</span>
              {(showAll ? dayTasks : dayTasks.slice(0, maxChips)).map(chip)}
              {mode === "month" && dayTasks.length > maxChips && (
                <button className="task-calendar-more" onClick={() => toggleExpanded(key)} type="button">{expanded.has(key) ? "Kevesebb" : `+${dayTasks.length - maxChips} további`}</button>
              )}
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <div className="task-calendar-undated">
          <h3>Határidő nélkül ({undated.length}) · húzd egy napra a határidő beállításához</h3>
          <div>{undated.map(chip)}</div>
        </div>
      )}
    </div>
  );
}
