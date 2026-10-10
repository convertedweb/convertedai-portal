import { CalendarDays, CirclePause, Columns3, Filter, List, Search, UserRoundCheck, X } from "lucide-react";
import Link from "next/link";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getAssignableAdminUsers, getProjectManagementData, taskPriorityLabels, taskStatuses, taskStatusLabels, type TaskPriority, type TaskStatus } from "@/lib/project-management";
import { KanbanBoard } from "./kanban-board";
import { NewTaskForm } from "./new-task-form";
import { TaskCalendar } from "./task-calendar";
import { TaskList } from "./task-list";

type TaskSearchParams = {
  assignee?: string | string[];
  customer?: string | string[];
  due?: string | string[];
  filters?: string | string[];
  mine?: string | string[];
  priority?: string | string[];
  project?: string | string[];
  q?: string | string[];
  status?: string | string[];
  view?: string | string[];
};

function value(param: string | string[] | undefined) {
  return typeof param === "string" ? param : "";
}

function isTaskPriority(priority: string): priority is TaskPriority {
  return priority === "low" || priority === "normal" || priority === "high" || priority === "urgent";
}

function isTaskStatus(status: string): status is Exclude<TaskStatus, "archived"> {
  return taskStatuses.some((option) => option === status);
}

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<TaskSearchParams> }) {
  const params = await searchParams;
  const requestedView = value(params.view);
  const view = requestedView === "list" || requestedView === "calendar" ? requestedView : "kanban";
  const filterPanelOpen = value(params.filters) === "1";
  const [{ access, customers: allCustomers, projects, schemaReady, tasks }, assignableUsers] = await Promise.all([
    getProjectManagementData(),
    getAssignableAdminUsers(),
  ]);
  const roleLabel = getAdminRoleLabel(access.role);

  if (!access.role) {
    return (
      <section className="content task-manager-content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{access.user?.email ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/tasks">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/tasks">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  const query = value(params.q).trim();
  const projectId = value(params.project);
  const customerId = value(params.customer);
  const requestedStatus = value(params.status);
  const status = isTaskStatus(requestedStatus) ? requestedStatus : "";
  const requestedPriority = value(params.priority);
  const priority = isTaskPriority(requestedPriority) ? requestedPriority : "";
  const assignee = value(params.assignee);
  const due = value(params.due);
  const mine = value(params.mine) === "1";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const filteredTasks = tasks.filter((task) => {
    if (query) {
      const haystack = `${task.title} ${task.description} ${task.projectName} ${task.customerName}`.toLocaleLowerCase("hu-HU");
      if (!haystack.includes(query.toLocaleLowerCase("hu-HU"))) return false;
    }
    if (projectId && task.project_id !== projectId) return false;
    if (customerId && task.organizationId !== customerId) return false;
    if (status && task.status !== status) return false;
    if (priority && task.priority !== priority) return false;
    if (assignee && task.assignee_user_id !== assignee) return false;
    if (mine && task.assignee_user_id !== access.user?.id) return false;
    if (due === "none" && task.due_at) return false;
    if (due && due !== "none") {
      if (!task.due_at) return false;
      const dueDate = new Date(task.due_at);
      if (due === "overdue" && dueDate >= startOfToday) return false;
      if (due === "today" && (dueDate < startOfToday || dueDate >= endOfToday)) return false;
      if (due === "week" && (dueDate < startOfToday || dueDate >= endOfWeek)) return false;
    }
    return true;
  });

  const customers = allCustomers;
  const activeFilterCount = [query, projectId, customerId, status, priority, assignee, due, mine ? "mine" : ""].filter(Boolean).length;

  function viewHref(nextView: "kanban" | "list" | "calendar", showFilters = filterPanelOpen) {
    const nextParams = new URLSearchParams();
    nextParams.set("view", nextView);
    if (query) nextParams.set("q", query);
    if (projectId) nextParams.set("project", projectId);
    if (customerId) nextParams.set("customer", customerId);
    if (status) nextParams.set("status", status);
    if (priority) nextParams.set("priority", priority);
    if (assignee) nextParams.set("assignee", assignee);
    if (due) nextParams.set("due", due);
    if (mine) nextParams.set("mine", "1");
    if (showFilters) nextParams.set("filters", "1");
    return `/admin/tasks?${nextParams.toString()}`;
  }

  return (
    <section className="content task-manager-content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Feladatok</h1>
          <p className="intro-copy">Belső és ügyfélprojektek feladatai egy közös munkafelületen.</p>
        </div>
        {schemaReady && <div className="task-page-actions"><Link aria-expanded={filterPanelOpen} aria-label={filterPanelOpen ? "Szűrők bezárása" : "Szűrők megnyitása"} className={`task-filter-toggle${filterPanelOpen ? " active" : ""}`} href={viewHref(view, !filterPanelOpen)} title="Szűrés"><Filter size={16} />{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</Link><nav aria-label="Feladatnézet" className="task-view-switcher"><Link aria-current={view === "kanban" ? "page" : undefined} className={view === "kanban" ? "active" : ""} href={viewHref("kanban")}><Columns3 size={15} />Kanban</Link><Link aria-current={view === "list" ? "page" : undefined} className={view === "list" ? "active" : ""} href={viewHref("list")}><List size={15} />Lista</Link><Link aria-current={view === "calendar" ? "page" : undefined} className={view === "calendar" ? "active" : ""} href={viewHref("calendar")}><CalendarDays size={15} />Naptár</Link></nav><NewTaskForm allowSuperadminOnly={access.role === "superadmin"} assignableUsers={assignableUsers} currentUserId={access.user?.id ?? null} customers={customers} projects={projects} statusOptions={taskStatuses.map((id) => ({ id, label: taskStatusLabels[id] }))} /></div>}
      </div>

      {schemaReady && filterPanelOpen && (
        <form action="/admin/tasks" className="task-filter-panel" method="get">
          <input name="view" type="hidden" value={view} />
          <div className="task-filter-search">
            <Search aria-hidden="true" size={17} />
            <input defaultValue={query} name="q" placeholder="Keresés feladatban, projektben vagy ügyfélben…" type="search" />
          </div>
          <div className="task-filter-grid">
            <label><span>Ügyfél</span><select defaultValue={customerId} name="customer"><option value="">Minden ügyfél</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
            <label><span>Projekt</span><select defaultValue={projectId} name="project"><option value="">Minden projekt</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.name}</option>)}</select></label>
            <label><span>Státusz</span><select defaultValue={status} name="status"><option value="">Minden státusz</option>{taskStatuses.map((option) => <option key={option} value={option}>{taskStatusLabels[option]}</option>)}</select></label>
            <label><span>Prioritás</span><select defaultValue={priority} name="priority"><option value="">Minden prioritás</option>{Object.entries(taskPriorityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><span>Felelős</span><select defaultValue={assignee} name="assignee"><option value="">Minden felelős</option>{assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label><span>Határidő</span><select defaultValue={due} name="due"><option value="">Bármikor</option><option value="overdue">Lejárt</option><option value="today">Ma esedékes</option><option value="week">Következő 7 nap</option><option value="none">Nincs határidő</option></select></label>
          </div>
          <div className="task-filter-actions">
            <label className="task-mine-filter"><input defaultChecked={mine} name="mine" type="checkbox" value="1" /><UserRoundCheck size={16} /><span>Saját feladataim</span></label>
            <span className="task-filter-result"><Filter size={14} />{filteredTasks.length} / {tasks.length} feladat{activeFilterCount > 0 && ` · ${activeFilterCount} aktív szűrő`}</span>
            {activeFilterCount > 0 && <Link className="task-filter-clear" href={`/admin/tasks?view=${view}`}><X size={14} /> Szűrők törlése</Link>}
            <button className="button task-filter-submit" type="submit">Szűrés</button>
          </div>
        </form>
      )}

      {!schemaReady ? (
        <div className="empty-panel task-schema-warning">
          <CirclePause size={24} />
          <div><strong>A projektmenedzsment adatbázisa még nincs aktiválva.</strong><p>Futtasd le a legújabb Supabase migrációt, majd töltsd újra ezt az oldalt.</p></div>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard assigneeNames={Object.fromEntries(assignableUsers.map((user) => [user.id, user.name]))} initialTasks={filteredTasks} />
      ) : view === "calendar" ? (
        <TaskCalendar tasks={filteredTasks} />
      ) : (
        <TaskList assigneeNames={Object.fromEntries(assignableUsers.map((user) => [user.id, user.name]))} initialTasks={filteredTasks} />
      )}
    </section>
  );
}
