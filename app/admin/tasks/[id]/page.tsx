import { ArrowLeft, CirclePause, ListTodo } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getProjectManagementData, getTaskActivity } from "@/lib/project-management";
import { DeleteTaskButton } from "./delete-task-button";
import { TaskActivity } from "./task-activity";
import { TaskEditForm } from "./task-edit-form";

export default async function AdminTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access, projects, schemaReady, tasks } = await getProjectManagementData();

  if (!access.role) {
    return <section className="content"><div className="access-denied"><div className="access-denied-icon"><CirclePause size={28} /></div><h1>Nincs admin hozzáférés</h1><p>A feladat szerkesztéséhez admin jogosultság szükséges.</p><Link className="button" href="/login?next=/admin/tasks">Belépés</Link></div></section>;
  }
  if (!schemaReady) {
    return <section className="content"><div className="empty-panel task-schema-warning"><CirclePause size={24} /><div><strong>A projektmenedzsment adatbázisa nem érhető el.</strong><p>Próbáld újra később.</p></div></div></section>;
  }

  const task = tasks.find((item) => item.id === id);
  if (!task) notFound();
  const activities = await getTaskActivity(task.id);

  return (
    <section className="content">
      <Link className="back-link" href="/admin/tasks"><ArrowLeft size={15} /> Vissza a projektmenedzserhez</Link>
      <div className="detail-header task-detail-header"><div><p className="eyebrow">{getAdminRoleLabel(access.role)} · Feladat</p><h1>{task.title}</h1><p className="detail-subtitle"><ListTodo size={15} /> {task.customerName} · {task.projectName}</p></div>{access.role === "superadmin" && <DeleteTaskButton taskId={task.id} taskTitle={task.title} />}</div>
      <div className="task-detail-layout">
        <div className="task-edit-card"><TaskEditForm allowSuperadminOnly={access.role === "superadmin"} projects={projects} task={task} /></div>
        <TaskActivity activities={activities} />
      </div>
    </section>
  );
}
