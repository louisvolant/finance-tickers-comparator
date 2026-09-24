import { cookies } from 'next/headers';
import { signSession, verifySession } from './authCrypto';
import { SessionUser } from './types';

import { getEnvVar } from './env';

const SESSION_COOKIE_NAME = 'tt_session';
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

export function getSessionSecret(): string {
  return getEnvVar('SESSION_SECRET') || 'ticker-tracker-production-super-secret-key-32b';
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySession<SessionUser>(token, getSessionSecret());
  } catch (err) {
    console.error('getSessionUser error:', err);
    return null;
  }
}

export async function setSessionUser(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const token = await signSession(
    {
      user,
      exp: Date.now() + SESSION_TTL_SEC * 1000,
    },
    getSessionSecret()
  );

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
