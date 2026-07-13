import { NextRequest, NextResponse } from 'next/server';

/**
 * Password-gate middleware for Vercel deployment.
 * Set NEXUS_PASSWORD env var to enable — if not set, no auth is enforced.
 *
 * Auth flow:
 * - Client sends `x-nexus-token` header, `?token=` query param, or the
 *   `nexus-token` cookie (set on a successful `?token=` login).
 * - If it matches NEXUS_PASSWORD, request proceeds.
 * - Otherwise: browser (HTML) requests get an inline login page; API
 *   requests get a 401 JSON.
 */
const COOKIE_NAME = 'nexus-token';
// A year: this is a personal device, not a shared kiosk — once unlocked it
// should stay unlocked. Changing NEXUS_PASSWORD in Vercel instantly revokes
// every existing cookie (the check is a live string compare, not a stored
// session), so a lost/stolen phone is still one dashboard edit away from cut off.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loginPage(opts: { action: string; hiddenFields: string; wrongPassword: boolean }): string {
  const { action, hiddenFields, wrongPassword } = opts;
  return `<!DOCTYPE html>
<html><head><title>Nexus</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    background: #08080d; color: #e8e6e1; margin: 0; height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .box { text-align: center; padding: 0 20px; width: 100%; max-width: 320px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; background: #eba941; margin-bottom: 14px; }
  h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 28px; }
  form { display: flex; flex-direction: column; gap: 10px; }
  input[type="password"] {
    padding: 0.85rem 1rem; border: 1px solid #22222e; border-radius: 10px;
    background: #0d0d14; color: #e8e6e1; font-size: 16px; outline: none;
    width: 100%; text-align: center;
  }
  input[type="password"]:focus { border-color: rgba(235, 169, 65, 0.5); }
  button {
    padding: 0.85rem 1rem; border: none; border-radius: 10px;
    background: #eba941; color: #1a1206; font-size: 15px; font-weight: 600;
    cursor: pointer;
  }
  button:active { transform: scale(0.97); }
  .error {
    color: #f28b82; font-size: 13px; margin: -14px 0 4px;
    font-family: ui-monospace, monospace;
  }
</style></head>
<body><div class="box">
  <span class="dot"></span>
  <h1>Nexus</h1>
  <form method="GET" action="${escapeHtml(action)}">
    ${hiddenFields}
    ${wrongPassword ? '<p class="error">Incorrect password — try again</p>' : ''}
    <input
      name="token" type="password" placeholder="Password"
      autofocus autocomplete="current-password"
      autocapitalize="off" autocorrect="off" spellcheck="false"
    />
    <button type="submit">Enter</button>
  </form>
</div></body></html>`;
}

export function middleware(request: NextRequest) {
  const password = process.env.NEXUS_PASSWORD?.trim();

  // No password configured → open access (local dev)
  if (!password) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next') || path.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const headerToken = request.headers.get('x-nexus-token')?.trim();
  const queryToken = request.nextUrl.searchParams.get('token')?.trim();
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;

  if (headerToken === password || queryToken === password || cookieToken === password) {
    // Authenticated via query param this request → set the cookie and
    // redirect, stripping only `token` — every other param (e.g. the PWA
    // share target's `text`/`url`/`title`) survives the redirect.
    if (queryToken === password && cookieToken !== password) {
      const url = request.nextUrl.clone();
      url.searchParams.delete('token');
      const response = NextResponse.redirect(url);
      response.cookies.set(COOKIE_NAME, password, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });
      return response;
    }
    return NextResponse.next();
  }

  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml && !path.startsWith('/api/')) {
    // Carry every non-token query param through as hidden fields, so
    // logging in mid-share (or mid-deeplink) doesn't drop what was shared.
    const hiddenFields = Array.from(request.nextUrl.searchParams.entries())
      .filter(([key]) => key !== 'token')
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`
      )
      .join('\n    ');

    return new NextResponse(
      loginPage({
        action: path,
        hiddenFields,
        // A submitted-but-wrong token means this render IS a failed attempt.
        wrongPassword: queryToken !== null && queryToken !== password,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // API requests without auth → 401
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
