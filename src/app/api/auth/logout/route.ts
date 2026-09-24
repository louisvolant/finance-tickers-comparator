import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
