"use client";

import { CalendarDays, Flag, GripVertical, ListTodo, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useEffect, useState } from "react";
import type { ProjectManagementTask, TaskStatus } from "@/lib/project-management";
import { moveTask } from "./actions";

const statuses = ["backlog", "planned", "in_progress", "waiting_client", "review", "done"] as const;
const statusLabels = { backlog: "Ötletek", planned: "Tervezve", in_progress: "Folyamatban", waiting_client: "Ügyfélre vár", review: "Ellenőrzés", done: "Kész" } as const;
const priorityLabels = { low: "Alacsony", normal: "Normál", high: "Magas", urgent: "Sürgős" } as const;

export function KanbanBoard({ initialTasks }: { initialTasks: ProjectManagementTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<(typeof statuses)[number] | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTasks(initialTasks), [initialTasks]);

  function startDragging(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
    setError(null);
  }

  async function dropTask(event: DragEvent<HTMLElement>, status: (typeof statuses)[number]) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    const currentTask = tasks.find((task) => task.id === taskId);
    setDraggedTaskId(null);
    setOverStatus(null);
    if (!currentTask || currentTask.status === status) return;

    const previousTasks = tasks;
    setTasks((items) => items.map((task) => task.id === taskId ? { ...task, status: status as TaskStatus } : task));
    setSavingTaskId(taskId);
    const result = await moveTask(taskId, status);
    setSavingTaskId(null);
    if (result.error) {
      setTasks(previousTasks);
      setError(result.error);
    }
  }

  return (
    <>
      {error && <div className="kanban-error" role="alert">{error}</div>}
      <div className="task-board-wrap">
        <div className="task-board">
          {statuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <section
                className={`task-column ${status}${overStatus === status ? " drag-over" : ""}`}
                key={status}
                onDragEnter={() => setOverStatus(status)}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverStatus(null); }}
                onDrop={(event) => void dropTask(event, status)}
              >
                <header><div><span className="task-column-dot" /><h2>{statusLabels[status]}</h2></div><strong>{columnTasks.length}</strong></header>
                <div className="task-column-cards">
                  {columnTasks.map((task) => {
                    const saving = savingTaskId === task.id;
                    return (
                      <article
                        aria-grabbed={draggedTaskId === task.id}
                        className={`pm-task-card priority-${task.priority} status-${task.status}${draggedTaskId === task.id ? " dragging" : ""}${saving ? " saving" : ""}`}
                        draggable={!saving}
                        key={task.id}
                        onDragEnd={() => { setDraggedTaskId(null); setOverStatus(null); }}
                        onDragStart={(event) => startDragging(event, task.id)}
                      >
                        <div className="pm-task-card-top"><span className={`priority-label ${task.priority}`}><Flag size={11} />{priorityLabels[task.priority]}</span><div className="pm-task-card-flags">{task.source_ticket_id && <span className="ticket-source"><ListTodo size={12} /> Ticket</span>}<span className="task-drag-handle" title="Húzd másik oszlopba"><GripVertical size={15} /></span></div></div>
                        <h3><Link className="pm-task-title-link" draggable={false} href={`/admin/tasks/${task.id}`}>{task.title}</Link></h3>
                        {task.description && <p>{task.description}</p>}
                        <div className="pm-task-context"><strong>{task.projectName}</strong><span>{task.customerName}</span></div>
                        <div className="pm-task-meta">
                          <span title={task.visibility === "superadmin_only" ? "Csak szuperadmin láthatja" : task.visibility === "internal" ? "Csak belső" : "Ügyfél is látja"}>{task.visibility === "superadmin_only" ? <ShieldCheck size={14} /> : task.visibility === "internal" ? <LockKeyhole size={14} /> : <Users size={14} />}{task.visibility === "superadmin_only" ? "Csak én" : task.visibility === "internal" ? "Belső" : "Ügyfél"}</span>
                          {task.due_at && <span><CalendarDays size={14} />{new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric" }).format(new Date(task.due_at))}</span>}
                          {saving && <span className="task-saving-label">Mentés...</span>}
                        </div>
                      </article>
                    );
                  })}
                  {!columnTasks.length && <div className="task-column-empty">{draggedTaskId ? "Húzd ide" : "Nincs feladat"}</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
