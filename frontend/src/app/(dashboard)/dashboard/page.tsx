'use client';

import { useAuth } from '@/hooks/useAuth';
import { canCreateActivity, canApproveActivity } from '@/lib/roles';
import { useActivities } from '@/hooks/useActivities';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import Link from 'next/link';

type Recent = {
  id: number;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const canCreate = canCreateActivity(user?.role);
  const canApprove = canApproveActivity(user?.role);

  // กิจกรรมตามสถานะ
  const { activities: approved } = useActivities('approved');
  const { activities: pending } = useActivities('pending');
  const { activities: rejected } = useActivities('rejected');

  // users (เฉพาะ admin)
  const [totalMembers, setTotalMembers] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    let mounted = true;
    (async () => {
      try {
        setLoadingUsers(true);
        const res = await api.get('/api/users?limit=1000');
        if (mounted) setTotalMembers(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        if (mounted) setTotalMembers(0);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  // รวมกิจกรรมสำหรับ Recent
  const allForRecent = useMemo(() => {
    const arr = [...approved, ...pending, ...rejected];
    const map = new Map<number, Recent>();
    for (const a of arr) {
      if (!map.has(a.id)) {
        map.set(a.id, {
          id: a.id,
          title: a.title,
          status: a.status as Recent['status'],
          created_at: a.created_at,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [approved, pending, rejected]);

  // Stats
  const stats = {
    totalActivities: approved.length + pending.length + rejected.length,
    totalMembers,
    totalClubs: 0, // ไว้เชื่อม clubs ภายหลัง
    pendingApprovals: pending.length,
    approvedActivities: approved.length,
    activeMembers: Math.max(0, Math.floor(totalMembers * 0.7)),
  };

  // ===== UI Sub Components (มินิมอล โทนเขียว) =====
  const StatCard = ({
    title,
    value,
    href,
  }: {
    title: string;
    value: number | string;
    href?: string;
  }) => {
    const Card = (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow transition">
        <p className="text-xs sm:text-sm text-gray-500">{title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    );
    return href ? (
      <Link href={href} className="block active:scale-[0.99] transition">
        {Card}
      </Link>
    ) : (
      Card
    );
  };

  const QuickAction = ({
    title,
    desc,
    href,
    icon,
  }: {
    title: string;
    desc: string;
    href: string;
    icon: React.ReactNode;
  }) => (
    <Link
      href={href}
      className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md active:scale-[0.99] transition group flex items-start gap-4"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 group-hover:bg-green-100">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 group-hover:text-green-700">{title}</p>
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{desc}</p>
      </div>
      <svg className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );

  const StatusPill = ({ s }: { s: Recent['status'] }) => {
    const map = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
    } as const;
    const label = s === 'approved' ? 'อนุมัติแล้ว' : s === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ';
    return <span className={`px-2.5 py-1 text-[11px] rounded-full font-medium ${map[s]}`}>{label}</span>;
  };

  // ===== Render =====
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 w-full lg:pl-64">
      {/* Header (mobile-first) */}
      <header className="px-4 sm:px-6 pt-4 md:pt-6">
        <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-600 text-white flex items-center justify-center font-bold">
              V
            </div>
            <div className="leading-tight">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">แดชบอร์ด</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                สวัสดี {user?.email?.split('@')[0] || 'ผู้ใช้'} จัดการกิจกรรมอาสาของคุณได้ที่นี่
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 pb-24 md:pb-10 mt-4 md:mt-6 max-w-6xl mx-auto">
        {/* Stats (1 col on mobile) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="กิจกรรมทั้งหมด" value={stats.totalActivities} href="/dashboard/activities" />
          <StatCard
            title="รออนุมัติ"
            value={canApprove ? stats.pendingApprovals : '—'}
            href={canApprove ? '/dashboard/approvals' : undefined}
          />
          <StatCard title="อนุมัติแล้ว" value={stats.approvedActivities} />
          <StatCard title="สมาชิกทั้งหมด" value={user?.role === 'admin' ? (loadingUsers ? '…' : stats.totalMembers) : '—'} />
        </section>

        {/* Quick Actions */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {canCreate && (
            <QuickAction
              title="สร้างกิจกรรมใหม่"
              desc="เพิ่มกิจกรรมอาสาสมัครใหม่ พร้อมรายละเอียดและช่วงเวลา"
              href="/dashboard/create-activity"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              }
            />
          )}
          {canApprove && (
            <QuickAction
              title="อนุมัติกิจกรรม"
              desc={`มี ${stats.pendingApprovals} กิจกรรมรอการตรวจสอบ`}
              href="/dashboard/approvals"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              }
            />
          )}
          <QuickAction
            title="ดูรายงาน"
            desc="สรุปภาพรวมกิจกรรมและแนวโน้มการเข้าร่วม"
            href="/dashboard/reports"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z" />
              </svg>
            }
          />
        </section>

        {/* Recent Activities */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">กิจกรรมล่าสุด</h2>
            <Link href="/dashboard/activities" className="text-green-700 hover:text-green-800 text-sm font-medium">
              ดูทั้งหมด →
            </Link>
          </div>

          {allForRecent.length > 0 ? (
            <ul className="space-y-2.5">
              {allForRecent.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/activities`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 19h14" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(a.created_at).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>
                    <StatusPill s={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
              ยังไม่มีกิจกรรม
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
