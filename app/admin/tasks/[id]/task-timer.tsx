"use client";

import { Play, Square, Timer } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { startTaskTimer, stopTaskTimer, type TimeActionState } from "./time-actions";

export type TimeEntry = { id: string; mine: boolean; startedAt: string; endedAt: string | null };

const initialState: TimeActionState = {};

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TaskTimer({ entries, taskId }: { entries: TimeEntry[]; taskId: string }) {
  const [startState, startAction, starting] = useActionState(startTaskTimer, initialState);
  const [stopState, stopAction, stopping] = useActionState(stopTaskTimer, initialState);
  const [now, setNow] = useState(() => Date.now());
  const running = entries.some((entry) => !entry.endedAt && entry.mine);
  const anyRunning = entries.some((entry) => !entry.endedAt);

  useEffect(() => {
    if (!anyRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [anyRunning]);

  const total = entries.reduce((sum, entry) => sum + (entry.endedAt ? new Date(entry.endedAt).getTime() : now) - new Date(entry.startedAt).getTime(), 0);
  const error = startState.error ?? stopState.error;

  return (
    <div className="task-activity-card">
      <div className="task-activity-heading"><Timer size={18} /><h2>Időmérés</h2><strong>{formatDuration(total)}</strong></div>
      <div className="task-timer-body">
        <form action={running ? stopAction : startAction}>
          <input name="taskId" type="hidden" value={taskId} />
          <button className={running ? "danger-button" : "button"} disabled={starting || stopping} type="submit">
            {running ? <><Square size={15} /> Stop</> : <><Play size={15} /> Start</>}
          </button>
        </form>
        {error && <p className="form-error compact-form-error">{error}</p>}
        <ul className="task-timer-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span>{new Intl.DateTimeFormat("hu-HU", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(entry.startedAt))}</span>
              <strong>{entry.endedAt ? formatDuration(new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) : `${formatDuration(now - new Date(entry.startedAt).getTime())} (fut)`}</strong>
            </li>
          ))}
          {entries.length === 0 && <li><span>Még nincs rögzített idő.</span></li>}
        </ul>
      </div>
    </div>
  );
}
