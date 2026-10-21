// Canonical site identity.
//
// The deployed origin is driven by NEXT_PUBLIC_APP_URL; the constants below are
// the production fallback used for metadata, sitemap, robots, legal canonicals
// and the footer, so a missing env var never leaks a placeholder domain.

export const SITE_DOMAIN = 'tickertracker.net';
export const SITE_URL = `https://${SITE_DOMAIN}`;

/** Origin used for absolute URLs, without a trailing slash. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, '');
}
