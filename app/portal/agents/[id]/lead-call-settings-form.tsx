"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { defaultBusinessHours, weekdayKeys, weekdayLabels } from "@/lib/lead-call";
import type { LeadCallSettings } from "@/lib/meta-leads";
import { saveLeadCallSettings, saveLeadSourceCampaignTopic, type MetaLeadSourceActionState } from "./meta-lead-actions";

const initialState: MetaLeadSourceActionState = {};

export function LeadCallSettingsForm({ projectId, settings }: { projectId: string; settings: LeadCallSettings | null }) {
  const [state, action, pending] = useActionState(saveLeadCallSettings, initialState);
  const hours = settings?.businessHours ?? defaultBusinessHours;

  return (
    <form action={action} className="meta-lead-source-form">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="tab-heading compact">
        <div><h3>Lead Call beállítások</h3><p>Az asszisztens ezeket az adatokat használja a hívásnál és a foglalásnál. Amíg a kapcsoló ki van kapcsolva, nem indul hívás.</p></div>
      </div>
      <label className="hours-day">
        <input defaultChecked={settings?.enabled ?? false} name="enabled" type="checkbox" />
        Hívások engedélyezve
      </label>
      <div className="settings-form-grid">
        <label className="field"><span>Cég megjelenített neve</span><input defaultValue={settings?.companyDisplayName} maxLength={200} name="companyDisplayName" placeholder="Pl. DentCare Hungary" /></label>
        <label className="field"><span>Szakértő neve</span><input defaultValue={settings?.expertName} maxLength={200} name="expertName" placeholder="Pl. Kiss Anna" /></label>
        <label className="field"><span>Szakértő titulusa</span><input defaultValue={settings?.expertTitle} maxLength={200} name="expertTitle" placeholder="Pl. fogszabályozó szakorvos" /></label>
        <label className="field"><span>Naptár azonosító</span><input autoComplete="off" defaultValue={settings?.calendarId} maxLength={300} name="calendarId" placeholder="naptar@ceg.hu" /></label>
        <label className="field"><span>Megbeszélési link (https)</span><input autoComplete="off" defaultValue={settings?.meetingLink} maxLength={500} name="meetingLink" placeholder="https://meet.google.com/..." /></label>
      </div>
      <label className="field">
        <span>Értesítési e-mail címek (vesszővel vagy új sorral elválasztva, legfeljebb 10)</span>
        <textarea defaultValue={settings?.notifyEmails.join("\n")} name="notifyEmails" rows={3} />
      </label>
      <div className="hours-block">
        <span className="hours-title">Hívható időszak (Europe/Budapest)</span>
        {weekdayKeys.map((day) => {
          const interval = hours.days[day][0];
          return (
            <div className="hours-row" key={day}>
              <label className="hours-day">
                <input defaultChecked={Boolean(interval)} name={`hours_${day}_on`} type="checkbox" />
                {weekdayLabels[day]}
              </label>
              <input aria-label={`${weekdayLabels[day]} kezdete`} defaultValue={interval?.start ?? "09:00"} name={`hours_${day}_start`} type="time" />
              <span aria-hidden="true">–</span>
              <input aria-label={`${weekdayLabels[day]} vége`} defaultValue={interval?.end ?? "17:00"} name={`hours_${day}_end`} type="time" />
            </div>
          );
        })}
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
      <div className="settings-actions">
        <span className="save-note"><Save size={15} /> Napi egy időszak adható meg.</span>
        <button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Beállítások mentése"}</button>
      </div>
    </form>
  );
}

export function CampaignTopicForm({ projectId, sourceId, topic }: { projectId: string; sourceId: string; topic: string | null }) {
  const [state, action, pending] = useActionState(saveLeadSourceCampaignTopic, initialState);
  return (
    <form action={action} className="settings-form-grid">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="sourceId" type="hidden" value={sourceId} />
      <label className="field">
        <span>Kampány-téma (ragozható alakban, pl. „a fogászati AI recepciós”)</span>
        <input defaultValue={topic ?? ""} maxLength={200} name="campaignTopic" placeholder="az AI telefonos asszisztens" />
      </label>
      <div>
        <button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Téma mentése"}</button>
        {state.error && <p className="form-error">{state.error}</p>}
        {state.success && <p className="form-success">{state.success}</p>}
      </div>
    </form>
  );
}
