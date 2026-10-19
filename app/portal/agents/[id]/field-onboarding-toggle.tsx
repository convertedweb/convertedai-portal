import { Eye, EyeOff, Lock } from "lucide-react";

// Superadmin: a mező megjelenik-e az ügyfél onboardingján. A zárolt mező mindig megjelenik.
export function FieldOnboardingToggle({ disabled, locked, onToggle, shown }: { disabled?: boolean; locked?: boolean; onToggle: () => void; shown: boolean }) {
  const label = locked ? "Mindig megjelenik az onboardingon" : shown ? "Megjelenik az onboardingon (kattints az elrejtéshez)" : "Nem jelenik meg az onboardingon (kattints a megjelenítéshez)";
  return (
    <button aria-label={label} aria-pressed={shown} className={`field-onboarding-toggle ${shown ? "on" : ""}`} disabled={disabled || locked} onClick={onToggle} title={label} type="button">
      {locked ? <Lock size={14} /> : shown ? <Eye size={14} /> : <EyeOff size={14} />}
      <span>Onboarding</span>
    </button>
  );
}
