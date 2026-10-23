import { createHmac, timingSafeEqual } from "node:crypto";

// Resend (Svix) webhook aláírás: HMAC-SHA256 a `${id}.${timestamp}.${body}` üzeneten, a titok a "whsec_" utáni base64 rész.
export function verifyResendSignature({ body, id, now = Date.now(), secret, signature, timestamp }: { body: string; id: string | null; now?: number; secret: string | undefined; signature: string | null; timestamp: string | null }) {
  if (!secret || !id || !timestamp || !signature) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > 300) return false;
  const expected = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const provided = Buffer.from(value, "base64");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}
