// Shared-secret HMAC authentication for the scheduled alert scan.
//
// A static Bearer token is valid forever and replayable by anyone who obtains it
// (a proxy log, a misconfigured `http://` APP_URL, an env leak). Signing
// `${timestamp}.${method}.${path}` instead:
//   - binds the signature to this exact request, so it cannot be reused for
//     another route or method;
//   - expires after CRON_MAX_SKEW_SEC, so a captured request is only replayable
//     for five minutes;
//   - still requires the shared secret, which never leaves the Worker env.
//
// The scan itself also takes a 4-minute lock, so a replay that lands inside the
// five-minute window is skipped rather than running a second scan.
//
// WebCrypto only: this module is bundled both into the custom scheduled handler
// and into the Next route, and must run in workerd and Node alike.

export const CRON_TIMESTAMP_HEADER = 'x-cron-timestamp';
export const CRON_SIGNATURE_HEADER = 'x-cron-signature';

/** Maximum accepted clock skew, in seconds. */
export const CRON_MAX_SKEW_SEC = 5 * 60;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64Url(new Uint8Array(signature));
}

/** Canonical string covered by the signature. */
export function cronSignaturePayload(timestamp: number, method: string, path: string): string {
  return `${timestamp}.${method.toUpperCase()}.${path}`;
}

export interface SignedCronRequest {
  timestamp: string;
  signature: string;
}

/** Build the headers' values for one request. Used by the scheduled handler. */
export async function signCronRequest(
  secret: string,
  method: string,
  path: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): Promise<SignedCronRequest> {
  return {
    timestamp: String(timestamp),
    signature: await hmacSha256(secret, cronSignaturePayload(timestamp, method, path)),
  };
}

/** Length-constant comparison for equal-length base64url signatures. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type CronVerification =
  | { ok: true }
  | { ok: false; reason: 'missing-signature' | 'invalid-timestamp' | 'expired' | 'bad-signature' };

/**
 * Verify an incoming cron request.
 *
 * Returns a reason for the logs; callers must answer with a generic 401 so the
 * response does not tell an attacker which check failed.
 */
export async function verifyCronRequest(
  secret: string,
  headers: Headers,
  method: string,
  path: string,
  now: number = Math.floor(Date.now() / 1000)
): Promise<CronVerification> {
  const timestampRaw = headers.get(CRON_TIMESTAMP_HEADER);
  const provided = headers.get(CRON_SIGNATURE_HEADER);

  if (!timestampRaw || !provided) return { ok: false, reason: 'missing-signature' };

  const timestamp = Number(timestampRaw);
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    return { ok: false, reason: 'invalid-timestamp' };
  }

  if (Math.abs(now - timestamp) > CRON_MAX_SKEW_SEC) {
    return { ok: false, reason: 'expired' };
  }

  const expected = await hmacSha256(secret, cronSignaturePayload(timestamp, method, path));
  return timingSafeEqual(expected, provided)
    ? { ok: true }
    : { ok: false, reason: 'bad-signature' };
}
