import { ArrowRight, Bell, CheckCircle2, CirclePause, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { getAdminProjects } from "@/lib/admin-data";
import { getAssignableAdminUsers, getNotificationTaskFingerprint, getNotificationTaskMarkers } from "@/lib/project-management";
import { getAdminSupportTickets, supportTopicLabels } from "@/lib/support";
import { getAdminTasks, type TaskItem } from "@/lib/tasks";
import { NotificationTaskForm } from "./notification-task-form";

type AdminNotification = TaskItem & {
  defaultPriority: "low" | "normal" | "high" | "urgent";
  id: string;
  notificationKey: string;
  type: "project" | "support";
};

export default async function AdminNotificationsPage() {
  const { isAdmin, projects, userEmail } = await getAdminProjects();

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Az értesítések megtekintéséhez admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/notifications">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/notifications">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  const projectNotifications: AdminNotification[] = getAdminTasks(projects).map((task) => ({
    ...task,
    defaultPriority: task.tone === "danger" ? "high" : "normal",
    id: `project-${task.projectId}-${task.title}`,
    notificationKey: `project:${task.projectId}:${task.title}`,
    type: "project",
  }));
  const [{ canView, tickets }, assignableUsers, taskMarkers] = await Promise.all([
    getAdminSupportTickets(),
    getAssignableAdminUsers(),
    getNotificationTaskMarkers(),
  ]);
  const supportNotifications: AdminNotification[] = canView
    ? tickets
        .filter((ticket) => ticket.status === "open" || ticket.status === "in_progress")
        .map((ticket) => ({
          detail: `${ticket.customerName} · ${supportTopicLabels[ticket.topic]} · ${ticket.updatedAt}`,
          defaultPriority: ticket.priority,
          href: "/admin/messages",
          id: `support-${ticket.id}`,
          notificationKey: `support:${ticket.id}`,
          projectId: ticket.projectId,
          title: ticket.subject,
          tone: ticket.priority === "urgent" || ticket.priority === "high" ? "danger" : "info",
          type: "support",
        }))
    : [];
  const notifications = [...supportNotifications, ...projectNotifications];

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Értesítések</h1>
          <p className="intro-copy">Ügyfélüzenetek és olyan projektállapotok, amelyek adminisztrátori figyelmet igényelnek.</p>
        </div>
        <div className="projects-count">{notifications.length} értesítés</div>
      </div>

      {notifications.length ? (
        <div className="task-list notification-list">
          {notifications.map((notification) => {
            const taskDescription = `Értesítésből létrehozva: ${notification.detail}`;
            return (
              <article className={`notification-card ${notification.tone}`} key={notification.id}>
                <Link className="notification-card-link" href={notification.href}>
                  <div className="task-icon">{notification.type === "support" ? <MessageSquareText size={18} /> : <Bell size={18} />}</div>
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{notification.detail}</span>
                  </div>
                </Link>
                <NotificationTaskForm
                  defaultPriority={notification.defaultPriority}
                  defaultProjectId={notification.projectId}
                  defaultTitle={notification.title}
                  description={taskDescription}
                  notificationKey={notification.notificationKey}
                  projects={projects.map((project) => ({ customerName: project.customerName, id: project.id, name: project.name }))}
                  taskCreated={taskMarkers.keys.has(notification.notificationKey) || taskMarkers.fingerprints.has(getNotificationTaskFingerprint(notification.title, taskDescription))}
                  users={assignableUsers}
                />
                <Link aria-label={`${notification.title} megnyitása`} className="notification-arrow-link" href={notification.href}>
                  <ArrowRight className="arrow" size={18} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel">
          <CheckCircle2 size={24} />
          <div>
            <strong>Nincs aktuális értesítés.</strong>
            <p>Minden ügyfélüzenet és projekt-előkészítési pont rendben van.</p>
          </div>
        </div>
      )}
    </section>
  );
}
