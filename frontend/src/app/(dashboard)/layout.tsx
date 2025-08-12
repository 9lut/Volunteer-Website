// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Providers from '@/components/Providers';
import DashboardNavBar from '@/components/DashboardNavBar';
import { decodeJwt } from 'jose';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // ยังไม่ล็อกอิน → ไป login พร้อม callback กลับมาหน้านี้
  if (!session) redirect('/login?callbackUrl=/dashboard');

  // เช็กหมดอายุของ backend JWT
  let expMs = (session as any)?.backendExp as number | undefined;
  if (!expMs) {
    try {
      const payload: any = decodeJwt((session as any).backendToken as string);
      expMs = payload?.exp ? payload.exp * 1000 : undefined;
    } catch {
      redirect('/login?expired=1&callbackUrl=/dashboard');
    }
  }
  if (expMs && Date.now() >= expMs) {
    redirect('/login?expired=1&callbackUrl=/dashboard');
  }

  // ❌ กัน student เข้าหน้านี้
  const role = (session as any)?.user?.role as 'admin' | 'president' | 'student' | undefined;
  if (role === 'student') redirect('/');

  // (ถ้าต้องการจำกัดเพิ่มเติมว่าเฉพาะ admin|president เท่านั้นก็พอ ไม่ต้อง else)

  return (
    <Providers>
      <DashboardNavBar />
      <main className="p-0">{children}</main>
    </Providers>
  );
}
