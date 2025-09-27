'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import Providers from '@/components/Providers';
import DashboardNavBar from '@/components/DashboardNavBar';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { error } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login?callbackUrl=/dashboard');
        return;
      }
      if (user.role === 'student') {
        error("คุณไม่ได้รับสิทธิ์", "นักศึกษาไม่สามารถเข้าหน้านี้ได้");
        router.replace('/');
      }
    }
  }, [loading, user, error, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <DashboardNavBar>
      <main className="p-0">{children}</main>
    </DashboardNavBar>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardContent>{children}</DashboardContent>
    </Providers>
  );
}
