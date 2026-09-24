import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvPut } from '@/lib/kv';
import { hashPassword } from '@/lib/authCrypto';
import { setSessionUser } from '@/lib/session';
import { UserRecord } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username && typeof username === 'string' ? username.trim() : '') || cleanEmail.split('@')[0];

    // Check if user already exists
    const existing = await kvGet<UserRecord>(`user:by-email:${cleanEmail}`);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '');

    const newUser: UserRecord = {
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      hashedPassword,
      createdAt: Date.now(),
    };

    // Store in KV
    await kvPut(`user:by-email:${cleanEmail}`, newUser);
    await kvPut(`user:by-id:${userId}`, newUser);

    const sessionUser = {
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
    };

    await setSessionUser(sessionUser);

    return NextResponse.json({ user: sessionUser }, { status: 201 });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
