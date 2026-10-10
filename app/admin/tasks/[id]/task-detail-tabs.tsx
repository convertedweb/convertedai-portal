"use client";

import { useState } from "react";

const tabs = [
  { key: "time", label: "Időmérés" },
  { key: "activity", label: "Előzmények" },
] as const;

export function TaskDetailTabs({ activity, time }: { activity: React.ReactNode; time: React.ReactNode }) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("time");
  const panels = { activity, time };

  return (
    <div className="task-detail-tabs">
      <div className="task-detail-tab-list" role="tablist">
        {tabs.map((tab) => <button aria-selected={active === tab.key} className={active === tab.key ? "active" : ""} key={tab.key} onClick={() => setActive(tab.key)} role="tab" type="button">{tab.label}</button>)}
      </div>
      <div className="task-detail-tab-panel">{panels[active]}</div>
    </div>
  );
}
