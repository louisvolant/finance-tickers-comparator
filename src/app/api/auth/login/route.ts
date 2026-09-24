import { NextRequest, NextResponse } from 'next/server';
import { kvGet } from '@/lib/kv';
import { verifyPassword } from '@/lib/authCrypto';
import { setSessionUser } from '@/lib/session';
import { UserRecord } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await kvGet<UserRecord>(`user:by-email:${cleanEmail}`);

    if (!user || !user.hashedPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    await setSessionUser(sessionUser);

    return NextResponse.json({ user: sessionUser });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
