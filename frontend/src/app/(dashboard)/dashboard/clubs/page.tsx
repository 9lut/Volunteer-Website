'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';

import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';

import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
  import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

type Club = {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  members?: Array<{ id: string; name?: string; email?: string; role?: string }>;
};

type User = {
  id: string;
  name?: string;
  email?: string;
  role: 'admin' | 'president' | 'student';
  club_id?: number | null;
};

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ClubsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPresident = user?.role === 'president';

  const { data, isLoading, mutate } = useSWR<Club[]>(
    '/api/clubs?include=members',
    fetcher
  );
  const { data: users } = useSWR<User[]>(
    isAdmin ? '/api/users?limit=1000' : null,
    fetcher
  );

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (data || []).filter(c => c.name.toLowerCase().includes(s));
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Club | null>(null);
  const [form, setForm] = useState<Partial<Club>>({});
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<User[]>([]);
  const [pickedUserId, setPickedUserId] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  async function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '' });
    setMembers([]);
    setPickedUserId('');
    setOpen(true);
  }

  async function openEdit(c: Club) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '' });
    setOpen(true);
    if (!isAdmin) return;

    if (!c.members) {
      try {
        setLoadingMembers(true);
        const detail: Club = await fetcher(`/api/clubs/${c.id}`);
        const ms = (detail.members || []) as any[];
        const arr: User[] = ms.map(m => ({
          id: String(m.id || m.user_id || ''),
          name: m.name,
          email: m.email,
          role: m.role || 'student',
          club_id: c.id,
        }));
        setMembers(arr);
      } catch {
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    } else {
      const arr: User[] = (c.members || []).map((m: any) => ({
        id: String(m.id || m.user_id || ''),
        name: m.name,
        email: m.email,
        role: m.role || 'student',
        club_id: c.id,
      }));
      setMembers(arr);
    }
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm({});
    setSaving(false);
    setMembers([]);
    setPickedUserId('');
  }

  async function saveClub() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      if (!form.name || !form.name.trim()) {
        alert('กรุณากรอกชื่อชมรม');
        setSaving(false);
        return;
      }
      if (editing) {
        await api.put(`/api/clubs/${editing.id}`, {
          name: form.name,
          description: form.description || null,
        });
      } else {
        await api.post('/api/clubs', {
          name: form.name,
          description: form.description || null,
        });
      }
      await mutate();
      closeModal();
    } catch (e: any) {
      console.error('save club failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  }

  async function removeClub(c: Club) {
    if (!isAdmin) return;
    if (!confirm(`ลบชมรม "${c.name}" ?`)) return;
    try {
      await api.delete(`/api/clubs/${c.id}`);
      await mutate();
    } catch (e: any) {
      console.error('delete club failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  }

  const candidateUsers: User[] = useMemo(() => {
    if (!isAdmin) return [];
    const all = users || [];
    const currentIds = new Set(members.map(m => m.id));
    return all.filter(u => !currentIds.has(u.id));
  }, [users, members, isAdmin]);

  async function addMember() {
    if (!isAdmin || !editing || !pickedUserId) return;
    try {
      await api.post(`/api/clubs/${editing.id}/members`, { user_id: pickedUserId });
      const added = (users || []).find(u => u.id === pickedUserId);
      if (added) setMembers(prev => [...prev, added]);
      setPickedUserId('');
      await mutate();
    } catch (e: any) {
      console.error('add member failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'เพิ่มสมาชิกไม่สำเร็จ');
    }
  }

  async function removeMember(member: User) {
    if (!isAdmin || !editing) return;
    if (!confirm(`เอา ${member.name || member.email || 'ผู้ใช้'} ออกจากชมรมนี้ ?`)) return;
    try {
      await api.delete(`/api/clubs/${editing.id}/members/${member.id}`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      await mutate();
    } catch (e: any) {
      console.error('remove member failed:', e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || 'นำออกไม่สำเร็จ');
    }
  }

  const totalCount = filtered.length;

  return (
    <div className="min-h-screen bg-white md:bg-emerald-50/40 w-full">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-emerald-900">
                {isAdmin ? 'จัดการชมรม' : 'สมาชิกชมรมของฉัน'}
              </h1>
              <p className="mt-1 text-sm text-emerald-700/80">
                {isAdmin ? 'สร้างและจัดการชมรม รวมถึงสมาชิกและรายละเอียดต่างๆ' : 'ดูรายชื่อสมาชิกของชมรมที่คุณเป็นประธาน'}
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
              ทั้งหมด {totalCount} ชมรม
            </Badge>
          </div>
        </div>
      </div>

      {/* Toolbar + Table */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left tools */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center pt-10">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600/70" />
                  <Input
                    placeholder="ค้นหาชื่อชมรม…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 focus-visible:ring-emerald-500"
                  />
                </div>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[160px] focus:ring-emerald-500 focus:ring-2">
                    <SelectValue placeholder="แสดง 10 รายการ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 รายการ</SelectItem>
                    <SelectItem value="20">20 รายการ</SelectItem>
                    <SelectItem value="50">50 รายการ</SelectItem>
                    <SelectItem value="100">100 รายการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Right action */}
              {isAdmin && (
                <Button
                  onClick={openCreate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างชมรม
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-emerald-700">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
                กำลังโหลด…
              </div>
            ) : current.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-700" />
                </div>
                <p className="text-emerald-900 font-medium">ยังไม่มีข้อมูล</p>
                <p className="text-emerald-700/80 text-sm">ลองเปลี่ยนคำค้นหาหรือสร้างชมรมใหม่</p>
                {isAdmin && (
                  <div className="mt-4">
                    <Button
                      onClick={openCreate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างชมรมแรกของคุณ
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-y border-emerald-100 bg-emerald-50/60">
                      <th className="py-2.5 pr-3 pl-3 sm:pl-4 text-emerald-900 font-semibold">ชื่อชมรม</th>
                      <th className="py-2.5 pr-3 text-emerald-900 font-semibold">รายละเอียด</th>
                      <th className="py-2.5 pr-3 text-emerald-900 font-semibold">สมาชิก</th>
                      {isAdmin && (<th className="py-2.5 pr-3 text-right text-emerald-900 font-semibold">การจัดการ</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {current.map((c) => (
                      <tr key={c.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-2.5 pr-3 pl-3 sm:pl-4 font-medium text-emerald-900">{c.name}</td>
                        <td className="py-2.5 pr-3 text-emerald-900/80">{c.description || '-'}</td>
                        <td className="py-2.5 pr-3">
                          {Array.isArray(c.members) && c.members.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {c.members.slice(0, 5).map((m: any) => (
                                <Badge
                                  key={m.id}
                                  variant="secondary"
                                  className="bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                  {m.name || m.email || m.id}
                                </Badge>
                              ))}
                              {c.members.length > 5 && (
                                <span className="text-xs text-emerald-700">+{c.members.length - 5}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-emerald-700/70">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 pr-3 text-right">
                            <div className="inline-flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <Pencil className="h-4 w-4 mr-1" /> แก้ไข
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => removeClub(c)} className="border-red-200 text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4 mr-1" /> ลบ
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-emerald-700/80">
                    แสดง {current.length} จากทั้งหมด {filtered.length} รายการ
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      ก่อนหน้า
                    </Button>
                    <div className="text-sm text-emerald-900">
                      หน้า {page} / {totalPages}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      ถัดไป
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeModal())}>
        <DialogContent className="max-w-2xl border-emerald-200 bg-gradient-to-b from-white to-emerald-50">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'แก้ไขชมรม' : 'สร้างชมรม'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            จัดการชมรม สร้าง/แก้ไขข้อมูลชมรมและสมาชิก (แอดมินเท่านั้นที่สร้างและเพิ่มสมาชิกได้)
          </DialogDescription>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name" className="text-emerald-900">ชื่อชมรม</Label>
              <Input
                id="name"
                value={form.name || ''}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="focus-visible:ring-emerald-500"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-emerald-900">รายละเอียด</Label>
              <textarea
                id="description"
                className="w-full border rounded-md p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-emerald-500 border-emerald-200"
                value={form.description || ''}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            {/* Members (admin only) */}
            {isAdmin && editing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-emerald-900">สมาชิกในชมรม</Label>
                  {loadingMembers && <span className="text-xs text-emerald-700/80">กำลังโหลดสมาชิก…</span>}
                </div>

                {members.length === 0 ? (
                  <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
                    ยังไม่มีสมาชิกในชมรมนี้
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded px-2 py-1"
                      >
                        <span className="text-sm text-emerald-900">
                          {m.name || m.email || m.id}
                          {m.role ? <span className="text-xs text-emerald-700/80"> • {m.role}</span> : null}
                        </span>
                        <Button variant="destructive" onClick={() => removeMember(m)} size="sm">
                          นำออก
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select value={pickedUserId} onValueChange={setPickedUserId}>
                    <SelectTrigger className="w-full sm:w-80 focus:ring-emerald-500 focus:ring-2">
                      <SelectValue placeholder="เลือกผู้ใช้เพื่อเพิ่ม" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidateUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-emerald-700/80">ไม่มีผู้ใช้ที่สามารถเพิ่มได้</div>
                      ) : candidateUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email || u.id} {u.role !== 'student' ? `(${u.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={addMember}
                    disabled={!pickedUserId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    เพิ่มสมาชิก
                  </Button>
                </div>
                <p className="text-xs text-emerald-700/80">
                  * เฉพาะแอดมินเท่านั้นที่สร้างชมรมและเพิ่มผู้ใช้เข้าชมรมได้
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeModal} disabled={saving} className="border-emerald-300 text-emerald-800 hover:bg-emerald-50">
              ยกเลิก
            </Button>
            {isAdmin && (
              <Button onClick={saveClub} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Create (mobile) */}
      {isAdmin && (
        <Button
          onClick={openCreate}
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg sm:hidden"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
