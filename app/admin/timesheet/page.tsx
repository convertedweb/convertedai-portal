import { ChevronLeft, ChevronRight, CirclePause, Download, ListChecks, PieChart, Table2 } from "lucide-react";
import Link from "next/link";
import { taskStatuses, taskStatusLabels } from "@/lib/project-management";
import { getTimesheetData } from "@/lib/timesheet-data";
import { CustomerProjectFilter } from "../customer-project-filter";
import { TimesheetTaskRows } from "./timesheet-task-rows";
import { addDays, addMonths, formatDuration, isWeekend, monthRangeOf, timesheetTimeZone, weekStartOf } from "@/lib/timesheet";

type SearchParams = { customer?: string; date?: string; period?: string; project?: string; status?: string; user?: string; view?: string; weekends?: string };

const dayLabel = new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" });
const monthLabel = new Intl.DateTimeFormat("hu-HU", { month: "long", timeZone: "UTC", year: "numeric" });
const compactDay = new Intl.DateTimeFormat("hu-HU", { timeZone: "UTC", weekday: "short" });
const rangeLabel = new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" });
const timeLabel = new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit", timeZone: timesheetTimeZone });
const dayTarget = 8 * 3600 * 1000;

export default async function AdminTimesheetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { access, allowed, allTasks, entries: segments, monthly, range, schemaReady, scope, taskById, userName, visibleUsers, me } = await getTimesheetData(params);

  if (!allowed) {
    return <section className="content"><div className="access-denied"><div className="access-denied-icon"><CirclePause size={28} /></div><h1>Nincs hozzáférés</h1><p>Az időnyilvántartáshoz admin jogosultság szükséges.</p></div></section>;
  }

  const hideWeekends = params.weekends === "hide";
  const view = params.view === "entries" || params.view === "summary" ? params.view : "table";
  const entriesView = view === "entries";
  const rangeDays = Array.from({ length: Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1 }, (_, index) => addDays(range.start, index));
  const days = rangeDays.filter((day) => !hideWeekends || !isWeekend(day));
  const entries = segments.map((segment) => ({ ...segment, range: `${timeLabel.format(segment.from)} – ${segment.running ? "fut" : timeLabel.format(segment.to)}` }));

  // felhasználó → feladat → nap → ms
  const perUser = new Map<string, Map<string, Map<string, number>>>();
  const dayTotals = new Map<string, number>();
  for (const entry of entries) {
    const userTasks = perUser.get(entry.user_id) ?? new Map<string, Map<string, number>>();
    const taskDays = userTasks.get(entry.task_id) ?? new Map<string, number>();
    taskDays.set(entry.day, (taskDays.get(entry.day) ?? 0) + entry.ms);
    userTasks.set(entry.task_id, taskDays);
    perUser.set(entry.user_id, userTasks);
    dayTotals.set(entry.day, (dayTotals.get(entry.day) ?? 0) + entry.ms);
  }
  const visibleDays = new Set(days);
  const total = entries.filter((entry) => visibleDays.has(entry.day)).reduce((sum, entry) => sum + entry.ms, 0);

  const href = (overrides: SearchParams) => {
    const next = new URLSearchParams();
    const merged = { customer: params.customer, date: range.start, period: params.period, project: params.project, status: params.status, user: params.user, view: params.view, weekends: params.weekends, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    return `/admin/timesheet?${next.toString()}`;
  };
  const customerOptions = Array.from(new Map(allTasks.map((task) => [task.organizationId, task.customerName])));
  const projectOptions = Array.from(new Map(allTasks.filter((task) => task.project_id).map((task) => [task.project_id as string, { customerId: task.organizationId, id: task.project_id as string, name: task.projectName }])).values());
  const exportQuery = new URLSearchParams(Object.entries({ customer: params.customer, date: range.start, period: params.period, project: params.project, status: params.status, user: params.user }).filter((pair): pair is [string, string] => Boolean(pair[1]))).toString();

  // ügyfél → projekt → feladat összesítés (az Összesítés nézethez)
  const grouped = new Map<string, { ms: number; name: string; projects: Map<string, { ms: number; name: string; tasks: Map<string, number> }> }>();
  for (const entry of entries) {
    if (!visibleDays.has(entry.day)) continue;
    const task = taskById.get(entry.task_id)!;
    const customer = grouped.get(task.organizationId) ?? { ms: 0, name: task.customerName, projects: new Map() };
    const projectKey = task.project_id ?? "none";
    const project = customer.projects.get(projectKey) ?? { ms: 0, name: task.projectName, tasks: new Map() };
    customer.ms += entry.ms;
    project.ms += entry.ms;
    project.tasks.set(task.id, (project.tasks.get(task.id) ?? 0) + entry.ms);
    customer.projects.set(projectKey, project);
    grouped.set(task.organizationId, customer);
  }
  const groupedList = Array.from(grouped).sort((a, b) => b[1].ms - a[1].ms);

  const currentStart = monthly ? monthRangeOf(undefined).start : weekStartOf(undefined);
  const shift = (direction: 1 | -1) => (monthly ? addMonths(range.start, direction) : addDays(range.start, direction * 7));
  const label = monthly
    ? monthLabel.format(new Date(`${range.start}T00:00:00Z`))
    : `${rangeLabel.format(new Date(`${range.start}T00:00:00Z`))} – ${rangeLabel.format(new Date(`${range.end}T00:00:00Z`))}`;

  return (
    <section className="content">
      <div className="timesheet-toolbar">
        <Link aria-label={monthly ? "Előző hónap" : "Előző hét"} className="timesheet-nav" href={href({ date: shift(-1) })}><ChevronLeft size={18} /></Link>
        <Link aria-label={monthly ? "Következő hónap" : "Következő hét"} className="timesheet-nav" href={href({ date: shift(1) })}><ChevronRight size={18} /></Link>
        <h1>{label}</h1>
        {range.start !== currentStart && <Link className="secondary-button" href={href({ date: currentStart })}>{monthly ? "Ez a hónap" : "Ez a hét"}</Link>}
        <div className="timesheet-toolbar-right">
          <Link className={`timesheet-toggle${hideWeekends ? " on" : ""}`} href={href({ weekends: hideWeekends ? "" : "hide" })}><span /> Hétvége elrejtése</Link>
          <nav className="task-view-switcher" aria-label="Időszak">
            <Link className={monthly ? "" : "active"} href={href({ date: range.start, period: "" })}>Hét</Link>
            <Link className={monthly ? "active" : ""} href={href({ date: range.start, period: "month" })}>Hónap</Link>
          </nav>
          <nav className="task-view-switcher" aria-label="Időnyilvántartás nézet">
            <Link className={view === "table" ? "active" : ""} href={href({ view: "" })}><Table2 size={15} />Tábla</Link>
            <Link className={view === "entries" ? "active" : ""} href={href({ view: "entries" })}><ListChecks size={15} />Bejegyzések</Link>
            <Link className={view === "summary" ? "active" : ""} href={href({ view: "summary" })}><PieChart size={15} />Összesítés</Link>
          </nav>
        </div>
      </div>

      <form action="/admin/timesheet" className="timesheet-filters" method="get">
        {(["date", "period", "view", "weekends"] as const).map((key) => (key === "date" ? range.start : params[key]) ? <input key={key} name={key} type="hidden" value={key === "date" ? range.start : params[key]} /> : null)}
        <CustomerProjectFilter customers={customerOptions.map(([id, name]) => ({ id, name }))} defaultCustomer={params.customer} defaultProject={params.project} projects={projectOptions} />
        <select aria-label="Feladat státusza" defaultValue={params.status ?? ""} name="status"><option value="">Minden státusz</option>{taskStatuses.map((status) => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}<option value="archived">Archivált</option></select>
        <button className="secondary-button" type="submit">Szűrés</button>
        {(params.customer || params.project || params.status) && <Link className="timesheet-filter-clear" href={href({ customer: "", project: "", status: "" })}>Szűrők törlése</Link>}
        {visibleUsers.length > 1 && (
          <select aria-label="Felhasználó" className="timesheet-user-select" defaultValue={scope === me ? "" : scope} name="user">
            <option value="">Saját</option>
            <option value="all">Mindenki</option>
            {visibleUsers.filter((user) => user.id !== me).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        )}
        <a className="secondary-button timesheet-export" href={`/admin/timesheet/export?${exportQuery}`}><Download size={14} />CSV export</a>
      </form>

      {!schemaReady ? (
        <div className="empty-panel task-schema-warning"><CirclePause size={24} /><div><strong>Az adatbázis nem érhető el.</strong></div></div>
      ) : view === "summary" ? (
        <div className="timesheet-card">
          <table className="timesheet-table summary">
            <thead><tr><th>Ügyfél / projekt / feladat</th><th className="num">Idő</th><th className="num">Arány</th></tr></thead>
            <tbody>
              {groupedList.map(([customerId, customer]) => [
                <tr className="timesheet-user-row" key={customerId}><td>{customer.name}</td><td className="num">{formatDuration(customer.ms)}</td><td className="num">{Math.round((customer.ms / total) * 100)}%</td></tr>,
                ...Array.from(customer.projects).sort((a, b) => b[1].ms - a[1].ms).flatMap(([projectKey, project]) => [
                  <tr key={`${customerId}-${projectKey}`}><td className="summary-project">{project.name}<span className="timesheet-sub">{project.tasks.size} feladat</span></td><td className="num">{formatDuration(project.ms)}</td><td className="num"><span className="summary-bar"><b style={{ width: `${(project.ms / total) * 100}%` }} /></span></td></tr>,
                  ...Array.from(project.tasks).sort((a, b) => b[1] - a[1]).map(([taskId, ms]) => (
                    <tr className="timesheet-entry-row" key={`${customerId}-${projectKey}-${taskId}`}><td className="summary-task"><Link className="pm-task-title-link" href={`/admin/tasks/${taskId}`}>{taskById.get(taskId)!.title}</Link></td><td className="num">{formatDuration(ms)}</td><td /></tr>
                  )),
                ]),
              ])}
              {!total && <tr><td className="timesheet-empty" colSpan={3}>Ebben az időszakban nincs rögzített idő.</td></tr>}
              {total > 0 && <tr className="summary-total"><td>Összesen</td><td className="num">{formatDuration(total)}</td><td /></tr>}
            </tbody>
          </table>
        </div>
      ) : entriesView ? (
        <div className="timesheet-card">
          <table className="timesheet-table entries">
            <thead><tr><th>Feladat</th>{scope === "all" && <th>Felhasználó</th>}<th>Nap</th><th>Időszak</th><th className="num">Időtartam</th></tr></thead>
            <tbody>
              {entries.filter((entry) => visibleDays.has(entry.day)).map((entry) => {
                const task = taskById.get(entry.task_id)!;
                return <tr key={entry.id}>
                  <td><Link className="pm-task-title-link" href={`/admin/tasks/${task.id}`}>{task.title}</Link><span className="timesheet-sub">{task.customerName} / {task.projectName}</span></td>
                  {scope === "all" && <td>{userName.get(entry.user_id) ?? "Ismeretlen"}</td>}
                  <td>{dayLabel.format(new Date(`${entry.day}T00:00:00Z`))}</td>
                  <td>{entry.range}</td>
                  <td className="num">{formatDuration(entry.ms)}</td>
                </tr>;
              })}
              {!total && <tr><td className="timesheet-empty" colSpan={scope === "all" ? 5 : 4}>Ebben az időszakban nincs rögzített idő.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="timesheet-card">
          <table className={`timesheet-table${monthly ? " month" : ""}`} style={monthly ? ({ "--days": days.length } as React.CSSProperties) : undefined}>
            {monthly && <colgroup><col className="timesheet-col-task" />{days.map((day) => <col className="timesheet-col-day" key={day} />)}<col className="timesheet-col-total" /></colgroup>}
            <thead>
              <tr>
                <th>Feladat / Projekt</th>
                {days.map((day) => {
                  const ms = dayTotals.get(day) ?? 0;
                  return <th className="num" key={day}>{monthly ? <>{Number(day.slice(8))}.<small>{compactDay.format(new Date(`${day}T00:00:00Z`))}</small></> : dayLabel.format(new Date(`${day}T00:00:00Z`))}<strong>{formatDuration(ms, "0h")}</strong><i><b style={{ width: `${Math.min(100, (ms / dayTarget) * 100)}%` }} /></i></th>;
                })}
                <th className="num">Összesen<strong>{formatDuration(total, "0h")}</strong></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(perUser).map(([userId, userTasks]) => {
                const userDayTotals = days.map((day) => Array.from(userTasks.values()).reduce((sum, byDay) => sum + (byDay.get(day) ?? 0), 0));
                const userTotal = userDayTotals.reduce((sum, ms) => sum + ms, 0);
                if (!userTotal) return null;
                return [
                  scope === "all" && <tr className="timesheet-user-row" key={`user-${userId}`}>
                    <td>{userName.get(userId) ?? "Ismeretlen"}</td>
                    {userDayTotals.map((ms, index) => <td className="num" key={days[index]}>{formatDuration(ms)}</td>)}
                    <td className="num total">{formatDuration(userTotal)}</td>
                  </tr>,
                  ...Array.from(userTasks).map(([taskId, byDay]) => {
                    const task = taskById.get(taskId)!;
                    const taskTotal = days.reduce((sum, day) => sum + (byDay.get(day) ?? 0), 0);
                    if (!taskTotal) return null;
                    return <TimesheetTaskRows
                      cells={days.map((day) => ({ day, text: formatDuration(byDay.get(day) ?? 0), weekend: isWeekend(day) }))}
                      entries={entries.filter((entry) => entry.user_id === userId && entry.task_id === taskId && visibleDays.has(entry.day)).map((entry) => ({
                        day: entry.day,
                        duration: formatDuration(entry.ms),
                        id: entry.id,
                        range: entry.range,
                      }))}
                      key={`${userId}-${taskId}`}
                      sub={`${taskStatusLabels[task.status]} · ${task.customerName} / ${task.projectName}`}
                      taskId={task.id}
                      title={task.title}
                      total={formatDuration(taskTotal)}
                    />;
                  }),
                ];
              })}
              {!total && <tr><td className="timesheet-empty" colSpan={days.length + 2}>Ebben az időszakban nincs rögzített idő. Indíts időmérőt egy feladaton.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
