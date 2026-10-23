const art: Record<number, React.ReactNode> = {
  // Fiókok: kártya kulccsal
  0: <><rect x="14" y="14" width="76" height="52" rx="8" /><circle cx="36" cy="40" r="10" /><path d="M50 40h28M70 40v8M62 40v6" /></>,
  // Asszisztens: beszélgetés buborék
  1: <><path d="M16 18h56a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H44l-14 12V56H16a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6Z" /><path d="M28 34h32M28 44h20" /></>,
  // Tudásbázis: dokumentumok
  2: <><path d="M30 12h30l16 16v44H30Z" /><path d="M60 12v16h16M38 44h30M38 54h30M38 64h18" /><path d="M20 24v54h40" /></>,
  // Telefonszám dokumentumok: telefon dokumentummal
  3: <><rect x="34" y="10" width="36" height="64" rx="7" /><path d="M46 18h12M42 32h20M42 42h20M42 52h14" /></>,
  // Beküldés: pipa körben
  4: <><circle cx="52" cy="42" r="28" /><path d="m38 43 10 10 18-20" /></>,
};

// Ahol van külön illusztráció (public/onboarding), az jelenik meg az egyszerű vonalas ikon helyett.
const stepImages: Record<number, string> = {
  0: "/onboarding/01-account.svg",
  1: "/onboarding/02-agent.svg",
  2: "/onboarding/03-upload.svg",
  3: "/onboarding/04-phone.svg",
};

export function StepArt({ step }: { step: number }) {
  if (stepImages[step]) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" aria-hidden="true" className="onboarding-aside-image" src={stepImages[step]} />;
  }
  return (
    <svg aria-hidden="true" className="onboarding-art" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 104 84">
      {art[step]}
    </svg>
  );
}
