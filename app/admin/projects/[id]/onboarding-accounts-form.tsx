"use client";

import { Check, Eye, EyeOff, Save } from "lucide-react";
import { useActionState } from "react";
import { defaultOnboardingAccountKeys, onboardingAccountCatalog, type OnboardingAccountDetails } from "@/lib/onboarding-accounts";
import { updateOnboardingAccounts, type ProjectAdminActionState } from "./actions";

const initialState: ProjectAdminActionState = {};

export function OnboardingAccountsForm({ customerId, details, doneKeys, projectId, selectedKeys }: { customerId: string; details: Record<string, OnboardingAccountDetails>; doneKeys: string[]; projectId: string; selectedKeys: string[] | null }) {
  const [state, action, pending] = useActionState<ProjectAdminActionState, FormData>(updateOnboardingAccounts, initialState);
  const selected = selectedKeys ?? defaultOnboardingAccountKeys;

  return (
    <div className="tab-content">
      <form action={action} className="tab-card">
        <input name="projectId" type="hidden" value={projectId} />
        <input name="customerId" type="hidden" value={customerId} />
        <div className="tab-heading">
          <h2>Fiókok</h2>
          <p>Jelöld be, mely fiókok jelenjenek meg az ügyfél onboardingján. Az „Elkészült” gomb után itt látod az ügyfél által megadott e-mail címet és jelszólinket.</p>
        </div>
        <div className="account-admin-grid">
          {onboardingAccountCatalog.map((account) => {
            const accountDetails = details[account.key];
            const done = doneKeys.includes(account.key);
            const shown = selected.includes(account.key);
            return (
              <div className={`account-admin-card ${done ? "done" : ""}`} key={account.key}>
                <div className="account-admin-head">
                  {account.logo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <span className="onboarding-brand logo" style={account.logoBg ? { background: account.logoBg, borderColor: account.logoBg } : undefined}><img alt={account.name} src={account.logo} /></span>
                    : <span className="onboarding-brand" style={{ background: account.color }}>{account.mark}</span>}
                  <label className="account-admin-toggle" title="Megjelenik az ügyfél onboardingján">
                    <input aria-label={`${account.name} megjelenik az onboardingon`} defaultChecked={shown} name="accounts" type="checkbox" value={account.key} />
                    <Eye className="on" size={16} />
                    <EyeOff className="off" size={16} />
                  </label>
                </div>
                <div className="account-admin-name">
                  <strong>{account.name}</strong>
                  {done && <Check aria-label="Kész" className="account-admin-done" size={16} />}
                </div>
                {accountDetails ? (
                  <dl className="account-admin-details">
                    <dt>E-mail</dt><dd>{accountDetails.email}</dd>
                    <dt>Jelszó</dt><dd><a href={accountDetails.secretUrl} rel="noopener noreferrer" target="_blank">onetimesecret link</a></dd>
                    <dt>Állapot</dt><dd><span className={`account-admin-status ${done ? "done" : ""}`}>{done ? "Kész" : "Visszavonva"}</span></dd>
                  </dl>
                ) : (
                  <p className="account-admin-empty">{shown ? "Az ügyfél még nem töltötte ki." : "Nem jelenik meg az ügyfélnek."}</p>
                )}
              </div>
            );
          })}
        </div>
        {state.error && <p className="form-error">{state.error}</p>}
        {state.success && <p className="form-success">{state.success}</p>}
        <div className="settings-actions">
          <span />
          <button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Fiókok mentése"} <Save size={15} /></button>
        </div>
      </form>
    </div>
  );
}
