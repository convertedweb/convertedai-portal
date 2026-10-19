export type OnboardingAccountKey = "elevenlabs" | "telnyx" | "zadarma" | "n8n" | "google_workspace" | "meta_business" | "whatsapp" | "cal_com";

// A text-ben szereplő link.label kattintható linkként jelenik meg.
export type OnboardingGuideStep = { title: string; text: string; image: string; link?: { label: string; href: string } };

export type OnboardingAccountDetails = { email: string; secretUrl: string };

export type OnboardingAccount = {
  key: OnboardingAccountKey;
  name: string;
  description: string;
  signupUrl: string;
  // Ha van logo (public/brands/...), az jelenik meg; különben márkaszínű monogram-csempe.
  logo?: string;
  // A logó csempéjének háttere (alapból fehér), ha a márka színes lapon mutat jól.
  logoBg?: string;
  guide?: { steps: OnboardingGuideStep[] };
  mark: string;
  color: string;
};

const rawCatalog: OnboardingAccount[] = [
  { key: "elevenlabs", name: "ElevenLabs", description: "Itt fut a hangalapú AI asszisztens.", signupUrl: "https://elevenlabs.io/app/sign-up", logo: "/brands/elevenlabs.svg", mark: "II", color: "#111827",
    // Egyedi útmutató (a képek a public/onboarding/elevenlabs/ mappában vannak).
    guide: {
      steps: [
        { title: "Regisztráció", text: "Nyisd meg az elevenlabs.io/app/sign-up oldalt. Add meg az e-mail címedet és egy jelszót, pipáld be a feltételek elfogadását (Terms of Service), majd kattints a „Sign up” gombra. Ne a „Sign up with Google” gombbal regisztrálj, mert a jelszót át kell adnod nekünk.", image: "/onboarding/elevenlabs/elevenlabs_01.webp", link: { label: "elevenlabs.io/app/sign-up", href: "https://elevenlabs.io/app/sign-up" } },
        { title: "E-mail megerősítése", text: "Az ElevenLabs e-mailt küld a megadott címre. Nyisd meg, és kattints a „Verify email” gombra. Ha nem találod a levelet, nézd meg a spam (levélszemét) mappát is.", image: "/onboarding/elevenlabs/elevenlabs_02.webp" },
        { title: "Platform kiválasztása", text: "A „Choose your platform” oldalon válaszd az ElevenAgents-et (beszélgető, telefonos asszisztensekhez), majd kattints a „Continue” gombra.", image: "/onboarding/elevenlabs/elevenlabs_03.webp" },
        { title: "Alapadatok", text: "A „Help us personalize your experience” oldalon a név és a „honnan hallottál rólunk” mező nem kötelező, a nyelv maradhat angol. Egyetlen kötelező elem a 18 éves kort megerősítő négyzet, ezt pipáld be. A reklám e-mailekre nem kell feliratkoznod. Ezután kattints a „Next” gombra.", image: "/onboarding/elevenlabs/elevenlabs_04.webp" },
        { title: "Creator csomag kiválasztása", text: "A „Choose your plan” oldalon válaszd ki a Creator csomagot, ezután kattints a „Select plan” gombra.", image: "/onboarding/elevenlabs/elevenlabs_05.webp" },
        { title: "Fizetés", text: "A fizetési oldalon add meg az e-mail címedet, a kártya adatait (kártyaszám, lejárat, CVC), a kártyatulajdonos nevét és a számlázási címet. A csomag árát az ElevenLabs közvetlenül neked számlázza.", image: "/onboarding/elevenlabs/elevenlabs_06.webp" },
        { title: "Workspace beállítások megnyitása", text: "Belépés után kattints a jobb felső sarokban a profil ikonodra. A megnyíló menüben válaszd a „Workspace settings” pontot (a képen pirossal jelölve).", image: "/onboarding/elevenlabs/elevenlabs_07.webp" },
        { title: "Workspace név módosítása", text: "A „General” fülön a „Workspace Name” sor mellett kattints a „Change Workspace Name” gombra (pirossal jelölve).", image: "/onboarding/elevenlabs/elevenlabs_08.webp" },
        { title: "Workspace név megadása", text: "Az alapértelmezett „My Workspace” helyett írd be a céged nevét, majd kattints a „Save” gombra. Így a workspace könnyen azonosítható.", image: "/onboarding/elevenlabs/elevenlabs_09.webp" },
        { title: "Jelszó átadása onetimesecret linkkel", text: "Nyisd meg a onetimesecret.com oldalt. A piros keretes mezőbe írd be az ElevenLabs fiókod jelszavát, majd kattints a „Create Link” gombra.", image: "/onboarding/elevenlabs/elevenlabs_10.webp", link: { label: "onetimesecret.com", href: "https://onetimesecret.com" } },
        { title: "Link másolása és adatok megadása", text: "A „Success!” üzenet után a „Copy” gombbal másold ki a létrejött linket (https://…onetimesecret.com/secret/…). Ez a link csak egyszer nyitható meg. Zárd be az útmutatót, és az onboarding oldalon az ElevenLabs kártyán add meg az e-mail címedet és ezt a linket, majd kattints az „Elkészült” gombra.", image: "/onboarding/elevenlabs/elevenlabs_11.webp" },
      ],
    } },
  { key: "telnyx", name: "Telnyx", description: "Telefonszám és hívásforgalom szolgáltató.", signupUrl: "https://telnyx.com/sign-up", logo: "/brands/telnyx.png", logoBg: "#00e6af", mark: "T", color: "#00c08b" },
  { key: "zadarma", name: "Zadarma", description: "Alternatív telefonszám és hívásforgalom szolgáltató.", signupUrl: "https://zadarma.com/hu/", logo: "/brands/zadarma.png", mark: "Z", color: "#e8590c" },
  { key: "n8n", name: "n8n", description: "Az automatizációk és integrációk futtatója.", signupUrl: "https://app.n8n.cloud/register", logo: "/brands/n8n.svg", mark: "n8n", color: "#ea4b71" },
  { key: "google_workspace", name: "Google Workspace", description: "Naptár és email az időpontfoglaláshoz.", signupUrl: "https://workspace.google.com/", logo: "/brands/google-workspace.png", mark: "G", color: "#4285f4" },
  { key: "meta_business", name: "Meta Business", description: "Facebook-oldal és lead űrlapok kezelése.", signupUrl: "https://business.facebook.com/", mark: "M", color: "#0866ff" },
  { key: "whatsapp", name: "WhatsApp Business", description: "Üzenetküldés WhatsApp csatornán.", signupUrl: "https://business.whatsapp.com/", mark: "W", color: "#25d366" },
  { key: "cal_com", name: "Cal.com", description: "Időpontfoglaló rendszer.", signupUrl: "https://cal.com/signup", mark: "Cal", color: "#111827" },
];

