// KV storage for price-alert arming state.
//
// Kept in its own per-user key rather than inside `user:tickers` for two
// reasons:
//
// 1. The scanner writes it, the user edits tickers. Sharing one key would make
//    each side read-modify-write the other's data and lose updates.
// 2. A trigger that affects several tickers of the same user is a single write.
//
// The whole map is small (two booleans and two timestamps per ticker), so the
// simplest representation wins.

import { kvDelete, kvGet, kvPut } from './kv';
import { AlertStateMap } from './types';

function stateKey(userId: string): string {
  return `alert:state:${userId}`;
}

export async function getAlertStateMap(userId: string): Promise<AlertStateMap> {
  return (await kvGet<AlertStateMap>(stateKey(userId))) ?? {};
}

export async function putAlertStateMap(userId: string, map: AlertStateMap): Promise<void> {
  // An empty map is deleted rather than stored: it keeps the KV namespace clean
  // and makes "no alert state" the single default representation.
  if (Object.keys(map).length === 0) {
    await kvDelete(stateKey(userId));
    return;
  }
  await kvPut(stateKey(userId), map);
}

/**
 * Drop the arming state of one ticker.
 *
 * Called when a threshold changes, when a ticker leaves the watchlist, or when
 * both thresholds are cleared. Deleting rather than resetting means the next
 * scan runs the "first evaluation" path, which arms the sides against the live
 * quote (and its FX rate) without ever firing immediately.
 */
export async function clearTickerAlertState(userId: string, tickerId: string): Promise<void> {
  const map = await getAlertStateMap(userId);
  if (!(tickerId in map)) return;
  delete map[tickerId];
  await putAlertStateMap(userId, map);
}
