// Client-side Web Push subscription helpers.
//
// Browser support: Chrome/Firefox/Edge on desktop and Android, plus Safari on
// iOS 16.4+ but only when the PWA is installed on the home screen. On iOS the
// permission prompt must also follow a user gesture, which is why the alert
// panel starts this call synchronously from the click handler.

export type PushPermissionState =
  | 'unsupported'
  | 'granted'
  | 'denied'
  | 'default'
  | 'error';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Convert a base64url VAPID key into the Uint8Array expected by PushManager. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const normalized = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);

  // Allocate an explicit ArrayBuffer: PushManager rejects views over a
  // SharedArrayBuffer-backed buffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Read-only status, used to render the notification row on mount. */
export async function getPushState(): Promise<PushPermissionState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'default';

  const subscription = await currentSubscription();
  return subscription ? 'granted' : 'default';
}

/**
 * Ask for the notification permission (must be called from a user gesture),
 * subscribe the device if needed and persist the subscription server-side.
 */
export async function enablePushNotifications(): Promise<PushPermissionState> {
  if (!pushSupported()) return 'unsupported';

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      // Called synchronously from the click handler so the gesture is preserved.
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return permission === 'denied' ? 'denied' : 'default';
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const keyRes = await fetch('/api/push/subscribe', { cache: 'no-store' });
      if (!keyRes.ok) return 'error';

      const { publicKey } = await keyRes.json();
      if (!publicKey) return 'error';

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const saved = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    return saved.ok ? 'granted' : 'error';
  } catch (err) {
    console.error('Push subscription failed:', err);
    return 'error';
  }
}

/** Unsubscribe this device and delete it server-side. */
export async function disablePushNotifications(): Promise<boolean> {
  if (!pushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;

    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
    });
    await subscription.unsubscribe();
    return true;
  } catch (err) {
    console.error('Push unsubscription failed:', err);
    return false;
  }
}
