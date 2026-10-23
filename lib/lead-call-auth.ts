import { createHash, timingSafeEqual } from "node:crypto";

export const leadCallSecretHeader = "x-lead-call-secret";

export type LeadCallAuthResult = "ok" | "unauthorized" | "not_configured";

// Állandó idejű összehasonlítás; a hossz a lenyomatok miatt nem szivárog. Ha a titok nincs beállítva, a végpont zárva marad.
export function checkLeadCallSecret(provided: string | null, expected: string | undefined): LeadCallAuthResult {
  if (!expected) return "not_configured";
  if (!provided) return "unauthorized";
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) ? "ok" : "unauthorized";
}
