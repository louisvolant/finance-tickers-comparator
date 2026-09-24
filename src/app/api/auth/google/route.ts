import { NextRequest, NextResponse } from 'next/server';

import { getEnvVar, getRequestOrigin } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const clientId = getEnvVar('GOOGLE_CLIENT_ID');
  const origin = getRequestOrigin(request);
  const redirectUri = `${origin}/api/auth/callback/google`;

  if (!clientId) {
    return NextResponse.redirect(`${origin}?auth_error=google_oauth_not_configured`);
  }

  const scope = encodeURIComponent('openid email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
