'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import Image from 'next/image';
import { toAbsoluteImageUrl } from '@/lib/helpers/url';
import { CalendarDays, MapPin, Pencil, Trash2, Search, ImageIcon, Filter, XCircle } from 'lucide-react';
import { Users } from 'lucide-react';

type Activity = {
  id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
  cover_url?: string | null;
  club_id?: string | null;
};

type ActivityImage = {
  id: number;
  activity_id: number;
  image_url: string;
  created_at: string;
};

type Club = { id: number; name: string };

type RegRow = { id: number; activity_id: number; user_id: string; created_at: string; email?: string|null; name?: string|null; role?: string };

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ActivitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading, mutate } = useSWR<Activity[]>(
    '/api/activities?status=all&sort=created_at',
    fetcher
  );

  // โหลดชมรมที่ user เป็นประธาน (สำหรับ president)
  const { data: myClubs = [] } = useSWR<Club[]>(
    user?.role === 'president' ? '/api/clubs/me/president' : null,
    fetcher
  );
  const myClubIds = useMemo(() => new Set(myClubs.map(c => String(c.id))), [myClubs]);

  // โหลดรายชื่อชมรม เพื่อใช้ในฟิลเตอร์ + แสดงชื่อ
  const { data: clubs = [] } = useSWR<Club[]>('/api/clubs?limit=1000', fetcher);
  const clubMap = useMemo(() => new Map(clubs.map(c => [String(c.id), c.name])), [clubs]);

  // filters
  const [q, setQ] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [clubFilter, setClubFilter] = useState<'all' | string>('all'); // club_id เป็น string ใน Select
  const [statusFilter, setStatusFilter] = useState<'all' | Activity['status']>('all');

  // edit modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<Partial<Activity>>({});
  const [images, setImages] = useState<ActivityImage[]>([]);
  const [coverImageId, setCoverImageId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // upload
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const onPickNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setNewFiles(prev => [...prev, ...picked].slice(0, 8));
    e.currentTarget.value = '';
  };
  const removePicked = (i: number) => setNewFiles(prev => prev.filter((_, idx) => idx !== i));

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Activity | null>(null);

  // registrations dialog
  const [regOpen, setRegOpen] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regRows, setRegRows] = useState<RegRow[]>([]);
  const [regOf, setRegOf] = useState<Activity | null>(null);

  async function openRegistrations(a: Activity) {
    setRegOf(a);
    setRegOpen(true);
    setRegLoading(true);
    try {
      const rows: RegRow[] = await fetcher(`/api/activities/${a.id}/registrations`);
      setRegRows(rows);
    } catch {
      setRegRows([]);
    } finally {
      setRegLoading(false);
    }
  }

  // list compute
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data || []).filter(a => {
      const matchesText = a.name.toLowerCase().includes(s);
      
      // สำหรับ President: แสดงเฉพาะกิจกรรมของชมรมตัวเอง
      if (user?.role === 'president') {
        const matchesMyClubs = a.club_id && myClubIds.has(a.club_id);
        const matchesStatus =
          statusFilter === 'all' ? true : a.status === statusFilter;
        return matchesText && matchesMyClubs && matchesStatus;
      }
      
      // สำหรับ Admin: แสดงตามการกรอง
      const matchesClub =
        clubFilter === 'all' ? true : a.club_id === clubFilter;
      const matchesStatus =
        statusFilter === 'all' ? true : a.status === statusFilter;
      return matchesText && matchesClub && matchesStatus;
    });
  }, [data, q, clubFilter, statusFilter, user?.role, myClubIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  // clamp + reset page on filter changes
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [q, pageSize, clubFilter, statusFilter]);

  // helpers
  function StatusPill({ s }: { s: Activity['status'] }) {
    const map = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    } as const;
    const label = s === 'approved' ? 'อนุมัติแล้ว' : s === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ';
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${map[s]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s === 'approved' ? 'bg-emerald-600' : s === 'pending' ? 'bg-amber-600' : 'bg-rose-600'}`} />
        {label}
      </span>
    );
  }

  async function openEdit(a: Activity) {
    setEditing(a);
    setForm({
      name: a.name,
      description: a.description ?? '',
      start_date: a.start_date?.slice(0, 10) ?? '',
      end_date: a.end_date?.slice(0, 10) ?? '',
      location: a.location ?? '',
      status: a.status,
    });
    setOpen(true);
    setNewFiles([]);

    try {
      const imgs: ActivityImage[] = await fetcher(`/api/activities/${a.id}/images`);
      setImages(imgs);
      const found = a.cover_url
        ? imgs.find(x => toAbsoluteImageUrl(x.image_url) === toAbsoluteImageUrl(a.cover_url!))
        : undefined;
      setCoverImageId(found?.id ?? null);
    } catch {
      setImages([]);
      setCoverImageId(null);
    }
  }

  function closeEdit() {
    setOpen(false);
    setEditing(null);
    setForm({});
    setImages([]);
    setCoverImageId(null);
    setNewFiles([]);
    setSaving(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/api/activities/${editing.id}`, {
        name: form.name,
        description: form.description,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        location: form.location,
      });

      if (isAdmin && form.status && form.status !== editing.status) {
        await api.patch(`/api/activities/${editing.id}/status`, { status: form.status });
      }

      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach(f => fd.append('images', f));
        await api.post(`/api/activities/${editing.id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (coverImageId) {
        await api.post(`/api/activities/${editing.id}/images/${coverImageId}/cover`);
      }

      await mutate();
      closeEdit();
    } catch (e: any) {
      console.error('save edit failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  }

  function askDelete(a: Activity) {
    setToDelete(a);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.delete(`/api/activities/${toDelete.id}`);
      await mutate();
      setConfirmOpen(false);
      setToDelete(null);
    } catch (e: any) {
      console.error('delete failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  }

  async function removeImage(img: ActivityImage) {
    if (!editing) return;
    if (!window.confirm('ลบรูปนี้ ?')) return;
    try {
      await api.delete(`/api/activities/${editing.id}/images/${img.id}`);
      const imgs: ActivityImage[] = await fetcher(`/api/activities/${editing.id}/images`);
      setImages(imgs);
      if (coverImageId === img.id) setCoverImageId(null);
      await mutate();
    } catch (e: any) {
      console.error('delete image failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'ลบรูปไม่สำเร็จ');
    }
  }

  /** Skeleton UI */
  const SkeletonCard = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm animate-pulse">
      <div className="flex gap-3">
        <div className="h-20 w-24 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="h-9 bg-gray-100 rounded-xl" />
            <div className="h-9 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white md:bg-emerald-50/40 w-full">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-emerald-900">
            {isAdmin ? 'จัดการกิจกรรม' : 'กิจกรรมของฉัน'}
          </h1>
          <p className="mt-1 text-sm text-emerald-700/80">
            {isAdmin 
              ? 'แตะเพื่อแก้ไข ตั้งรูปปก อัปโหลดรูป หรือ ลบกิจกรรมได้เลย'
              : myClubs.length > 0 
                ? `กิจกรรมของ${myClubs.map(c => c.name).join(', ')} • แตะเพื่อแก้ไขหรือจัดการผู้เข้าร่วม`
                : 'คุณยังไม่ได้เป็นสมาชิกของชมรมใด กรุณาติดต่อผู้ดูแลระบบ'
            }
          </p>
        </div>
      </div>

      {/* Action Buttons for President */}
      {user?.role === 'president' && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/activities/create')}
              className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all"
            >
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div className="text-lg font-semibold">สร้างกิจกรรมใหม่</div>
              <div className="text-sm opacity-90">เพิ่มกิจกรรมสำหรับชมรม</div>
            </button>

            <button
              onClick={() => router.push('/dashboard/club-stats')}
              className="p-6 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-lg font-semibold">สถิติชมรม</div>
              <div className="text-sm text-gray-500">ดูผลงานและสถิติ</div>
            </button>

            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 mb-1">
                  {(data || []).filter(a => a.club_id && myClubIds.has(a.club_id)).length}
                </div>
                <div className="text-sm text-emerald-700">กิจกรรมทั้งหมด</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-3">
          <div className="rounded-2xl border border-emerald-200/60 bg-white/70 shadow-sm">
            <div className={`p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 ${
              isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
            }`}>
              {/* Search */}
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); }}
                  placeholder="ค้นหากิจกรรม…"
                  className="pl-9 h-11 rounded-xl border-emerald-300 focus-visible:ring-emerald-500"
                  aria-label="ค้นหากิจกรรม"
                />
                {q.trim() && (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-emerald-50 transition"
                    aria-label="ล้างคำค้นหา"
                  >
                    <XCircle className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
              </div>

              {/* Club filter - แสดงเฉพาะ Admin */}
              {isAdmin && (
                <div className="relative">
                  <Select value={clubFilter} onValueChange={setClubFilter}>
                    <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-emerald-600" />
                        <SelectValue placeholder="ชมรมทั้งหมด" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ชมรมทั้งหมด</SelectItem>
                      {clubs.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status filter */}
              <div className="relative">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                    <SelectValue placeholder="สถานะทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                    <SelectItem value="pending">รออนุมัติ</SelectItem>
                    <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                    <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page size */}
              <div className="relative">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                    <SelectValue placeholder="ต่อหน้า" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">แสดง 10 รายการ</SelectItem>
                    <SelectItem value="20">แสดง 20 รายการ</SelectItem>
                    <SelectItem value="50">แสดง 50 รายการ</SelectItem>
                    <SelectItem value="100">แสดง 100 รายการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary + clear */}
              <div className="flex items-center justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  {/* แสดงผลกรองชมรมเฉพาะ Admin */}
                  {isAdmin && clubFilter !== 'all' && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                      ชมรม: {clubMap.get(clubFilter) || clubFilter}
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                      สถานะ: {statusFilter === 'approved' ? 'อนุมัติแล้ว' : statusFilter === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}
                    </span>
                  )}
                  {/* ปุ่มล้างตัวกรอง */}
                  {(q || (isAdmin && clubFilter !== 'all') || statusFilter !== 'all') && (
                    <button
                      onClick={() => { 
                        setQ(''); 
                        if (isAdmin) setClubFilter('all'); 
                        setStatusFilter('all'); 
                      }}
                      className="text-sm text-emerald-700 hover:text-emerald-900 underline"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {/* MOBILE: cards */}
        {!isLoading && current.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-3 md:hidden">
              {current.map(a => (
                <li key={a.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <div className="relative w-24 h-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {a.cover_url ? (
                        <Image
                          src={toAbsoluteImageUrl(a.cover_url)}
                          alt={a.name}
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{a.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{a.start_date ? new Date(a.start_date).toLocaleDateString('th-TH') : '-'}</span>
                        <span className="text-gray-300">•</span>
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{a.location || '-'}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusPill s={a.status} />
                        {a.club_id ? (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            {clubMap.get(a.club_id) || `ชมรม #${a.club_id}`}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(user?.role === 'admin' || (user?.role === 'president' && a.club_id && myClubIds.has(a.club_id))) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => router.push(`/dashboard/activities/${a.id}/edit`)}
                            >
                              <Pencil className="w-4 h-4 mr-1.5" />
                              แก้ไข
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50 col-span-2"
                              onClick={() => router.push(`/dashboard/activities/${a.id}/participants`)}
                            >
                              <Users className="w-4 h-4 mr-1.5" /> จัดการผู้เข้าร่วม
                            </Button>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl border-red-200 text-red-700 hover:bg-red-100 col-span-2"
                            onClick={() => askDelete(a)}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            ลบ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* DESKTOP: table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50/60">
                  <tr className="text-left text-emerald-900/80">
                    <th className="py-3 pr-3 pl-4">รูป</th>
                    <th className="py-3 pr-3">ชื่อกิจกรรม</th>
                    <th className="py-3 pr-3">ชมรม</th>
                    <th className="py-3 pr-3">สถานที่</th>
                    <th className="py-3 pr-3">วันที่เริ่ม</th>
                    <th className="py-3 pr-3">สถานะ</th>
                    <th className="py-3 pr-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {current.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="py-3 pr-3 pl-4">
                        <div className="relative h-12 w-20 bg-gray-100 rounded overflow-hidden">
                          {a.cover_url ? (
                            <Image
                              src={toAbsoluteImageUrl(a.cover_url)}
                              alt={a.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-medium text-gray-900">{a.name}</td>
                      <td className="py-3 pr-3">{a.club_id ? (clubMap.get(a.club_id) || `ชมรม #${a.club_id}`) : '-'}</td>
                      <td className="py-3 pr-3">{a.location || '-'}</td>
                      <td className="py-3 pr-3">
                        {a.start_date ? new Date(a.start_date).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="py-3 pr-3"><StatusPill s={a.status} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          {(user?.role === 'admin' || (user?.role === 'president' && a.club_id && myClubIds.has(a.club_id))) && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" 
                                onClick={() => router.push(`/dashboard/activities/${a.id}/edit`)}
                              >
                                <Pencil className="w-4 h-4 mr-1.5" /> แก้ไข
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50" 
                                onClick={() => router.push(`/dashboard/activities/${a.id}/participants`)}
                              >
                                <Users className="w-4 h-4 mr-1.5" /> จัดการผู้เข้าร่วม
                              </Button>
                            </>
                          )}
                          {user?.role === 'admin' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="rounded-xl border-red-200 text-red-700 hover:bg-red-100" 
                              onClick={() => askDelete(a)}
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" /> ลบ
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">
                แสดง {current.length} จาก {filtered.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl"
                >
                  ก่อนหน้า
                </Button>
                <div className="text-sm">หน้า {page} / {totalPages}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          </>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:hidden">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="font-medium text-emerald-900">ยังไม่มีกิจกรรม</p>
            <p className="text-sm text-emerald-700/80">เริ่มต้นด้วยการสร้างกิจกรรมแรกของคุณ</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeEdit())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">แก้ไขกิจกรรม</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6">
            {/* ฟอร์มข้อมูลหลัก */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">ชื่อกิจกรรม</Label>
                <Input
                  id="title"
                  value={form.name || ''}
                  onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="location">สถานที่</Label>
                <Input
                  id="location"
                  value={form.location || ''}
                  onChange={(e) => setForm(s => ({ ...s, location: e.target.value }))}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="start_date">วันที่เริ่ม</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date || ''}
                  onChange={(e) => setForm(s => ({ ...s, start_date: e.target.value }))}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date || ''}
                  onChange={(e) => setForm(s => ({ ...s, end_date: e.target.value }))}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <textarea
                  id="description"
                  className="w-full rounded-xl border p-3 min-h-[110px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={form.description || ''}
                  onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
                />
              </div>

              {isAdmin && (
                <div>
                  <Label>สถานะ</Label>
                  <Select
                    value={String(form.status || 'pending')}
                    onValueChange={(v) => setForm(s => ({ ...s, status: v as Activity['status'] }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">รออนุมัติ</SelectItem>
                      <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                      <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* แกลเลอรี่ + อัปโหลด */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>รูปภาพกิจกรรม</Label>
                {editing?.cover_url ? (
                  <span className="text-xs text-gray-500">ปกปัจจุบัน: {editing.cover_url.split('/').pop()}</span>
                ) : null}
              </div>

              {images.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 border rounded p-3">
                  ยังไม่มีรูปภาพของกิจกรรมนี้
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map(img => {
                    const abs = toAbsoluteImageUrl(img.image_url);
                    const checked = coverImageId === img.id;
                    return (
                      <div
                        key={img.id}
                        className={`relative rounded-xl overflow-hidden border ${checked ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-200'}`}
                      >
                        <div className="relative w-full aspect-[4/3] bg-gray-100">
                          <Image src={abs} alt={`image-${img.id}`} fill sizes="(max-width:768px) 50vw, 200px" className="object-cover" />
                        </div>
                        <div className="absolute top-2 left-2 flex gap-2">
                          <Badge
                            className={`${checked ? 'bg-emerald-600' : 'bg-black/60 cursor-pointer'} text-white`}
                            onClick={() => setCoverImageId(img.id)}
                          >
                            {checked ? 'ปัจจุบัน' : 'ตั้งเป็นปก'}
                          </Badge>
                          <Badge className="bg-rose-600 text-white cursor-pointer" onClick={() => removeImage(img)}>
                            ลบ
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Label>อัปโหลดรูปเพิ่ม (สูงสุด 8 ไฟล์/ครั้ง)</Label>
                <Input type="file" multiple accept="image/*" onChange={onPickNew} className="rounded-xl" />
                {newFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {newFiles.map((f, i) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <div key={`${f.name}-${i}`} className="relative rounded-xl overflow-hidden border border-dashed">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={f.name} className="w-full aspect-[4/3] object-cover" />
                          <button
                            type="button"
                            className="absolute top-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded"
                            onClick={() => removePicked(i)}
                          >
                            ลบ
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={closeEdit} disabled={saving} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">ลบกิจกรรมนี้?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ต้องการลบ <span className="font-semibold">{toDelete?.name}</span> จริงหรือไม่
            การลบจะไม่สามารถกู้คืนได้
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button onClick={confirmDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
              ลบเลย
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrations */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ผู้สมัคร {regOf?.name ? `: ${regOf.name}` : ''}</DialogTitle>
          </DialogHeader>
          {regLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">กำลังโหลด…</div>
          ) : regRows.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">ยังไม่มีผู้สมัคร</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <div className="flex justify-end mb-2">
                <a
                  href={`/api/activities/${regOf?.id}/registrations.csv`}
                  target="_blank"
                  className="text-sm px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  ส่งออก CSV
                </a>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">อีเมล</th>
                    <th className="py-2 pr-3">ชื่อ</th>
                    <th className="py-2 pr-3">บทบาท</th>
                    <th className="py-2 pr-3">สมัครเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {regRows.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium text-gray-900">{r.email || r.user_id}</td>
                      <td className="py-2 pr-3">{r.name || '-'}</td>
                      <td className="py-2 pr-3">{r.role || '-'}</td>
                      <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRegOpen(false)} variant="outline">ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
