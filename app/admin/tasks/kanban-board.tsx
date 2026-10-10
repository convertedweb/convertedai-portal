"use client";

import { ChevronLeft, ChevronRight, Flag, GripVertical, ListTodo, UserRound } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useEffect, useState } from "react";
import type { ProjectManagementTask, TaskStatus } from "@/lib/project-management";
import { moveTask } from "./actions";

const taskStatuses = ["backlog", "planned", "todo", "in_progress", "waiting_client", "review", "done"] as const;
const taskStatusLabels = { backlog: "Ötletek", todo: "Tennivaló", planned: "Tervezve", in_progress: "Folyamatban", waiting_client: "Ügyfélre vár", review: "Ellenőrzés", done: "Kész" } as const;
const priorityLabels = { low: "Alacsony", normal: "Normál", high: "Magas", urgent: "Sürgős" } as const;
const visibilityLabels = { client_visible: "Ügyfél", internal: "Belső", superadmin_only: "Csak én" } as const;
const visibilityInitials = { client_visible: "Ü", internal: "B", superadmin_only: "S" } as const;
const taskDescriptionMaxLength = 100;

const dateFormatter = new Intl.DateTimeFormat("hu-HU", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function truncateDescription(description: string) {
  if (description.length <= taskDescriptionMaxLength) return description;
  return `${description.slice(0, taskDescriptionMaxLength).trimEnd()}…`;
}

export function KanbanBoard({ assigneeNames, initialTasks }: { assigneeNames: Record<string, string>; initialTasks: ProjectManagementTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<(typeof taskStatuses)[number]>>(
    () => new Set(taskStatuses.filter((status) => !initialTasks.some((task) => task.status === status))),
  );
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<(typeof taskStatuses)[number] | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
    setCollapsedStatuses(new Set(taskStatuses.filter((status) => !initialTasks.some((task) => task.status === status))));
  }, [initialTasks]);

  function toggleColumn(status: (typeof taskStatuses)[number]) {
    setCollapsedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function openColumn(status: (typeof taskStatuses)[number]) {
    setCollapsedStatuses((current) => {
      if (!current.has(status)) return current;
      const next = new Set(current);
      next.delete(status);
      return next;
    });
  }

  function startDragging(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
    setError(null);
  }

  async function dropTask(event: DragEvent<HTMLElement>, status: (typeof taskStatuses)[number]) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    const currentTask = tasks.find((task) => task.id === taskId);
    setDraggedTaskId(null);
    setOverStatus(null);
    if (!currentTask || currentTask.status === status) return;

    const previousTasks = tasks;
    const previousCollapsedStatuses = collapsedStatuses;
    const previousStatus = taskStatuses.find((option) => option === currentTask.status);
    setTasks((items) => items.map((task) => task.id === taskId ? { ...task, status: status as TaskStatus } : task));
    setCollapsedStatuses((current) => {
      const next = new Set(current);
      next.delete(status);
      if (previousStatus && !tasks.some((task) => task.id !== taskId && task.status === previousStatus)) next.add(previousStatus);
      return next;
    });
    setSavingTaskId(taskId);
    const result = await moveTask(taskId, status);
    setSavingTaskId(null);
    if (result.error) {
      setTasks(previousTasks);
      setCollapsedStatuses(previousCollapsedStatuses);
      setError(result.error);
    }
  }

  return (
    <>
      {error && <div className="kanban-error" role="alert">{error}</div>}
      <div className="task-board-wrap">
        <div className="task-board">
          {taskStatuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            const isCollapsed = columnTasks.length === 0 && collapsedStatuses.has(status);
            return (
              <section
                className={`task-column ${status}${isCollapsed ? " collapsed" : ""}${overStatus === status ? " drag-over" : ""}`}
                key={status}
                onDragEnter={() => { setOverStatus(status); openColumn(status); }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverStatus(null); }}
                onDrop={(event) => void dropTask(event, status)}
              >
                <header>
                  <div className="task-column-heading"><span className="task-column-dot" /><h2>{taskStatusLabels[status]}</h2></div>
                  <div className="task-column-actions">
                    <strong>{columnTasks.length}</strong>
                    {!columnTasks.length && (
                      <button
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? `${taskStatusLabels[status]} oszlop kinyitása` : `${taskStatusLabels[status]} oszlop becsukása`}
                        onClick={() => toggleColumn(status)}
                        title={isCollapsed ? "Oszlop kinyitása" : "Oszlop becsukása"}
                        type="button"
                      >
                        {isCollapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
                      </button>
                    )}
                  </div>
                </header>
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
                        <div className="pm-task-card-top">
                          <h3><Link className="pm-task-title-link" draggable={false} href={`/admin/tasks/${task.id}`}>{task.title}</Link></h3>
                          <span className={`task-visibility-avatar ${task.visibility}`} title={visibilityLabels[task.visibility]}>{visibilityInitials[task.visibility]}</span>
                        </div>
                        {task.description && <p title={task.description}>{truncateDescription(task.description)}</p>}
                        <div className="pm-task-context"><strong>{task.customerName}</strong><span>{task.projectName}</span></div>
                        {task.assignee_user_id && <span className="pm-task-assignee"><UserRound size={12} />{assigneeNames[task.assignee_user_id] ?? "Ismeretlen"}</span>}
                        <time className="pm-task-card-date" dateTime={task.created_at}>{dateFormatter.format(new Date(task.created_at))}</time>
                        <div className="pm-task-meta">
                          {task.priority !== "normal" && <span className={`priority-label ${task.priority}`}><Flag size={11} />{priorityLabels[task.priority]}</span>}
                          {task.due_at && <span className="task-due-label">Határidő: {new Intl.DateTimeFormat("hu-HU", { month: "2-digit", day: "2-digit" }).format(new Date(task.due_at))}</span>}
                          {task.source_ticket_id && <span className="ticket-source"><ListTodo size={12} /> Ticket</span>}
                          {saving && <span className="task-saving-label">Mentés...</span>}
                          <span className="task-drag-handle" title="Húzd másik oszlopba"><GripVertical size={16} /></span>
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
