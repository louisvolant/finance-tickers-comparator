import { cookies } from 'next/headers';
import { signSession, verifySession } from './authCrypto';
import { SessionUser } from './types';

import { getEnvVar } from './env';

const SESSION_COOKIE_NAME = 'tt_session';
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
  expires: Date;
}

export interface SessionCookie {
  name: string;
  value: string;
  options: SessionCookieOptions;
}

export function getSessionSecret(): string {
  return getEnvVar('SESSION_SECRET') || 'ticker-tracker-production-super-secret-key-32b';
}

/**
 * Build the session cookie value and attributes without writing it.
 *
 * Auth routes set this cookie directly on their outgoing response, which keeps
 * the `Set-Cookie` header on redirects (Google OAuth callback) instead of
 * relying on framework cookie merging that some browsers handle differently.
 */
export async function createSessionCookie(
  user: SessionUser,
  secure: boolean = process.env.NODE_ENV === 'production'
): Promise<SessionCookie> {
  const now = Date.now();
  const value = await signSession(
    {
      user,
      exp: now + SESSION_TTL_SEC * 1000,
    },
    getSessionSecret()
  );

  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SEC,
      expires: new Date(now + SESSION_TTL_SEC * 1000),
    },
  };
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

export async function setSessionUser(
  user: SessionUser,
  secure: boolean = process.env.NODE_ENV === 'production'
): Promise<void> {
  const cookie = await createSessionCookie(user, secure);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
