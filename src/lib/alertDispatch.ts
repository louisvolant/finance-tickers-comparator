// Fan-out of triggered alerts to Web Push.
//
// Shared by the scheduled handler (direct call, no HTTP) and the manual
// `/api/cron/alerts` route, so both paths always notify identically.

import { buildAlertNotification, UserAlertEvent } from './alertNotification';
import { getVapidKeys, sendPushToUser } from './push';

export interface AlertDispatchResult {
  pushed: number;
  prunedSubscriptions: number;
}

/**
 * Send one grouped notification per user that triggered at least one alert.
 *
 * A missing VAPID configuration is not an error: alerts stay armed and the next
 * scan after the keys are added will notify, without touching stored state.
 */
export async function dispatchAlertNotifications(
  events: UserAlertEvent[]
): Promise<AlertDispatchResult> {
  if (events.length === 0) return { pushed: 0, prunedSubscriptions: 0 };

  if (!getVapidKeys()) {
    console.warn('Web push skipped: VAPID keys are not configured');
    return { pushed: 0, prunedSubscriptions: 0 };
  }

  const byUser = new Map<string, UserAlertEvent[]>();
  for (const event of events) {
    const list = byUser.get(event.userId);
    if (list) list.push(event);
    else byUser.set(event.userId, [event]);
  }

  const deliveries = await Promise.allSettled(
    Array.from(byUser, ([userId, userEvents]) =>
      sendPushToUser(userId, buildAlertNotification(userEvents))
    )
  );

  let pushed = 0;
  let prunedSubscriptions = 0;

  for (const delivery of deliveries) {
    if (delivery.status === 'fulfilled') {
      pushed += delivery.value.sent;
      prunedSubscriptions += delivery.value.pruned;
    }
  }

  return { pushed, prunedSubscriptions };
}
