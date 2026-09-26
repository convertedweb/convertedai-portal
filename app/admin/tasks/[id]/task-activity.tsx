import { Bell, GitCommitHorizontal, History, ListTodo, Pencil, Plus } from "lucide-react";
import { taskPriorityLabels, taskStatusLabels, type TaskActivityItem, type TaskPriority, type TaskStatus } from "@/lib/project-management";

type Change = { from?: unknown; to?: unknown };

const visibilityLabels: Record<string, string> = {
  client_visible: "Ügyfél is látja",
  internal: "Csak belső",
  superadmin_only: "Csak én",
};

const fieldLabels: Record<string, string> = {
  description: "Leírás",
  dueAt: "Határidő",
  priority: "Prioritás",
  projectId: "Projekt",
  status: "Státusz",
  title: "Cím",
  visibility: "Láthatóság",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDueDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Nincs határidő";
  return new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatValue(field: string, value: unknown) {
  if (field === "description") return "módosítva";
  if (field === "projectId") return value ? "másik projektre állítva" : "nincs projekt";
  if (field === "dueAt") return formatDueDate(value);
  if (field === "status" && typeof value === "string" && value in taskStatusLabels) return taskStatusLabels[value as TaskStatus];
  if (field === "priority" && typeof value === "string" && value in taskPriorityLabels) return taskPriorityLabels[value as TaskPriority];
  if (field === "visibility" && typeof value === "string") return visibilityLabels[value] ?? value;
  if (value === null || value === undefined || value === "") return "nincs megadva";
  return String(value);
}

function getChangeLines(activity: TaskActivityItem) {
  const changes = activity.metadata.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];

  return Object.entries(changes as Record<string, Change>).map(([field, change]) => {
    if (field === "description") return "Leírás módosítva";
    if (field === "projectId") return "Projekt módosítva";
    return `${fieldLabels[field] ?? field}: ${formatValue(field, change.from)} → ${formatValue(field, change.to)}`;
  });
}

function ActivityIcon({ eventType, source }: { eventType: string; source?: unknown }) {
  if (source === "notification") return <Bell size={16} />;
  if (source === "ticket" || eventType === "support_ticket_converted_to_task") return <ListTodo size={16} />;
  if (eventType === "task_created") return <Plus size={16} />;
  if (eventType === "task_status_updated") return <GitCommitHorizontal size={16} />;
  return <Pencil size={16} />;
}

export function TaskActivity({ activities }: { activities: TaskActivityItem[] }) {
  return (
    <section className="task-activity-card">
      <div className="task-activity-heading"><History size={18} /><div><h2>Aktivitási előzmények</h2><p>{activities.length} esemény</p></div></div>
      {activities.length ? (
        <div className="task-activity-list">
          {activities.map((activity) => {
            const changes = getChangeLines(activity);
            return (
              <article className="task-activity-item" key={activity.id}>
                <div className="task-activity-icon"><ActivityIcon eventType={activity.eventType} source={activity.metadata.source} /></div>
                <div className="task-activity-content">
                  <div className="task-activity-title"><strong>{activity.title}</strong><time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time></div>
                  <p><strong>{activity.actorName}</strong>{activity.description ? ` · ${activity.description}` : ""}</p>
                  {changes.length > 0 && <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul>}
                  {activity.eventType === "task_status_updated" && changes.length === 0 && typeof activity.metadata.status === "string" && <span className="task-activity-detail">Új státusz: {formatValue("status", activity.metadata.status)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="task-activity-empty">Még nincs rögzített aktivitás.</div>}
    </section>
  );
}
