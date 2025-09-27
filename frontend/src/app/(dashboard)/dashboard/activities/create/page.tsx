'use client';

import { useAuth } from '@/hooks/useAuth';
import { canCreateActivity } from '@/lib/roles';
import ActivityForm from '@/components/ActivityForm';
import Link from 'next/link';

export default function CreateActivityPage() {
  const { user } = useAuth();
  const allowed = canCreateActivity(user?.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สร้างกิจกรรมใหม่</h1>
          <p className="text-sm text-gray-600">
            เติมรายละเอียดกิจกรรมให้ครบ — สำหรับประธานชมรมและผู้ดูแลระบบเท่านั้น
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">
          ← กลับแดชบอร์ด
        </Link>
      </div>

      {!allowed ? (
        <div className="rounded-xl border bg-amber-50 p-4 text-amber-800">
          บทบาทของคุณไม่ได้รับอนุญาตให้สร้างกิจกรรม
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <ActivityForm />
          <p className="mt-3 text-xs text-gray-500">
            หมายเหตุ: กิจกรรมใหม่จะมีสถานะ <span className="font-medium">pending</span> 
            และต้องให้แอดมินอนุมัติก่อนจึงจะแสดงในหน้าสาธารณะ
          </p>
        </div>
      )}
    </div>
  );
}
