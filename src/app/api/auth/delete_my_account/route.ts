import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, clearSession } from '@/lib/session';
import { kvDelete, kvGet } from '@/lib/kv';
import { UserRecord } from '@/lib/types';

export const runtime = 'nodejs';

async function handleDeleteAccount() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await kvGet<UserRecord>(`user:by-id:${sessionUser.id}`);

    // Delete user tickers
    await kvDelete(`user:tickers:${sessionUser.id}`);

    // Delete user records
    if (user?.email) {
      await kvDelete(`user:by-email:${user.email.toLowerCase()}`);
    }
    await kvDelete(`user:by-id:${sessionUser.id}`);

    // Clear session cookie
    await clearSession();

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return handleDeleteAccount();
}

export async function POST(request: NextRequest) {
  return handleDeleteAccount();
}
