// src/app/login/page.tsx
'use client';

import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // เส้นทางที่ห้ามตามบทบาท
  const isProtected = (p: string) => p.startsWith('/admin') || p.startsWith('/dashboard');
  const roleAllowsPath = (role: string | undefined, p: string) => {
    if (p.startsWith('/admin')) return role === 'admin';
    if (p.startsWith('/dashboard')) return role === 'admin' || role === 'president';
    return true; // path อื่น ๆ เข้าได้ทุก role
  };
  const isSafeInternalPath = (p: string | null) => !!p && p.startsWith('/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    if (!res || res.error) {
      setLoading(false);
      setErr(res?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      return;
    }

    // ดึง session เพื่ออ่าน role
    const session = await getSession();
    const role = (session as any)?.user?.role as 'admin' | 'president' | 'student' | undefined;

    // พิจารณา callbackUrl จาก middleware (ถ้ามี)
    const from = sp.get('callbackUrl');
    let next = '/';

    if (isSafeInternalPath(from) && roleAllowsPath(role, from!)) {
      next = from!;
    } else {
      // fallback ตาม role
      if (role === 'admin') next = '/admin';
      else if (role === 'president') next = '/dashboard';
      else next = '/'; // student → ห้าม /dashboard และ /admin
    }

    // ป้องกันไม่ให้ student ไปหน้า protected ได้
    if (role === 'student' && isProtected(next)) {
      next = '/';
    }

    router.replace(next);
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white mt-30">
      <div className="w-full max-w-md px-6">
        {/* Card */}
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                เข้าสู่ระบบ
              </h1>
              <p className="mt-2 text-xs text-gray-500">
                เพื่อเข้าใช้งานบัญชีของคุณเพื่อเข้าถึงกิจกรรมและบริการต่างๆ
              </p>
            </div>

            {/* Error */}
            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  อีเมล
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@university.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs text-gray-500 hover:text-gray-700"
                    aria-label={showPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPwd ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-white transition hover:bg-black disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                    กำลังเข้าสู่ระบบ…
                  </span>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">หรือ</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Register */}
            <p className="text-center text-sm text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="font-medium text-gray-900 underline underline-offset-4 hover:no-underline">
                สมัครสมาชิก
              </Link>
            </p>
          </div>
        </div>

        {/* tiny footer spacing */}
        <div className="py-4" />
      </div>
    </main>
  );
}
