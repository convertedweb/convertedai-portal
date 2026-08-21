"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-page" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next") : "/portal";
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${next ?? "/portal"}`,
      },
    });

    if (authError) {
      if (authError.code === "over_email_send_rate_limit" || authError.status === 429) {
        setError("Túl sok belépési linket kértünk rövid idő alatt. Várjon néhány percet, majd próbálja újra.");
      } else {
        setError(`Nem sikerült elküldeni a belépési linket. Supabase hiba: ${authError.message}`);
      }
      console.error("Supabase magic link error", authError);
    }
    else setMessage("Elküldtük a belépési linket. Ellenőrizze a postaládáját.");
    setLoading(false);
  }

  return <main className="login-page"><div className="login-brand"><div className="brand-mark">N</div><span>norpheus AI</span></div><div className="login-card"><p className="eyebrow">Ügyfélportál</p><h1>Belépés a portálba</h1><p className="login-intro">Adja meg az e-mail-címét, és küldünk egy egyszer használható belépési linket.</p><form onSubmit={handleSubmit}><label className="login-field"><span>E-mail-cím</span><div className="input-with-icon"><Mail size={16} /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nev@cegem.hu" /></div></label><button className="button login-button" disabled={loading}>{loading ? "Küldés folyamatban..." : "Belépési link küldése"}<ArrowRight size={16} /></button></form>{message && <div className="login-message success"><CheckCircle2 size={17} />{message}</div>}{error && <div className="login-message error">{error}</div>}<p className="login-footnote">A belépési link 1 órán keresztül használható.</p></div></main>;
}
