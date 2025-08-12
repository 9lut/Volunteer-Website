// middleware.ts
import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;
  const origin = url.origin;

  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isAdminZone = pathname === '/admin' || pathname.startsWith('/admin/');
  const needAuth = isDashboard || isAdminZone;

  const cookie = req.cookies.get('auth_token')?.value;

  if (needAuth && !cookie) {
    const login = new URL('/login', origin);
    login.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(login);
  }

  if (cookie) {
    try {
      const payload: any = decodeJwt(cookie);
      const expMs = payload?.exp ? payload.exp * 1000 : undefined;
      const leewayMs = 5_000;
      if (expMs && Date.now() >= expMs - leewayMs) {
        const login = new URL('/login', origin);
        login.searchParams.set('expired', '1');
        return NextResponse.redirect(login);
      }
      const role = payload?.role as 'admin' | 'president' | 'student' | undefined;
      if ((isDashboard || isAdminZone) && role === 'student') {
        return NextResponse.redirect(new URL('/', origin));
      }
      if (isAdminZone && role !== 'admin') {
        return NextResponse.redirect(new URL('/', origin));
      }
    } catch {
      const login = new URL('/login', origin);
      login.searchParams.set('expired', '1');
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*'],
};
