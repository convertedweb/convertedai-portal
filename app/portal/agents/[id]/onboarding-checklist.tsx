import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import type { OnboardingTarget, OnboardingTask } from "@/lib/project-onboarding";

type OpenTab = Extract<OnboardingTarget, { tab: string }>["tab"];

export function OnboardingChecklist({ tasks, onOpenTab }: { tasks: OnboardingTask[]; onOpenTab: (tab: OpenTab) => void }) {
  const doneCount = tasks.filter((task) => task.done).length;
  const requiredLeft = tasks.filter((task) => !task.done && !task.optional).length;

  return (
    <section className="onboarding-tasks" aria-label="Onboarding teendők">
      <div className="onboarding-tasks-header">
        <div>
          <span>Onboarding</span>
          <strong>{requiredLeft > 0 ? "Ezeket kell még beállítanod vagy feltöltened" : "Minden szükséges lépés kész"}</strong>
        </div>
        <span className={`onboarding-summary-badge ${requiredLeft > 0 ? "warning" : "ok"}`}>{doneCount} / {tasks.length} kész</span>
      </div>
      <ol className="onboarding-task-list">
        {tasks.map((task) => (
          <li className={`onboarding-task ${task.done ? "done" : ""}`} key={task.id}>
            {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            <div>
              <strong>{task.title}{task.optional && <small> · ajánlott</small>}</strong>
              <p>{task.description}</p>
            </div>
            {!task.done && ("href" in task.target
              ? <Link className="secondary-button" href={task.target.href}>Megnyitás <ArrowRight size={14} /></Link>
              : <button className="secondary-button" onClick={() => onOpenTab((task.target as { tab: OpenTab }).tab)} type="button">Megnyitás <ArrowRight size={14} /></button>)}
          </li>
        ))}
      </ol>
    </section>
  );
}
