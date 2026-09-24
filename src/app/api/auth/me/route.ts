import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (err) {
    console.error('Check auth error:', err);
    return NextResponse.json({ user: null });
  }
}
