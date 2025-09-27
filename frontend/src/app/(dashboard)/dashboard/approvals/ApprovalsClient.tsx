'use client';

import { useActivities } from '@/hooks/useActivities';
import { api } from '@/lib/axios';
import { useMemo, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, MapPin, Check, X, Search, Clock, Filter, ChevronDown, ArrowUpDown,
} from 'lucide-react';

type Range = 'all' | 'today' | 'week';
type SortBy = 'submitted' | 'start';

type PendingActivity = {
  id: number;
  name?: string;
  location?: string;
  status?: string;
  start_date?: string;
  startDate?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export default function ApprovalsClient() {
  const { activities: pending = [], isLoading, error, mutate } = useActivities('pending');

  const [busyId, setBusyId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [range, setRange] = useState<Range>('all');
  const [sortBy, setSortBy] = useState<SortBy>('submitted');

  const get = (o: any, ...keys: string[]) =>
    keys.reduce<any>((v, k) => (v !== undefined ? v : o?.[k]), undefined);

  const isSameDay = (d: Date, base: Date) =>
    d.getFullYear() === base.getFullYear() &&
    d.getMonth() === base.getMonth() &&
    d.getDate() === base.getDate();

  const inThisWeek = (d: Date, base: Date) => {
    const day = base.getDay(); // 0-6
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    start.setDate(base.getDate() - day); // อาทิตย์นี้นับตั้งแต่อาทิตย์ (อา.)
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  };

  const timeAgo = (input?: string) => {
    if (!input) return '';
    const t = new Date(input).getTime();
    if (Number.isNaN(t)) return '';
    const diff = Math.floor((Date.now() - t) / 1000);
    const units: [number, string][] = [
      [60, 'วินาที'],
      [60, 'นาที'],
      [24, 'ชั่วโมง'],
      [7, 'วัน'],
      [4.345, 'สัปดาห์'],
      [12, 'เดือน'],
    ];
    let value = diff;
    let unit = 'วินาที';
    for (let i = 0; i < units.length && value >= units[i][0]; i++) {
      value = Math.floor(value / units[i][0]);
      unit = units[i][1];
    }
    return `${value} ${unit} ที่แล้ว`;
  };

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const now = new Date();

    const filtered = (pending as PendingActivity[]).filter((a: PendingActivity) => {
      const title = (a.name || '').toLowerCase();
      const loc = (a.location || '').toLowerCase();
      const okQ = !s || title.includes(s) || loc.includes(s);

      if (range === 'all') return okQ;

      const start = get(a, 'start_date', 'startDate');
      const created = get(a, 'created_at', 'createdAt');
      const dStr = sortBy === 'start' ? start : (created ?? start);
      if (!dStr) return false;
      const d = new Date(dStr);
      if (Number.isNaN(d.getTime())) return false;

      if (range === 'today') return okQ && isSameDay(d, now);
      if (range === 'week') return okQ && inThisWeek(d, now);
      return okQ;
    });

    const sorted = [...filtered].sort((a: PendingActivity, b: PendingActivity) => {
      const aDate =
        sortBy === 'start'
          ? get(a, 'start_date', 'startDate') || get(a, 'created_at', 'createdAt')
          : get(a, 'updated_at', 'updatedAt') || get(a, 'created_at', 'createdAt');
      const bDate =
        sortBy === 'start'
          ? get(b, 'start_date', 'startDate') || get(b, 'created_at', 'createdAt')
          : get(b, 'updated_at', 'updatedAt') || get(b, 'created_at', 'CreatedAt');
      const da = aDate ? new Date(aDate).getTime() : 0;
      const db = bDate ? new Date(bDate).getTime() : 0;
      // submitted = ใหม่สุดก่อน, start = ใกล้เริ่มก่อน
      return sortBy === 'submitted' ? db - da : da - db;
    });

    return sorted;
  }, [pending, q, range, sortBy]);

  const setStatus = useCallback(
    async (id: number, status: 'approved' | 'rejected') => {
      try {
        setBusyId(id);
        await api.patch(`/api/activities/${id}/status`, { status });
        await mutate();
      } catch (e) {
        console.error('setStatus error:', e);
        alert('เปลี่ยนสถานะไม่สำเร็จ');
      } finally {
        setBusyId(null);
      }
    },
    [mutate]
  );

  const Skeleton = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-xl bg-emerald-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
          <div className="h-8 w-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sticky header / filter bar */}
      <div className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-emerald-900">อนุมัติกิจกรรม</h1>
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              ทั้งหมด {pending.length}
            </Badge>
          </div>

          {/* Search */}
          <div className="relative w-full sm:ml-auto sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อกิจกรรมหรือสถานที่…"
              className="pl-9 rounded-xl focus-visible:ring-emerald-500"
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:ml-0">
            {/* Range chips */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/60 px-1 py-1">
              {([
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'today', label: 'วันนี้' },
                { key: 'week', label: 'สัปดาห์นี้' },
              ] as const).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                    range === r.key
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-emerald-700/80 hover:bg-white/70',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <Button
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              onClick={() => setSortBy((s) => (s === 'submitted' ? 'start' : 'submitted'))}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortBy === 'submitted' ? 'ใหม่สุดก่อน' : 'ใกล้เริ่มก่อน'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {/* States */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            โหลดข้อมูลไม่สำเร็จ
          </div>
        )}

        {!isLoading && !error && list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-6 w-6" />
            </div>
            <p className="font-medium text-emerald-900">ยังไม่มีรายการรออนุมัติ</p>
            <p className="text-sm text-emerald-700/80">เมื่อมีการส่งกิจกรรมใหม่ รายการจะปรากฏที่นี่</p>
          </div>
        )}

        {/* List */}
        <ul className="grid grid-cols-1 gap-3">
          {list.map((a) => {
            const startStr = get(a, 'start_date', 'startDate');
            const endStr = get(a, 'end_date', 'endDate');

            const start = startStr ? new Date(startStr) : null;
            const end = endStr ? new Date(endStr) : null;

            const startDisplay = start ? start.toLocaleDateString('th-TH') : '-';
            const endDisplay = end ? end.toLocaleDateString('th-TH') : '-';

            const submitted = get(a, 'updated_at', 'updatedAt') || get(a, 'created_at', 'createdAt');
            const submittedAgo = timeAgo(submitted);

            const isBusy = busyId === a.id;

            return (
              <li
                key={a.id}
                className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]" />
                      <p className="font-semibold text-gray-900 truncate">{a.name}</p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CalendarDays className="h-4 w-4" />
                        {startDisplay}
                        <span className="mx-1 text-gray-300">→</span>
                        {endDisplay}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                        <MapPin className="h-4 w-4" />
                        {a.location || '-'}
                      </span>
                      {submittedAgo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-gray-600 border border-gray-200">
                          <Clock className="h-4 w-4" />
                          ส่งมา {submittedAgo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                    <Button
                      disabled={isBusy}
                      onClick={() => setStatus(a.id, 'approved')}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      {isBusy ? 'กำลังอนุมัติ…' : 'อนุมัติ'}
                    </Button>
                    <Button
                      disabled={isBusy}
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => setRejectId(a.id)}
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      {isBusy ? 'กำลังปฏิเสธ…' : 'ไม่อนุมัติ'}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Reject confirm modal */}
      <Dialog open={rejectId !== null} onOpenChange={(v) => !v && setRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">ไม่อนุมัติกิจกรรมนี้?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ยืนยันการ “ไม่อนุมัติ” สำหรับกิจกรรมที่เลือก การดำเนินการนี้สามารถเปลี่ยนกลับได้ภายหลัง
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRejectId(null)}>
              ยกเลิก
            </Button>
            <Button
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (rejectId) setStatus(rejectId, 'rejected');
                setRejectId(null);
              }}
            >
              ไม่อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
