import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvPut } from '@/lib/kv';
import { setSessionUser } from '@/lib/session';
import { UserRecord } from '@/lib/types';

import { getEnvVar, getRequestOrigin } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = getRequestOrigin(request);
  const redirectUri = `${origin}/api/auth/callback/google`;

  if (!code) {
    return NextResponse.redirect(`${origin}?auth_error=missing_code`);
  }

  const clientId = getEnvVar('GOOGLE_CLIENT_ID');
  const clientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}?auth_error=google_credentials_missing`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange error:', await tokenRes.text());
      return NextResponse.redirect(`${origin}?auth_error=token_exchange_failed`);
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // 2. Fetch user profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${origin}?auth_error=userinfo_failed`);
    }

    const profile = (await userRes.json()) as { id: string; email: string; name?: string };
    const cleanEmail = profile.email.toLowerCase().trim();

    // 3. Find or create user in KV
    let user = await kvGet<UserRecord>(`user:by-email:${cleanEmail}`);

    if (!user) {
      const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '');
      user = {
        id: userId,
        email: cleanEmail,
        username: profile.name || cleanEmail.split('@')[0],
        googleId: profile.id,
        createdAt: Date.now(),
      };
      await kvPut(`user:by-email:${cleanEmail}`, user);
      await kvPut(`user:by-id:${userId}`, user);
    } else if (!user.googleId) {
      user.googleId = profile.id;
      await kvPut(`user:by-email:${cleanEmail}`, user);
      await kvPut(`user:by-id:${user.id}`, user);
    }

    // 4. Set session cookie
    await setSessionUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.redirect(`${origin}?auth_success=true`);
  } catch (err) {
    console.error('Google auth callback error:', err);
    return NextResponse.redirect(`${origin}?auth_error=oauth_internal_error`);
  }
}
