"use client";

import { CalendarDays, ChevronDown, Flag, GripVertical, ListTodo, LockKeyhole, ShieldCheck, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useEffect, useState } from "react";
import type { ProjectManagementTask, TaskStatus } from "@/lib/project-management";
import { moveTask } from "./actions";

const taskStatuses = ["backlog", "planned", "todo", "in_progress", "waiting_client", "review", "done"] as const;
type Status = (typeof taskStatuses)[number];
const taskStatusLabels = { backlog: "Ötletek", todo: "Tennivaló", planned: "Tervezve", in_progress: "Folyamatban", waiting_client: "Ügyfélre vár", review: "Ellenőrzés", done: "Kész" } as const;
const priorityLabels = { low: "Alacsony", normal: "Normál", high: "Magas", urgent: "Sürgős" } as const;
const shortDate = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" });

export function TaskList({ assigneeNames, initialTasks }: { assigneeNames: Record<string, string>; initialTasks: ProjectManagementTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [openStatuses, setOpenStatuses] = useState<Set<Status>>(() => new Set(["todo"]));
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTasks(initialTasks), [initialTasks]);

  function setOpen(status: Status, open: boolean) {
    setOpenStatuses((current) => {
      if (current.has(status) === open) return current;
      const next = new Set(current);
      if (open) next.add(status);
      else next.delete(status);
      return next;
    });
  }

  async function dropTask(event: DragEvent<HTMLElement>, status: Status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setOverStatus(null);
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === status) return;

    const previousTasks = tasks;
    setTasks((items) => items.map((task) => task.id === currentTask.id ? { ...task, status: status as TaskStatus } : task));
    setSavingTaskId(currentTask.id);
    const result = await moveTask(currentTask.id, status);
    setSavingTaskId(null);
    if (result.error) {
      setTasks(previousTasks);
      setError(result.error);
    }
  }

  return (
    <div className="pm-task-list-wrap">
      {error && <div className="kanban-error" role="alert">{error}</div>}
      <div className="pm-task-list-head"><span>Feladat</span><span>Projekt</span><span>Felelős</span><span>Prioritás</span><span>Láthatóság</span><span>Határidő</span></div>
      <div className="pm-task-list">
        {taskStatuses.map((status) => {
          const sectionTasks = tasks.filter((task) => task.status === status);
          return (
            <details
              className={`pm-task-list-section${overStatus === status ? " drag-over" : ""}`}
              key={status}
              onDragEnter={() => { setOverStatus(status); setOpen(status, true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverStatus(null); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => void dropTask(event, status)}
              onToggle={(event) => setOpen(status, event.currentTarget.open)}
              open={openStatuses.has(status)}
            >
              <summary className={`pm-task-list-section-heading ${status}`}>
                <div><i /><h2>{taskStatusLabels[status]}</h2></div>
                <div className="pm-task-list-section-actions"><strong>{sectionTasks.length}</strong><ChevronDown aria-hidden="true" size={18} /></div>
              </summary>
              {sectionTasks.map((task) => (
                <article
                  className={`pm-task-list-row priority-${task.priority}${draggedTaskId === task.id ? " dragging" : ""}${savingTaskId === task.id ? " saving" : ""}`}
                  draggable={savingTaskId !== task.id}
                  key={task.id}
                  onDragEnd={() => { setDraggedTaskId(null); setOverStatus(null); }}
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.id); setDraggedTaskId(task.id); setError(null); }}
                >
                  <div className="pm-task-list-title"><strong><GripVertical className="task-drag-handle" size={14} /><Link className="pm-task-title-link" draggable={false} href={`/admin/tasks/${task.id}`}>{task.title}</Link></strong>{task.description && <p>{task.description}</p>}{task.source_ticket_id && <span className="ticket-source"><ListTodo size={12} /> Ticket</span>}</div>
                  <div className="pm-task-list-project"><strong>{task.projectName}</strong><span>{task.customerName}</span></div>
                  <span className="pm-task-list-assignee"><UserRound size={14} />{task.assignee_user_id ? assigneeNames[task.assignee_user_id] ?? "Ismeretlen" : "—"}</span>
                  <span className={`priority-label ${task.priority}`}><Flag size={11} />{priorityLabels[task.priority]}</span>
                  <span className="pm-task-list-visibility">{task.visibility === "superadmin_only" ? <ShieldCheck size={14} /> : task.visibility === "internal" ? <LockKeyhole size={14} /> : <Users size={14} />}{task.visibility === "superadmin_only" ? "Csak én" : task.visibility === "internal" ? "Belső" : "Ügyfél"}</span>
                  <span className="pm-task-list-date">{task.due_at ? <><CalendarDays size={14} />{task.start_date && <>{shortDate.format(new Date(`${task.start_date}T00:00:00`))} – </>}{fullDate.format(new Date(task.due_at))}</> : task.start_date ? <><CalendarDays size={14} />{fullDate.format(new Date(`${task.start_date}T00:00:00`))} –</> : "—"}</span>
                </article>
              ))}
              {!sectionTasks.length && <div className="task-column-empty">{draggedTaskId ? "Húzd ide" : "Nincs feladat"}</div>}
            </details>
          );
        })}
        {!initialTasks.length && <div className="task-list-empty">Nincs a szűrésnek megfelelő feladat.</div>}
      </div>
    </div>
  );
}
