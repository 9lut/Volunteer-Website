// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import DashboardNavBar from '@/components/DashboardNavBar';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login?callbackUrl=/dashboard');

  let expMs: number | undefined;
  let role: 'admin' | 'president' | 'student' | undefined;
  try {
    const payload: any = decodeJwt(token);
    expMs = payload?.exp ? payload.exp * 1000 : undefined;
    role = payload?.role as any;
  } catch {
    redirect('/login?expired=1&callbackUrl=/dashboard');
  }
  if (expMs && Date.now() >= expMs) {
    redirect('/login?expired=1&callbackUrl=/dashboard');
  }

  if (role === 'student') redirect('/');

  return (
    <>
      <DashboardNavBar />
      <main className="p-0">{children}</main>
    </>
  );
}
