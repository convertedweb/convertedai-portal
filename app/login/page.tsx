"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal`,
      },
    });

    if (authError) setError("Nem sikerült elküldeni a belépési linket. Ellenőrizze az e-mail-címet, majd próbálja újra.");
    else setMessage("Elküldtük a belépési linket. Ellenőrizze a postaládáját.");
    setLoading(false);
  }

  return <main className="login-page"><div className="login-brand"><div className="brand-mark">C</div><span>ConvertedAI</span></div><div className="login-card"><p className="eyebrow">Ügyfélportál</p><h1>Belépés a portálba</h1><p className="login-intro">Adja meg az e-mail-címét, és küldünk egy egyszer használható belépési linket.</p><form onSubmit={handleSubmit}><label className="login-field"><span>E-mail-cím</span><div className="input-with-icon"><Mail size={16} /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nev cegem.hu" /></div></label><button className="button login-button" disabled={loading}>{loading ? "Küldés folyamatban..." : "Belépési link küldése"}<ArrowRight size={16} /></button></form>{message && <div className="login-message success"><CheckCircle2 size={17} />{message}</div>}{error && <div className="login-message error">{error}</div>}<p className="login-footnote">A belépési link 1 órán keresztül használható.</p></div></main>;
}
