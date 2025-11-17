'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canCreateActivity } from '@/lib/roles';
import ActivityFormEdit from '@/components/ActivityFormEdit';
import Link from 'next/link';

export default function EditActivityPage() {
  const params = useParams();
  const activityId = Number(params.id);
  const { user } = useAuth();
  const allowed = canCreateActivity(user?.role);

  if (!allowed) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p>บทบาทของคุณไม่ได้รับอนุญาตให้แก้ไขกิจกรรม</p>
          <Link href="/dashboard/activities" className="inline-block mt-4 text-blue-600 underline hover:text-blue-800">
            ← กลับรายการกิจกรรม
          </Link>
        </div>
      </div>
    );
  }

  if (!activityId || isNaN(activityId)) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 text-red-900">
          <h2 className="text-xl font-bold mb-2">ข้อผิดพลาด</h2>
          <p>ไม่พบกิจกรรมที่ต้องการแก้ไข</p>
          <Link href="/dashboard/activities" className="inline-block mt-4 text-blue-600 underline hover:text-blue-800">
            ← กลับรายการกิจกรรม
          </Link>
        </div>
      </div>
    );
  }

  return <ActivityFormEdit mode="edit" activityId={activityId} />;
}
