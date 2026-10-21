// Web Push delivery (RFC 8291 payload encryption + RFC 8292 VAPID).
//
// Uses a WebCrypto implementation rather than the `web-push` package: the latter
// relies on Node's `https.request`, which does not behave on Workers.
//
// Subscriptions are stored per user, one key per user, and pruned when the push
// service answers 404/410 (subscription expired or uninstalled).

import {
  buildPushPayload,
  type PushSubscription as WebPushSubscription,
  type VapidKeys,
} from '@block65/webcrypto-web-push';
import { getEnvVar } from './env';
import { kvGet, kvPut } from './kv';
import { PushNotification } from './alertNotification';

export interface StoredPushSubscription extends WebPushSubscription {
  /** Epoch ms of the first subscription for this endpoint. */
  createdAt: number;
  /** Best-effort device identification, for debugging only. */
  userAgent?: string;
}

export interface PushDeliveryResult {
  sent: number;
  pruned: number;
  failed: number;
}

/** Cap per account: the UI subscribes one device at a time, so this is generous. */
export const MAX_SUBSCRIPTIONS_PER_USER = 10;

function subscriptionsKey(userId: string): string {
  return `push:subs:${userId}`;
}

/**
 * VAPID configuration, read from the Worker environment.
 *
 * Returns null when the keys are absent, in which case the scan still runs and
 * alerts are still armed: only delivery is skipped, so enabling the keys later
 * starts notifying without touching any stored state.
 */
export function getVapidKeys(): VapidKeys | null {
  const publicKey = getEnvVar('VAPID_PUBLIC_KEY');
  const privateKey = getEnvVar('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return null;

  return {
    subject: getEnvVar('VAPID_SUBJECT') || 'mailto:contact@ticker-tracker.app',
    publicKey,
    privateKey,
  };
}

/**
 * Accept only public HTTPS endpoints.
 *
 * The server later POSTs to this URL, so an attacker-controlled value would be
 * an SSRF primitive. Push services are always public domains over HTTPS; plain
 * IP literals, localhost and `.local` names are rejected outright.
 */
export function isAcceptablePushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.startsWith('[')) return false;

  return true;
}

/** Validate the browser subscription shape before persisting it. */
export function parsePushSubscription(
  raw: any
): { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } } | null {
  if (!raw || typeof raw !== 'object') return null;

  const { endpoint, expirationTime, keys } = raw;
  if (!isAcceptablePushEndpoint(endpoint)) return null;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;

  // Base64URL payloads: the exact length varies with the key type, but a very
  // short value can only be malformed.
  if (keys.p256dh.length < 40 || keys.auth.length < 8) return null;
  if (keys.p256dh.length > 512 || keys.auth.length > 128) return null;

  return {
    endpoint,
    expirationTime: typeof expirationTime === 'number' ? expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export async function getPushSubscriptions(userId: string): Promise<StoredPushSubscription[]> {
  return (await kvGet<StoredPushSubscription[]>(subscriptionsKey(userId))) ?? [];
}

/**
 * Store (or refresh) a subscription, de-duplicated by endpoint.
 *
 * Returns the number of subscriptions for the account after the write.
 */
export async function addPushSubscription(
  userId: string,
  subscription: Omit<StoredPushSubscription, 'createdAt'>,
  userAgent?: string
): Promise<number> {
  const existing = await getPushSubscriptions(userId);
  const previous = existing.find((item) => item.endpoint === subscription.endpoint);
  const others = existing.filter((item) => item.endpoint !== subscription.endpoint);

  const next: StoredPushSubscription[] = [
    ...others,
    {
      ...subscription,
      // Re-subscribing the same endpoint keeps the original date.
      createdAt: previous?.createdAt ?? Date.now(),
      userAgent: userAgent?.slice(0, 200),
    },
  ].slice(-MAX_SUBSCRIPTIONS_PER_USER);

  await kvPut(subscriptionsKey(userId), next);
  return next.length;
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
  const existing = await getPushSubscriptions(userId);
  const next = existing.filter((item) => item.endpoint !== endpoint);
  if (next.length === existing.length) return false;
  await kvPut(subscriptionsKey(userId), next);
  return true;
}

/**
 * Send one notification to every device of a user.
 *
 * Expired subscriptions (404/410) are dropped from KV so the list does not grow
 * forever. Other failures are logged but kept: a transient 5xx or 429 from the
 * push service must not unsubscribe a working device.
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotification
): Promise<PushDeliveryResult> {
  const vapid = getVapidKeys();
  if (!vapid) {
    console.warn('Web push skipped: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured');
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const subscriptions = await getPushSubscriptions(userId);
  if (subscriptions.length === 0) return { sent: 0, pruned: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  const keep: StoredPushSubscription[] = [];

  for (const subscription of subscriptions) {
    try {
      const payload = await buildPushPayload(
        {
          // The library accepts any JSON-serializable value; the interface has
          // no index signature, so widen it explicitly.
          data: notification as unknown as Record<string, string>,
          options: { ttl: 60 * 60, urgency: 'high', topic: notification.tag.slice(0, 32) },
        },
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys,
        },
        vapid
      );

      const res = await fetch(subscription.endpoint, payload as RequestInit);

      if (res.status === 404 || res.status === 410) {
        pruned++;
        continue;
      }
      if (!res.ok) {
        failed++;
        keep.push(subscription);
        console.warn(`Push delivery returned HTTP ${res.status} for ${subscription.endpoint}`);
        continue;
      }

      sent++;
      keep.push(subscription);
    } catch (err) {
      failed++;
      keep.push(subscription);
      console.warn('Push delivery failed:', err);
    }
  }

  if (pruned > 0) {
    await kvPut(subscriptionsKey(userId), keep);
  }

  return { sent, pruned, failed };
}
