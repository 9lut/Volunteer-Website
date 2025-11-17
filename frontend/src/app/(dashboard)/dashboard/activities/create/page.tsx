'use client';

import { useAuth } from '@/hooks/useAuth';
import { canCreateActivity } from '@/lib/roles';
import ActivityFormEdit from '@/components/ActivityFormEdit';
import Link from 'next/link';

export default function CreateActivityPage() {
  const { user } = useAuth();
  const allowed = canCreateActivity(user?.role);

  if (!allowed) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p>บทบาทของคุณไม่ได้รับอนุญาตให้สร้างกิจกรรม</p>
          <Link href="/dashboard" className="inline-block mt-4 text-blue-600 underline hover:text-blue-800">
            ← กลับแดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  return <ActivityFormEdit mode="create" />;
}
