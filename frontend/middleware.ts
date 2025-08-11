// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

export default withAuth(
  function middleware(req) {
    const url = req.nextUrl;
    const { pathname, search } = url;
    const origin = url.origin;

    const token: any = req.nextauth?.token;

    const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
    const isAdminZone = pathname === '/admin' || pathname.startsWith('/admin/');
    const needAuth = isDashboard || isAdminZone;

    // ยังไม่ล็อกอิน → ส่งไป /login พร้อม callbackUrl
    if (needAuth && !token) {
      const login = new URL('/login', origin);
      login.searchParams.set('callbackUrl', pathname + search);
      return NextResponse.redirect(login);
    }

    // มี token แล้ว → ตรวจหมดอายุของ backend JWT (ถ้ามี)
    if (token) {
      const leewayMs = 5_000;
      let backendExpMs: number | undefined = token.backendExp;

      if (!backendExpMs && token.backendToken) {
        try {
          const payload: any = decodeJwt(token.backendToken as string);
          backendExpMs = payload?.exp ? payload.exp * 1000 : undefined;
        } catch {
          const login = new URL('/login', origin);
          login.searchParams.set('expired', '1');
          return NextResponse.redirect(login);
        }
      }

      if (backendExpMs && Date.now() >= backendExpMs - leewayMs) {
        const login = new URL('/login', origin);
        login.searchParams.set('expired', '1');
        return NextResponse.redirect(login);
      }

      // บทบาท
      const role = token.user?.role as 'admin' | 'president' | 'student' | undefined;

      // ❌ student ห้ามเข้าทั้ง /dashboard และ /admin → เด้งกลับ /
      if ((isDashboard || isAdminZone) && role === 'student') {
        return NextResponse.redirect(new URL('/', origin));
      }

      // ❌ /admin ต้องเป็น admin เท่านั้น (president ก็ห้าม)
      if (isAdminZone && role !== 'admin') {
        return NextResponse.redirect(new URL('/', origin));
      }
    }

    // ผ่านหมด → ไปต่อ
    return NextResponse.next();
  },
  {
    // ให้เราควบคุม redirect เองทั้งหมด
    callbacks: { authorized: () => true },
  }
);

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*'],
};
