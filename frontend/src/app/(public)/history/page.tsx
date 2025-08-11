'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import Link from 'next/link';

type RegItem = {
  id: number;              // registration id
  activity_id: number;
  user_id: string;
  created_at: string;

  // กรณี backend “แบนราบ”
  title?: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  status?: 'approved' | 'pending' | 'rejected';

  // กรณี backend ซ้อนใน activity
  activity?: {
    title?: string;
    start_date?: string | null;
    end_date?: string | null;
    location?: string | null;
    status?: 'approved' | 'pending' | 'rejected';
    cover_url?: string | null;
  };
};

const fetcher = (url: string) => api.get(url).then(r => r.data);

// ---------- helpers ปลอดภัยต่อ undefined ----------
const getTitle = (i: RegItem) => (i.title ?? i.activity?.title ?? '');
const getStatus = (i: RegItem): 'approved'|'pending'|'rejected' =>
  (i.status ?? i.activity?.status ?? 'pending');
const getStart = (i: RegItem) => (i.start_date ?? i.activity?.start_date ?? null);
const getEnd   = (i: RegItem) => (i.end_date ?? i.activity?.end_date ?? null);
const getLoc   = (i: RegItem) => (i.location ?? i.activity?.location ?? '');

function StatusBadge({ status }: { status: 'approved'|'pending'|'rejected' }) {
  const map = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  } as const;
  const text = {
    approved: 'อนุมัติแล้ว',
    pending: 'รออนุมัติ',
    rejected: 'ไม่อนุมัติ',
  }[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {text}
    </span>
  );
}

export default function HistoryPage() {
  const { data, isLoading, error, mutate } = useSWR<RegItem[]>(
    '/api/users/me/registrations',
    fetcher
  );

  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [q, setQ] = useState('');

  const todayFloor = new Date(new Date().toDateString());

  const list = useMemo(() => {
    const qLower = (q || '').toLowerCase().trim();
    const raw = (data || []).filter(i => getTitle(i).toLowerCase().includes(qLower));

    if (tab === 'all') return raw;

    return raw.filter(i => {
      const endStr = getEnd(i) || getStart(i);
      if (!endStr) return tab === 'upcoming'; // ไม่รู้วัน => ถือเป็นอนาคต
      const end = new Date(endStr);
      return tab === 'upcoming' ? end >= todayFloor : end < todayFloor;
    });
  }, [data, q, tab, todayFloor]);

  const cancelable = (i: RegItem) => {
    const endStr = getEnd(i) || getStart(i);
    if (!endStr) return true;
    const end = new Date(endStr);
    return end >= todayFloor;
  };

  const unregister = async (activityId: number, title: string) => {
    if (!confirm(`ยกเลิกการสมัคร "${title || 'กิจกรรมนี้'}" ?`)) return;
    try {
      await api.delete(`/api/activities/${activityId}/register`);
      await mutate();
    } catch (e: any) {
      console.error('unregister failed:', e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'ยกเลิกไม่สำเร็จ');
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">ประวัติกิจกรรมของฉัน</h1>
        <p className="mt-1 text-sm text-gray-600">
          ดูรายการกิจกรรมที่คุณสมัครไว้ และยกเลิกได้หากจำเป็น
        </p>
      </div>

      {/* Controls (mobile-first) */}
      <div className="sticky top-0 z-10 -mx-4 bg-white/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-y md:rounded-xl md:border md:mx-0 md:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-green-50 p-1">
            {([
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'upcoming', label: 'กำลังจะถึง' },
              { key: 'past', label: 'ที่ผ่านมา' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-white text-green-700 shadow-sm border border-green-200'
                    : 'text-green-700/70 hover:text-green-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ค้นหาชื่อกิจกรรม…"
              className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm outline-none ring-0 transition focus:border-green-300 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
            />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </div>
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4">
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่ภายหลัง
        </div>
      )}

      {!isLoading && !error && (
        <>
          {list.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v2h6v-2M9 7v6m6-6v6M5 21h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 01-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">ยังไม่มีประวัติการสมัครกิจกรรม</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {list.map((r) => {
                const title = getTitle(r) || 'ไม่ระบุชื่อ';
                const sd = getStart(r) ? new Date(getStart(r) as string) : null;
                const ed = getEnd(r) ? new Date(getEnd(r) as string) : null;
                const dateText = sd
                  ? sd.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
                    (ed ? ` - ${ed.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}` : '')
                  : '—';

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_0_#f2f2f2]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-gray-900">
                            <Link
                              href={`/activities/${r.activity_id}`}
                              className="hover:text-green-700"
                            >
                              {title}
                            </Link>
                          </h3>
                          <StatusBadge status={getStatus(r)} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {dateText} · {getLoc(r) || '-'}
                        </div>
                      </div>

                      {/* Action */}
                      {cancelable(r) && (
                        <button
                          onClick={() => unregister(r.activity_id, title)}
                          className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:border-green-300 hover:bg-green-100 active:scale-[0.99]"
                        >
                          ยกเลิกการสมัคร
                        </button>
                      )}
                    </div>

                    {/* Footer meta */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>สมัครเมื่อ {new Date(r.created_at).toLocaleDateString('th-TH')}</span>
                      <Link href={`/activities/${r.activity_id}`} className="text-green-700 hover:underline">
                        ดูรายละเอียด
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
