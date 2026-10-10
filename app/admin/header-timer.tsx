"use client";

import { Square, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { stopTaskTimer } from "@/app/admin/tasks/[id]/time-actions";

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function HeaderTimer({ startedAt, taskId, taskTitle }: { startedAt: string; taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="header-timer">
      <Timer className="header-timer-icon" size={15} />
      <Link className="header-timer-title" href={`/admin/tasks/${taskId}`} title={taskTitle}>{taskTitle}</Link>
      <strong>{formatDuration(now - new Date(startedAt).getTime())}</strong>
      <button
        aria-label="Időmérő leállítása"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const formData = new FormData();
          formData.set("taskId", taskId);
          await stopTaskTimer({}, formData);
          router.refresh();
        })}
        title="Leállítás"
        type="button"
      ><Square size={12} /></button>
    </div>
  );
}
