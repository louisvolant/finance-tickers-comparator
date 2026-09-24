// Universal KV storage adapter supporting Cloudflare Workers KV and Local Dev / Testing fallback
import fs from 'node:fs';
import path from 'node:path';

interface LocalKVEntry {
  value: string;
  expiresAt: number | null;
}

// In-memory cache for fast local access
const memoryStore = new Map<string, LocalKVEntry>();
const LOCAL_KV_FILE = path.join(process.cwd(), '.kv-local.json');

// Initialize local store from disk if present
function loadLocalStore() {
  if (memoryStore.size > 0) return;
  try {
    if (fs.existsSync(LOCAL_KV_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_KV_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(data)) {
        memoryStore.set(k, v as LocalKVEntry);
      }
    }
  } catch {
    // Edge environments or permission limits fall back to in-memory store
  }
}

function persistLocalStore() {
  try {
    const obj: Record<string, LocalKVEntry> = {};
    for (const [k, v] of memoryStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LOCAL_KV_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-blocking in read-only / serverless runtimes
  }
}

/**
 * Resolves the Cloudflare KV binding if running in Cloudflare Workers.
 */
function getCloudflareKV(): any {
  // Check Cloudflare global context or process.env binding
  if (typeof (globalThis as any).TICKER_TRACKER_KV !== 'undefined') {
    return (globalThis as any).TICKER_TRACKER_KV;
  }
  if (typeof (process.env as any).TICKER_TRACKER_KV !== 'undefined' && typeof (process.env as any).TICKER_TRACKER_KV.get === 'function') {
    return (process.env as any).TICKER_TRACKER_KV;
  }
  return null;
}

export async function kvGet<T = any>(key: string): Promise<T | null> {
  const cfKV = getCloudflareKV();
  if (cfKV) {
    try {
      const val = await cfKV.get(key, 'json');
      return val as T;
    } catch (err) {
      console.error(`KV get error for key ${key}:`, err);
    }
  }

  // Local fallback
  loadLocalStore();
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    persistLocalStore();
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return entry.value as unknown as T;
  }
}

export async function kvPut(
  key: string,
  value: any,
  options?: { expirationTtl?: number }
): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const cfKV = getCloudflareKV();

  if (cfKV) {
    try {
      await cfKV.put(key, serialized, options?.expirationTtl ? { expirationTtl: options.expirationTtl } : undefined);
      return;
    } catch (err) {
      console.error(`KV put error for key ${key}:`, err);
    }
  }

  // Local fallback
  loadLocalStore();
  const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
  memoryStore.set(key, { value: serialized, expiresAt });
  persistLocalStore();
}

export async function kvDelete(key: string): Promise<void> {
  const cfKV = getCloudflareKV();
  if (cfKV) {
    try {
      await cfKV.delete(key);
      return;
    } catch (err) {
      console.error(`KV delete error for key ${key}:`, err);
    }
  }

  // Local fallback
  loadLocalStore();
  memoryStore.delete(key);
  persistLocalStore();
}

export async function kvList(prefix: string = ''): Promise<string[]> {
  const cfKV = getCloudflareKV();
  if (cfKV) {
    try {
      const list = await cfKV.list({ prefix });
      return list.keys.map((k: { name: string }) => k.name);
    } catch (err) {
      console.error(`KV list error with prefix ${prefix}:`, err);
    }
  }

  // Local fallback
  loadLocalStore();
  const now = Date.now();
  const keys: string[] = [];

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt && now > entry.expiresAt) {
      memoryStore.delete(key);
      continue;
    }
    if (!prefix || key.startsWith(prefix)) {
      keys.push(key);
    }
  }

  return keys;
}
