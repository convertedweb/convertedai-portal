import { taskStatusLabels } from "@/lib/project-management";
import { timesheetTimeZone } from "@/lib/timesheet";
import { getTimesheetData } from "@/lib/timesheet-data";

export const dynamic = "force-dynamic";

const timeFormatter = new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit", timeZone: timesheetTimeZone });

// Excel-képletként értelmezhető cellák elé aposztróf kerül, a pontosvessző a magyar Excel elválasztója.
function cell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const data = await getTimesheetData({
    customer: query.get("customer") ?? undefined,
    date: query.get("date") ?? undefined,
    period: query.get("period") ?? undefined,
    project: query.get("project") ?? undefined,
    status: query.get("status") ?? undefined,
    user: query.get("user") ?? undefined,
  });
  if (!data.allowed) return new Response("Nincs hozzáférés.", { status: 403 });

  const names = new Map(data.visibleUsers.map((user) => [user.id, user.name]));
  const header = ["Dátum", "Felhasználó", "Ügyfél", "Projekt", "Feladat", "Státusz", "Kezdés", "Vége", "Időtartam (perc)", "Időtartam (óra)"];
  const lines = data.entries.map((entry) => {
    const task = data.taskById.get(entry.task_id)!;
    const minutes = Math.round(entry.ms / 60000);
    return [
      entry.day, names.get(entry.user_id) ?? "Ismeretlen", task.customerName, task.projectName, task.title, taskStatusLabels[task.status],
      timeFormatter.format(entry.from), entry.running ? "fut" : timeFormatter.format(entry.to), minutes, (minutes / 60).toFixed(2).replace(".", ","),
    ].map(cell).join(";");
  });

  const filename = `idonyilvantartas-${data.monthly ? data.range.start.slice(0, 7) : data.range.start}.csv`;
  return new Response(`﻿${[header.map(cell).join(";"), ...lines].join("\r\n")}\r\n`, {
    headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Type": "text/csv; charset=utf-8" },
  });
}