// Minden fióknál ugyanaz a négy lépés; a képek a public/onboarding/<kulcs>/<lépés>.png helyen vannak (hiányuknál helyőrző látszik).
function guideSteps(account: OnboardingAccount): OnboardingGuideStep[] {
  if (account.guide) return account.guide.steps;
  const image = (n: number) => `/onboarding/${account.key}/${n}.png`;
  const signup = new URL(account.signupUrl);
  const signupLabel = `${signup.hostname}${signup.pathname === "/" ? "" : signup.pathname}`;
  return [
    { title: "Regisztráció", text: `Nyisd meg a(z) ${signupLabel} oldalt, és e-mail címmel és jelszóval regisztrálj. Google fiókkal ne lépj be, mert a jelszót át kell adnod.`, image: image(1), link: { label: signupLabel, href: account.signupUrl } },
    { title: "E-mail megerősítése", text: "Kattints a megerősítő e-mailben kapott linkre, majd fejezd be a kezdő beállításokat.", image: image(2) },
    { title: "Onetimesecret link generálása a jelszóból", text: "Nyisd meg a onetimesecret.com oldalt, írd be a fiók jelszavát, hozz létre egy titkos linket, és másold ki.", image: image(3), link: { label: "onetimesecret.com", href: "https://onetimesecret.com" } },
    { title: "Adatok megadása", text: "Az onboarding oldalon a fiók kártyáján add meg a fiók e-mail címét és az onetimesecret linket, majd kattints az „Elkészült” gombra.", image: image(4) },
  ];
}

export const onboardingAccountCatalog: OnboardingAccount[] = rawCatalog.map((account) => ({ ...account, guide: { steps: guideSteps(account) } }));

export const defaultOnboardingAccountKeys: OnboardingAccountKey[] = ["elevenlabs", "telnyx", "n8n"];

export function isOnboardingAccountKey(value: string): value is OnboardingAccountKey {
  return onboardingAccountCatalog.some((account) => account.key === value);
}

// A null (még nem állított) kiválasztás az alapértelmezett fiókokat adja; ismeretlen kulcsokat eldobunk.
export function resolveOnboardingAccounts(selected: string[] | null, done: string[] = [], details: Record<string, OnboardingAccountDetails> = {}) {
  const keys = selected === null ? defaultOnboardingAccountKeys : selected;
  return onboardingAccountCatalog
    .filter((account) => keys.includes(account.key))
    .map((account) => ({ ...account, done: done.includes(account.key), details: details[account.key] ?? null }));
}

export function isValidAccountEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

// Csak https és onetimesecret.com (vagy aldomain) fogadható el, hogy ide ne kerülhessen tetszőleges link.
export function normalizeSecretUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostOk = url.hostname === "onetimesecret.com" || url.hostname.endsWith(".onetimesecret.com");
    if (url.protocol !== "https:" || !hostOk || url.username || url.password || url.toString().length > 2000) return null;
    return url.toString();
  } catch {
    return null;
  }
}
