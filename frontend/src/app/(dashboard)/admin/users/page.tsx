'use client';
import useSWR from 'swr';
import { api } from '@/lib/axios';
import { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, XCircle,
  MoreVertical, KeyRound, Power, PowerOff, Trash2, Plus, Upload, Download, Clipboard, Edit
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

type UserRow = {
  id: string;
  email: string;
  role: 'student' | 'president' | 'admin';
  name?: string | null;
  club?: string | null;          // ชื่อชมรม (ถ้ามี) - รูปแบบ "ชมรม A, ชมรม B"
  clubs?: Array<{id: number; name: string; role: string}>; // ข้อมูลชมรมแบบละเอียด
  status?: 'active' | 'disabled';// ออปชัน: ถ้า backend มีสถานะการใช้งาน
  created_at?: string;
};

type Club = { id: number; name: string };

const fetcher = (u: string) => api.get(u).then(r => r.data);

// helper: สุ่มรหัสผ่านชั่วคราว
const randomPassword = (len = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function AdminUsers() {
  const { data, isLoading, error, mutate } = useSWR<UserRow[]>('/api/users?limit=500', fetcher);
  const { data: clubList = [] } = useSWR<Club[]>('/api/clubs?limit=1000', fetcher);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRow['role'] | 'all'>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    email: string;
    role: UserRow['role'];
    password: string;
    autoPassword: boolean;
    active: boolean;
    clubIds: string[]; // เปลี่ยนเป็น array สำหรับเลือกหลายชมรม
  }>({
    name: '',
    email: '',
    role: 'student',
    password: randomPassword(),
    autoPassword: true,
    active: true,
    clubIds: [], // เปลี่ยนจาก clubId เป็น clubIds สำหรับเลือกหลายชมรม
  });

  // Reset password modal (show temp password returned)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [tempPassword, setTempPassword] = useState<string>('');

  // Import CSV modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Edit user modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: UserRow['role'];
    status: 'active' | 'disabled';
    clubIds: string[]; // สำหรับประธานชมรม สามารถเลือกได้หลายชมรม
  }>({
    name: '',
    email: '',
    role: 'student',
    status: 'active',
    clubIds: [],
  });

  const updateRole = async (id: string, role: UserRow['role']) => {
    try {
      setBusyId(id);
      
      if (role === 'president') {
        // สำหรับประธานชมรม ใช้ endpoint พิเศษ
        if (clubList.length === 0) {
          alert('ยังไม่มีชมรมในระบบ กรุณาสร้างชมรมก่อน');
          return;
        }

        // ถ้ามีชมรมเดียว แต่งตั้งเป็นประธานชมรมนั้นทันที
        if (clubList.length === 1) {
          await api.patch(`/api/users/${id}/role`, { 
            role: 'president',
            club_id: clubList[0].id 
          });
          await mutate();
        } else {
          // ถ้ามีหลายชมรม ให้เลือก
          const currentUser = data?.find(u => u.id === id);
          if (currentUser) {
            setEditUser({ ...currentUser, role: 'president' });
            setEditForm({
              name: currentUser.name || '',
              email: currentUser.email,
              role: 'president',
              status: currentUser.status || 'active',
              clubIds: [],
            });
            setEditOpen(true);
            return; // รอให้ผู้ใช้เลือกชมรมใน modal
          }
        }
      } else {
        // สำหรับบทบาทอื่นๆ อัปเดตทันที
        await api.patch(`/api/users/${id}/role`, { role });
        await mutate();
      }
    } catch (e: any) {
      console.error('Update role failed:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'เปลี่ยนบทบาทไม่สำเร็จ';
      alert(errorMessage);
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = async (user: UserRow) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
      status: user.status || 'active',
      clubIds: [], // จะโหลดจาก API
    });

    // โหลดข้อมูลชมรมของผู้ใช้ (สำหรับประธาน)
    if (user.role === 'president') {
      try {
        const response = await api.get(`/api/users/${user.id}/clubs`);
        setEditForm(prev => ({ ...prev, clubIds: response.data.map((c: any) => String(c.id)) }));
      } catch (error) {
        console.error('Error loading user clubs:', error);
      }
    }
    
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    if (!editForm.email.trim()) return alert('กรุณากรอกอีเมล');
    
    // ตรวจสอบว่าถ้าเป็นประธานต้องมีชมรม
    if (editForm.role === 'president' && editForm.clubIds.length === 0) {
      return alert('กรุณาเลือกชมรมอย่างน้อย 1 ชมรมสำหรับประธานชมรม');
    }
    
    try {
      setBusyId(editUser.id);
      
      const payload: any = {
        name: editForm.name || null,
        email: editForm.email,
        status: editForm.status,
      };

      // อัปเดตข้อมูลพื้นฐาน
      await api.patch(`/api/users/${editUser.id}`, payload);

      // จัดการบทบาทและชมรม
      if (editForm.role === 'president') {
        // ใช้ endpoint ที่มีอยู่แล้วสำหรับแต่งตั้งประธาน
        if (editForm.clubIds.length > 0) {
          const firstClubId = editForm.clubIds[0];
          if (firstClubId) {
            await api.patch(`/api/users/${editUser.id}/role`, { 
              role: 'president',
              club_id: firstClubId
            });
            
            // ถ้ามีชมรมเพิ่มเติม ให้เพิ่มต่อ
            if (editForm.clubIds.length > 1) {
              await api.patch(`/api/users/${editUser.id}/clubs`, {
                club_ids: editForm.clubIds
              });
            }
          }
        } else {
          // ถ้าไม่มีชมรม ให้แต่งตั้งเป็นประธานก่อน
          await api.patch(`/api/users/${editUser.id}/role`, { role: 'president' });
        }
      } else {
        // บทบาทอื่นๆ หรือเปลี่ยนจากประธานเป็นบทบาทอื่น
        await api.patch(`/api/users/${editUser.id}/role`, { role: editForm.role });
      }

      setEditOpen(false);
      setEditUser(null);
      await mutate();
      
    } catch (e: any) {
      console.error('Edit user failed:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'แก้ไขผู้ใช้ไม่สำเร็จ';
      alert(errorMessage);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (u: UserRow) => {
    try {
      setBusyId(u.id);
      const next = u.status === 'disabled' ? 'active' : 'disabled';
      await api.patch(`/api/users/${u.id}/status`, { status: next });
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`ลบผู้ใช้ ${u.email}?`)) return;
    try {
      setBusyId(u.id);
      await api.delete(`/api/users/${u.id}`);
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const openReset = async (u: UserRow) => {
    try {
      setBusyId(u.id);
      const { data } = await api.post(`/api/users/${u.id}/reset-password`); // คาดหวัง { tempPassword }
      setTempPassword(data?.tempPassword || '');
      setResetUser(u);
      setResetOpen(true);
    } finally {
      setBusyId(null);
    }
  };

  const submitCreate = async () => {
    if (!createForm.email.trim()) return alert('กรุณากรอกอีเมล');
    if (!createForm.autoPassword && !createForm.password.trim()) return alert('กรุณากรอกรหัสผ่าน');
    if (createForm.role === 'president' && createForm.clubIds.length === 0) {
      return alert('กรุณาเลือกชมรมอย่างน้อย 1 ชมรมสำหรับประธานชมรม');
    }
    try {
      setCreateSaving(true);
      const payload: any = {
        name: createForm.name || null,
        email: createForm.email,
        role: createForm.role,
        password: createForm.autoPassword ? createForm.password : createForm.password || undefined,
        status: createForm.active ? 'active' : 'disabled',
        club_ids: createForm.clubIds,
      };
      await api.post('/api/users', payload);
      setCreateOpen(false);
      setCreateSaving(false);
      setCreateForm({
        name: '',
        email: '',
        role: 'student',
        password: randomPassword(),
        autoPassword: true,
        active: true,
        clubIds: [],
      });
      await mutate();
    } catch (e: any) {
      setCreateSaving(false);
      console.error('create user failed:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'สร้างผู้ใช้ไม่สำเร็จ';
      alert(errorMessage);
    }
  };

  const exportCsv = () => {
    const rows = filteredData.map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      role: u.role,
      club: u.club || '',
      status: u.status || '',
      created_at: u.created_at || '',
    }));

    const csv = [
      ['id', 'name', 'email', 'role', 'club', 'status', 'created_at'].join(','),
      ...rows.map(r =>
        [r.id, r.name, r.email, r.role, r.club, r.status, r.created_at]
          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitImport = async () => {
    if (!importFile) return alert('โปรดเลือกไฟล์ CSV');
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      await api.post('/api/users/import', fd); // ต้องมี endpoint รองรับ
      await mutate();
      setImportOpen(false);
      setImportFile(null);
    } catch (e: any) {
      console.error('import users failed:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'นำเข้าไม่สำเร็จ';
      alert(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // Filter + search
  const filteredData = useMemo(() => {
    if (!data) return [];
    const s = searchTerm.toLowerCase().trim();
    return data.filter(u => {
      const matchesRole = selectedRole === 'all' || u.role === selectedRole;
      const matchesClub = selectedClub === 'all' || u.club === selectedClub;
      const matchesSearch =
        !s ||
        u.email.toLowerCase().includes(s) ||
        (u.name?.toLowerCase().includes(s) ?? false);
      return matchesRole && matchesClub && matchesSearch;
    });
  }, [data, selectedRole, selectedClub, searchTerm]);

  // uniq clubs (จากรายชื่อผู้ใช้ที่มีอยู่)
  const clubs = useMemo(() => {
    if (!data) return [];
    const uniq = [...new Set(data.map(u => u.club).filter(Boolean))] as string[];
    return uniq.sort();
  }, [data]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedClub, searchTerm, itemsPerPage]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'president':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50/40">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          <p className="text-emerald-800">กำลังโหลดข้อมูล…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50/40">
        <div className="text-center p-6 border border-red-200 rounded-xl bg-red-50">
          <div className="text-red-500 text-3xl mb-2">⚠️</div>
          <h2 className="text-lg font-semibold text-red-700">เกิดข้อผิดพลาด</h2>
          <p className="text-red-600/80">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-emerald-50/40 w-full p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <Users className="h-8 w-8 text-emerald-700" />
              <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900">จัดการผู้ใช้</h1>
            </div>
            <p className="text-emerald-700/80">จัดการบทบาทและข้อมูลผู้ใช้ในระบบ</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} className="border-emerald-300 text-emerald-800 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> ส่งออก CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="border-emerald-300 text-emerald-800 hover:bg-emerald-50">
              <Upload className="h-4 w-4 mr-2" /> นำเข้า CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> สร้างผู้ใช้
            </Button>
          </div>
        </div>

        {/* Sticky Filters */}
        <div className="sticky top-0 z-30">
          <div className="rounded-2xl border border-emerald-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 shadow-sm">
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อหรืออีเมล…"
                    className="pl-9 h-11 rounded-xl border-emerald-300 focus-visible:ring-emerald-500"
                    aria-label="ค้นหาผู้ใช้"
                  />
                  {searchTerm.trim() && (
                    <Button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-emerald-50 transition"
                      aria-label="ล้างคำค้นหา"
                    >
                      <XCircle className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                </div>

                {/* Role */}
                <div className="relative">
                  <Select
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as UserRow['role'] | 'all')}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                      <SelectValue placeholder="บทบาททั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                      <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                      <SelectItem value="president">ประธานชมรม</SelectItem>
                      <SelectItem value="student">นักเรียน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Club */}
                <div className="relative">
                  <Select value={selectedClub} onValueChange={setSelectedClub}>
                    <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <Filter className="h-4 w-4 text-emerald-600" />
                        <SelectValue placeholder="ชมรมทั้งหมด" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ชมรมทั้งหมด</SelectItem>
                      {clubs.map((club) => (
                        <SelectItem key={club} value={club}>
                          {club}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items per page */}
                <div className="relative">
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => setItemsPerPage(Number(v))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-emerald-300 focus:ring-emerald-500">
                      <SelectValue placeholder="จำนวนต่อหน้า" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">แสดง 10 รายการ</SelectItem>
                      <SelectItem value="20">แสดง 20 รายการ</SelectItem>
                      <SelectItem value="50">แสดง 50 รายการ</SelectItem>
                      <SelectItem value="100">แสดง 100 รายการ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile actions */}
                <div className="flex sm:hidden items-stretch gap-2">
                  <Button variant="outline" onClick={exportCsv} className="flex-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                    <Download className="h-4 w-4 mr-1.5" /> CSV
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)} className="flex-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                    <Upload className="h-4 w-4 mr-1.5" /> นำเข้า
                  </Button>
                  <Button onClick={() => setCreateOpen(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> สร้าง
                  </Button>
                </div>
              </div>

              {/* Active filter chips + summary */}
              <div className="mt-3 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-emerald-800">
                  พบ {filteredData.length} รายการจากทั้งหมด {data?.length || 0} ผู้ใช้
                </p>
                <div className="hidden sm:flex flex-wrap items-center gap-2">
                  {selectedRole !== 'all' && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                      บทบาท: {selectedRole === 'admin' ? 'ผู้ดูแลระบบ' : selectedRole === 'president' ? 'ประธานชมรม' : 'นักเรียน'}
                    </span>
                  )}
                  {selectedClub !== 'all' && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                      ชมรม: {selectedClub}
                    </span>
                  )}
                  {(selectedRole !== 'all' || selectedClub !== 'all' || searchTerm) && (
                    <Button
                      onClick={() => {
                        setSelectedRole('all');
                        setSelectedClub('all');
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="text-sm text-emerald-700 hover:text-emerald-900 underline"
                    >
                      ล้างตัวกรอง
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom accent */}
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mt-4">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-emerald-50/70 border-b border-emerald-100">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-emerald-900">ผู้ใช้</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-emerald-900">ชมรม</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-emerald-900">บทบาท</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-emerald-900">สถานะ</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-emerald-900">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {paginatedData.map((user) => (
                  <tr key={user.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-emerald-900">{user.name || 'ไม่ระบุชื่อ'}</p>
                        <p className="text-sm text-emerald-700/80">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {user.role === 'president' ? (
                        <div className="space-y-1">
                          {/* แสดงจาก clubs array ถ้ามี */}
                          {user.clubs && user.clubs.length > 0 ? (
                            user.clubs.map((club, index) => (
                              <span 
                                key={club.id}
                                className="inline-block px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200 mr-1 mb-1"
                              >
                                {club.name}
                              </span>
                            ))
                          ) : user.club ? (
                            /* แสดงจาก club string ถ้ามี */
                            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
                              {user.club}
                            </span>
                          ) : (
                            <span className="text-sm text-orange-600">ยังไม่ได้กำหนดชมรม</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        {user.role === 'admin' && 'ผู้ดูแลระบบ'}
                        {user.role === 'president' && 'ประธานชมรม'}
                        {user.role === 'student' && 'นักเรียน'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
                        user.status === 'disabled'
                          ? 'bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {user.status === 'disabled' ? 'ปิดการใช้งาน' : 'ใช้งานอยู่'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* เปลี่ยนบทบาท */}
                        <div className="relative w-44">
                          <Select
                            value={user.role}
                            onValueChange={(v) => updateRole(user.id, v as UserRow['role'])}
                          >
                            <SelectTrigger
                              className="w-full h-9 rounded-md border-emerald-300 focus:ring-emerald-500 pr-8"
                              disabled={busyId === user.id}
                            >
                              <SelectValue />
                              <ChevronDown className="ml-auto h-4 w-4 text-emerald-600" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">นักเรียน</SelectItem>
                              <SelectItem value="president">ประธานชมรม</SelectItem>
                              <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* เมนูอื่น ๆ */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 w-9 p-0 border-emerald-300 hover:bg-emerald-50">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" /> แก้ไขข้อมูล
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openReset(user)}>
                              <KeyRound className="h-4 w-4 mr-2" /> รีเซ็ตรหัสผ่าน
                            </DropdownMenuItem>
                            {user.status === 'disabled' ? (
                              <DropdownMenuItem onClick={() => toggleActive(user)}>
                                <Power className="h-4 w-4 mr-2" /> เปิดการใช้งาน
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleActive(user)}>
                                <PowerOff className="h-4 w-4 mr-2" /> ปิดการใช้งาน
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={() => deleteUser(user)}>
                              <Trash2 className="h-4 w-4 mr-2" /> ลบผู้ใช้
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden">
            {paginatedData.map((user) => (
              <div key={user.id} className="border-b border-emerald-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-emerald-900">{user.name || 'ไม่ระบุชื่อ'}</h3>
                    <p className="text-sm text-emerald-700/80 mt-1">{user.email}</p>
                    
                    {/* แสดงชมรมสำหรับประธาน */}
                    {user.role === 'president' && (
                      <div className="mt-2">
                        <p className="text-xs text-emerald-700/70 mb-1">ประธานชมรม:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.clubs && user.clubs.length > 0 ? (
                            user.clubs.map((club) => (
                              <span 
                                key={club.id}
                                className="inline-block px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200"
                              >
                                {club.name}
                              </span>
                            ))
                          ) : user.club ? (
                            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
                              {user.club}
                            </span>
                          ) : (
                            <span className="text-xs text-orange-600">ยังไม่ได้กำหนดชมรม</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
                        user.status === 'disabled'
                          ? 'bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {user.status === 'disabled' ? 'ปิดการใช้งาน' : 'ใช้งานอยู่'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 w-9 p-0 border-emerald-300 hover:bg-emerald-50">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem onClick={() => openEdit(user)}>
                        <Edit className="h-4 w-4 mr-2" /> แก้ไขข้อมูล
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openReset(user)}>
                        <KeyRound className="h-4 w-4 mr-2" /> รีเซ็ตรหัสผ่าน
                      </DropdownMenuItem>
                      {user.status === 'disabled' ? (
                        <DropdownMenuItem onClick={() => toggleActive(user)}>
                          <Power className="h-4 w-4 mr-2" /> เปิดการใช้งาน
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleActive(user)}>
                          <PowerOff className="h-4 w-4 mr-2" /> ปิดการใช้งาน
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-rose-600" onClick={() => deleteUser(user)}>
                        <Trash2 className="h-4 w-4 mr-2" /> ลบผู้ใช้
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="relative">
                  <Select
                    value={user.role}
                    onValueChange={(v) => updateRole(user.id, v as UserRow['role'])}
                  >
                    <SelectTrigger
                      className="w-full h-10 rounded-md border-emerald-300 focus:ring-emerald-500"
                      disabled={busyId === user.id}
                    >
                      <SelectValue placeholder="เปลี่ยนบทบาท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">เปลี่ยนเป็น นักเรียน</SelectItem>
                      <SelectItem value="president">เปลี่ยนเป็น ประธานชมรม</SelectItem>
                      <SelectItem value="admin">เปลี่ยนเป็น ผู้ดูแลระบบ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {paginatedData.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-emerald-900 mb-1.5">ไม่พบผู้ใช้</h3>
              <p className="text-emerald-700/80">
                {searchTerm || selectedRole !== 'all' || selectedClub !== 'all'
                  ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหา'
                  : 'ยังไม่มีผู้ใช้ในระบบ'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-emerald-900">
                แสดง {filteredData.length === 0 ? 0 : startIndex + 1}-
                {Math.min(startIndex + itemsPerPage, filteredData.length)} จาก {filteredData.length} รายการ
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 h-9 text-sm border border-emerald-300 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const base = Math.max(1, currentPage - 2);
                    const pageNum = base + i;
                    if (pageNum > totalPages) return null;
                    const active = currentPage === pageNum;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 text-sm rounded-md ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : 'border border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 h-9 text-sm border border-emerald-300 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                >
                  ถัดไป <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">สร้างผู้ใช้ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลผู้ใช้และกำหนดบทบาท/ชมรม</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">ชื่อ (ไม่บังคับ)</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm(s => ({ ...s, name: e.target.value }))}
                className="rounded-xl focus-visible:ring-emerald-500"
              />
            </div>
            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(s => ({ ...s, email: e.target.value }))}
                className="rounded-xl focus-visible:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>บทบาท</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm(s => ({ ...s, role: v as UserRow['role'], clubIds: v !== 'president' ? [] : s.clubIds }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">นักเรียน</SelectItem>
                    <SelectItem value="president">ประธานชมรม</SelectItem>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>สถานะ</Label>
                <Select value={createForm.active ? 'active' : 'disabled'} onValueChange={(v) => setCreateForm(s => ({ ...s, active: v === 'active' }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งานอยู่</SelectItem>
                    <SelectItem value="disabled">ปิดการใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createForm.role === 'president' && (
              <div>
                <Label>ชมรมที่เป็นประธาน (เลือกได้หลายชมรม)</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-emerald-200 rounded-xl p-3">
                  {clubList.map(club => (
                    <div key={club.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`create-club-${club.id}`}
                        checked={createForm.clubIds.includes(String(club.id))}
                        onChange={(e) => {
                          const clubId = String(club.id);
                          if (e.target.checked) {
                            setCreateForm(s => ({ ...s, clubIds: [...s.clubIds, clubId] }));
                          } else {
                            setCreateForm(s => ({ ...s, clubIds: s.clubIds.filter(id => id !== clubId) }));
                          }
                        }}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor={`create-club-${club.id}`} className="text-sm text-emerald-900 cursor-pointer">
                        {club.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-700/80 mt-1">
                  เลือกชมรมที่ผู้ใช้นี้จะเป็นประธาน (ต้องเลือกอย่างน้อย 1 ชมรม)
                </p>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-emerald-200/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="mb-0">รหัสผ่านเริ่มต้น</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700/80">สุ่มอัตโนมัติ</span>
                  <Switch
                    checked={createForm.autoPassword}
                    onCheckedChange={(v) =>
                      setCreateForm(s => ({
                        ...s,
                        autoPassword: v,
                        password: v ? (s.password || randomPassword()) : s.password
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={createForm.password}
                  disabled={createForm.autoPassword}
                  onChange={(e) => setCreateForm(s => ({ ...s, password: e.target.value }))}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateForm(s => ({ ...s, password: randomPassword() }))}
                  className="border-emerald-300"
                >
                  สุ่ม
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(createForm.password); }}
                  className="border-emerald-300"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-emerald-700/80">* สามารถส่งรหัสนี้ให้ผู้ใช้เข้าระบบครั้งแรก</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 p-3">
              <div>
                <p className="text-sm font-medium text-emerald-900">สถานะการใช้งาน</p>
                <p className="text-xs text-emerald-700/80">ปิดการใช้งานจะล็อกผู้ใช้ออกจากระบบ</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{createForm.active ? 'ใช้งานอยู่' : 'ปิดการใช้งาน'}</span>
                <Switch checked={createForm.active} onCheckedChange={(v) => setCreateForm(s => ({ ...s, active: v }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSaving} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button onClick={submitCreate} disabled={createSaving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {createSaving ? 'กำลังสร้าง…' : 'สร้างผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              รหัสผ่านชั่วคราวสำหรับ <span className="font-medium">{resetUser?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-emerald-200/60 p-3 bg-emerald-50/40">
            <code className="text-emerald-900 font-semibold">{tempPassword || '—'}</code>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => { if (tempPassword) navigator.clipboard.writeText(tempPassword); }}
              className="border-emerald-300"
            >
              คัดลอก
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">นำเข้าผู้ใช้จาก CSV</DialogTitle>
            <DialogDescription>รองรับคอลัมน์: <code>name, email, role, club_id, status</code></DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-emerald-700/80">
              * ต้องมี endpoint <code>POST /api/users/import</code> ฝั่ง backend เพื่อประมวลผลไฟล์
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button onClick={submitImport} disabled={importing || !importFile} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {importing ? 'กำลังนำเข้า…' : 'นำเข้า'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลและกำหนดบทบาท/ชมรม</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="edit-name">ชื่อ</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))}
                className="rounded-xl focus-visible:ring-emerald-500"
                placeholder="ระบุชื่อของผู้ใช้"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">อีเมล</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(s => ({ ...s, email: e.target.value }))}
                className="rounded-xl focus-visible:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>บทบาท</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(s => ({ ...s, role: v as UserRow['role'], clubIds: v !== 'president' ? [] : s.clubIds }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">นักเรียน</SelectItem>
                    <SelectItem value="president">ประธานชมรม</SelectItem>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>สถานะ</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(s => ({ ...s, status: v as 'active' | 'disabled' }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งานอยู่</SelectItem>
                    <SelectItem value="disabled">ปิดการใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editForm.role === 'president' && (
              <div>
                <Label>ชมรมที่เป็นประธาน (เลือกได้หลายชมรม)</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-emerald-200 rounded-xl p-3">
                  {clubList.map(club => (
                    <div key={club.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`club-${club.id}`}
                        checked={editForm.clubIds.includes(String(club.id))}
                        onChange={(e) => {
                          const clubId = String(club.id);
                          if (e.target.checked) {
                            setEditForm(s => ({ ...s, clubIds: [...s.clubIds, clubId] }));
                          } else {
                            setEditForm(s => ({ ...s, clubIds: s.clubIds.filter(id => id !== clubId) }));
                          }
                        }}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor={`club-${club.id}`} className="text-sm text-emerald-900 cursor-pointer">
                        {club.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-700/80 mt-1">
                  เลือกชมรมที่ผู้ใช้นี้จะเป็นประธาน (สามารถเลือกได้หลายชมรม)
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busyId === editUser?.id} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button onClick={submitEdit} disabled={busyId === editUser?.id} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {busyId === editUser?.id ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
