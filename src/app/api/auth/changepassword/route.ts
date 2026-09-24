import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { kvGet, kvPut } from '@/lib/kv';
import { verifyPassword, hashPassword } from '@/lib/authCrypto';
import { UserRecord } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Retrieve user record from KV
    let user = await kvGet<UserRecord>(`user:by-id:${sessionUser.id}`);
    if (!user && sessionUser.email) {
      user = await kvGet<UserRecord>(`user:by-email:${sessionUser.email}`);
    }
    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: 'Cannot change password for this account (e.g. Google-only account)' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.hashedPassword);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    // Hash new password
    const newHashedPassword = await hashPassword(newPassword);
    user.hashedPassword = newHashedPassword;

    // Persist updated records
    await kvPut(`user:by-id:${user.id}`, user);
    await kvPut(`user:by-email:${user.email}`, user);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
