import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple password-gate middleware for Vercel deployment.
 * Set NEXUS_PASSWORD env var to enable — if not set, no auth is enforced.
 * 
 * Auth flow:
 * - Client sends `x-nexus-token` header or `?token=` query param
 * - If it matches NEXUS_PASSWORD, request proceeds
 * - Otherwise, 401
 */
export function middleware(request: NextRequest) {
  const password = process.env.NEXUS_PASSWORD;

  // No password configured → open access (local dev)
  if (!password) return NextResponse.next();

  // Skip auth for static assets and Next.js internals
  const path = request.nextUrl.pathname;
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path === '/login'
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const headerToken = request.headers.get('x-nexus-token');
  const queryToken = request.nextUrl.searchParams.get('token');
  const cookieToken = request.cookies.get('nexus-token')?.value;

  if (
    headerToken === password ||
    queryToken === password ||
    cookieToken === password
  ) {
    // If authenticated via query param, set cookie and redirect without token in URL
    if (queryToken === password && !cookieToken) {
      const url = request.nextUrl.clone();
      url.searchParams.delete('token');
      const response = NextResponse.redirect(url);
      response.cookies.set('nexus-token', password, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return response;
    }
    return NextResponse.next();
  }

  // Not authenticated — return simple login page for browser requests
  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml && !path.startsWith('/api/')) {
    return new NextResponse(
      `<!DOCTYPE html>
<html><head><title>Nexus</title>
<style>
  body { background: #0a0a0f; color: #e0e0e0; font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .box { text-align: center; }
  h1 { font-size: 2rem; margin-bottom: 1rem; }
  form { display: flex; gap: 0.5rem; }
  input { padding: 0.75rem 1rem; border: 1px solid #333; border-radius: 8px; background: #1a1a2e; color: #fff; font-size: 1rem; outline: none; }
  input:focus { border-color: #7b8aff; }
  button { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: #7b8aff; color: #fff; font-size: 1rem; cursor: pointer; }
  button:hover { background: #6b7aef; }
</style></head>
<body><div class="box">
  <h1>◇ Nexus</h1>
  <form method="GET" action="/">
    <input name="token" type="password" placeholder="Password" autofocus />
    <button type="submit">Enter</button>
  </form>
</div></body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // API requests without auth → 401
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
