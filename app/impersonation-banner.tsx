import { LogOut, ShieldAlert } from "lucide-react";

export function ImpersonationBanner({ actorEmail, actorName }: { actorEmail: string; actorName: string }) {
  return (
    <div className="impersonation-banner" role="status">
      <div><ShieldAlert size={18} /><span>Ezt a fiókot superadminként használod: <strong>{actorName}</strong> ({actorEmail})</span></div>
      <a href="/auth/signout?next=/login"><LogOut size={15} /> Megszemélyesítés befejezése</a>
    </div>
  );
}
