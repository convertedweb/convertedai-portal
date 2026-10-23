"use client";

import { Check, Pencil, Play, Plus, Square, Timer, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import { FormTimePicker } from "@/app/form-time-picker";
import { budapestDayKey, budapestTime } from "@/lib/timesheet";
import { addTimeEntry, deleteTimeEntry, startTaskTimer, stopTaskTimer, updateTimeEntry, type TimeActionState } from "./time-actions";

export type TimeEntry = { id: string; mine: boolean; startedAt: string; endedAt: string | null };

const initialState: TimeActionState = {};

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function EntryEditor({ entry, onDone, taskId }: { entry?: TimeEntry; onDone: () => void; taskId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(entry ? updateTimeEntry : addTimeEntry, initialState);
  const [defaults] = useState(() => {
    const end = entry ? new Date(entry.endedAt ?? entry.startedAt) : new Date();
    const start = entry ? new Date(entry.startedAt) : new Date(end.getTime() - 3600000);
    return { day: budapestDayKey(start), end: budapestTime(end), start: budapestTime(start) };
  });

  useEffect(() => {
    if (!state.success) return;
    onDone();
    router.refresh();
  }, [onDone, router, state]);

  return (
    <form action={action} className="timer-entry-editor">
      {entry ? <input name="entryId" type="hidden" value={entry.id} /> : <input name="taskId" type="hidden" value={taskId} />}
      <div className="timer-entry-editor-row">
      <span className="timer-picker date"><FormDatePicker defaultValue={defaults.day} disabled={pending} name="date" required /></span>
      <span className="timer-picker"><FormTimePicker defaultValue={defaults.start} disabled={pending} name="from" /></span>
      <span>–</span>
      <span className="timer-picker"><FormTimePicker defaultValue={defaults.end} disabled={pending} name="to" /></span>
      <span className="inline-edit-actions">
        <button aria-label="Mentés" className="inline-edit-save" disabled={pending} type="submit"><Check size={15} /></button>
        <button aria-label="Mégse" disabled={pending} onClick={onDone} type="button"><X size={15} /></button>
      </span>
      </div>
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
    </form>
  );
}

export function TaskTimer({ entries, taskId }: { entries: TimeEntry[]; taskId: string }) {
  const [startState, startAction, starting] = useActionState(startTaskTimer, initialState);
  const [stopState, stopAction, stopping] = useActionState(stopTaskTimer, initialState);
  const [now, setNow] = useState(() => Date.now());
  const running = entries.some((entry) => !entry.endedAt && entry.mine);
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const anyRunning = entries.some((entry) => !entry.endedAt);

  useEffect(() => {
    if (!anyRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [anyRunning]);

  const total = entries.reduce((sum, entry) => sum + (entry.endedAt ? new Date(entry.endedAt).getTime() : now) - new Date(entry.startedAt).getTime(), 0);
  const error = startState.error ?? stopState.error ?? deleteError;

  return (
    <div className="task-activity-card task-timer-card">
      <div className="task-activity-heading"><Timer size={18} /><h2>Időmérés</h2>
        <form action={running ? stopAction : startAction} className="timer-toggle">
          <input name="taskId" type="hidden" value={taskId} />
          <button aria-label={running ? "Időmérő leállítása" : "Időmérő indítása"} className={running ? "running" : ""} disabled={starting || stopping} title={running ? "Leállítás" : "Indítás"} type="submit">
            {running ? <Square size={12} /> : <Play size={12} />}
          </button>
          <strong>{formatDuration(total)}</strong>
        </form>
      </div>
      <div className="task-timer-body">
        <ul className="task-timer-list">
          {entries.map((entry) => entry.id === editingId ? (
            <li key={entry.id}><EntryEditor entry={entry} onDone={() => setEditingId(null)} taskId={taskId} /></li>
          ) : (
            <li key={entry.id}>
              <span>{new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", timeZone: "Europe/Budapest" }).format(new Date(entry.startedAt))} · {budapestTime(new Date(entry.startedAt))} – {entry.endedAt ? budapestTime(new Date(entry.endedAt)) : "fut"}</span>
              <span className="timer-entry-end">
                <strong>{entry.endedAt ? formatDuration(new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) : `${formatDuration(now - new Date(entry.startedAt).getTime())} (fut)`}</strong>
                {entry.mine && entry.endedAt && (
                  <>
                    <button aria-label="Bejegyzés szerkesztése" className="inline-edit-btn" disabled={editingId !== null || deleting} onClick={() => { setDeleteError(undefined); setEditingId(entry.id); }} type="button"><Pencil size={13} /></button>
                    <button
                      aria-label="Bejegyzés törlése"
                      className="inline-edit-btn"
                      disabled={editingId !== null || deleting}
                      onClick={() => {
                        if (!window.confirm("Biztosan törlöd ezt az időbejegyzést?")) return;
                        startDelete(async () => {
                          const result = await deleteTimeEntry(entry.id);
                          setDeleteError(result.error);
                          router.refresh();
                        });
                      }}
                      type="button"
                    ><Trash2 size={13} /></button>
                  </>
                )}
              </span>
            </li>
          ))}
          {entries.length === 0 && <li><span>Még nincs rögzített idő.</span></li>}
        </ul>
        {editingId === "new" ? <EntryEditor onDone={() => setEditingId(null)} taskId={taskId} /> : <button className="timer-add-entry" disabled={editingId !== null} onClick={() => { setDeleteError(undefined); setEditingId("new"); }} type="button"><Plus size={14} /> Idő hozzáadása</button>}
        {error && <p className="form-error compact-form-error">{error}</p>}
      </div>
    </div>
  );
}
