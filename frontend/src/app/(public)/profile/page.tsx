'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { User, Mail, Edit2, Save, X, History, Activity, Crown, UserCheck, Users, Key, Lock } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  role: 'student' | 'president' | 'admin';
  created_at?: string;
  status?: 'active' | 'disabled';
  student_id?: string | null;
  faculty?: string | null;
  major?: string | null;
  birth_date?: string | null;
  year_level?: number | null;
  phone?: string | null;
}

export default function ProfilePage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Local user data state
  const [userData, setUserData] = useState<ProfileData | null>(null);
  
  // Edit profile state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: '',
    faculty: '',
    major: '',
    birth_date: '',
    year_level: '',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Load user data
  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditForm({ 
        name: user.name || '',
        faculty: user.faculty || '',
        major: user.major || '',
        birth_date: user.birth_date || '',
        year_level: user.year_level?.toString() || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Handle edit profile
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const response = await api.patch('/api/users/me', {
        name: editForm.name.trim() || null,
        faculty: editForm.faculty.trim() || null,
        major: editForm.major.trim() || null,
        birth_date: editForm.birth_date || null,
        year_level: editForm.year_level ? parseInt(editForm.year_level) : null,
        phone: editForm.phone.trim() || null,
      });
      
      // อัปเดต local state
      setUserData(response.data);
      setIsEditMode(false);
      toast.success('บันทึกข้อมูลสำเร็จ');
      
      // Reload session to update user data
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditForm({ 
      name: userData?.name || '',
      faculty: userData?.faculty || '',
      major: userData?.major || '',
      birth_date: userData?.birth_date || '',
      year_level: userData?.year_level?.toString() || '',
      phone: userData?.phone || '',
    });
    setIsEditMode(false);
  };
  
  // Handle change password
  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      await api.patch('/api/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
      setPasswordDialogOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setIsChangingPassword(false);
    }
  };


  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'president':
        return <UserCheck className="w-4 h-4" />;
      case 'student':
        return <Users className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow-lg shadow-rose-200/50';
      case 'president':
        return 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white shadow-lg shadow-blue-200/50';
      case 'student':
        return 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-200/50';
      default:
        return 'bg-gradient-to-r from-gray-400 to-slate-400 text-white shadow-lg shadow-gray-200/50';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'president':
        return 'ประธานชมรม';
      case 'student':
        return 'นักเรียน';
      default:
        return role;
    }
  };


  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-pulse bg-white/70 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-200 to-cyan-200 rounded-full" />
              <div className="space-y-3 flex-1">
                <div className="h-6 w-3/4 bg-gradient-to-r from-violet-200 to-cyan-200 rounded-full" />
                <div className="h-4 w-1/2 bg-gradient-to-r from-cyan-200 to-emerald-200 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/70 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-400 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">กรุณาเข้าสู่ระบบ</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถดูโปรไฟล์ได้</p>
            <Button asChild className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-xl">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700green to-green-800 pb-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 via-green-700/90 to-green-800/90"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-emerald-300/30 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              โปรไฟล์ของฉัน
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg sm:text-xl text-white/90 leading-relaxed">
              สามารถดูข้อมูลบัญชีได้อย่างง่ายดาย
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Profile Card */}
          <Card className="mb-8 overflow-hidden shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl">
            <CardHeader className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-cyan-500/5 p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-4 text-2xl sm:text-3xl font-bold text-gray-800">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  ข้อมูลส่วนตัว
                </CardTitle>
                <div className="flex gap-2">
                  {!isEditMode ? (
                    <>
                      <Button
                        onClick={() => setIsEditMode(true)}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg rounded-xl"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        แก้ไขข้อมูล
                      </Button>
                      <Button
                        onClick={() => setPasswordDialogOpen(true)}
                        variant="outline"
                        className="border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        เปลี่ยนรหัสผ่าน
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg rounded-xl"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                      >
                        <X className="w-4 h-4 mr-2" />
                        ยกเลิก
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 sm:p-12">
              <div className="space-y-12">
                {/* Profile Picture & Basic Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8">
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-violet-400 via-purple-400 to-cyan-400 rounded-3xl flex items-center justify-center shadow-2xl">
                      <User className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center shadow-lg">
                      <UserCheck className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                      {user.name || 'ยังไม่ได้ตั้งชื่อ'}
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium">{user.email}</span>
                      </div>
                    </div>
                    <div className="flex justify-center sm:justify-start">
                      <Badge className={`${getRoleBadgeColor(user.role)} font-bold text-lg px-6 py-3 rounded-2xl`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-2">{getRoleDisplayName(user.role)}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-violet-600 mb-3 uppercase tracking-wide">
                      ชื่อ-นามสกุล
                    </label>
                    {isEditMode ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="ระบุชื่อ-นามสกุล"
                        className="text-xl font-bold border-violet-300 focus-visible:ring-violet-500"
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-2xl text-gray-800 font-bold">{userData?.name || 'ยังไม่ได้ตั้งชื่อ'}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50/50 to-emerald-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-cyan-600 mb-3 uppercase tracking-wide">
                      รหัสนักศึกษา
                    </label>
                    <p className="text-xl text-gray-800 font-semibold">{userData?.student_id || 'ไม่ได้ระบุ'}</p>
                    {!userData?.student_id && <p className="text-xs text-gray-500 mt-1">ไม่สามารถแก้ไขได้</p>}
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50/50 to-emerald-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-cyan-600 mb-3 uppercase tracking-wide">
                      อีเมล
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-cyan-600" />
                      </div>
                      <p className="text-xl text-gray-800 font-semibold">{user.email}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-emerald-600 mb-4 uppercase tracking-wide">
                      บทบาท
                    </label>
                    <Badge className={`${getRoleBadgeColor(user.role)} font-bold text-xl px-6 py-3 rounded-2xl`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-2">{getRoleDisplayName(user.role)}</span>
                    </Badge>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-amber-600 mb-3 uppercase tracking-wide">
                      คณะ
                    </label>
                    {isEditMode ? (
                      <Input
                        value={editForm.faculty}
                        onChange={(e) => setEditForm(prev => ({ ...prev, faculty: e.target.value }))}
                        placeholder="ระบุคณะ"
                        className="text-lg font-medium border-amber-300 focus-visible:ring-amber-500"
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-xl text-gray-800 font-semibold">{userData?.faculty || 'ยังไม่ได้ระบุ'}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-pink-50/50 to-rose-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-pink-600 mb-3 uppercase tracking-wide">
                      สาขา
                    </label>
                    {isEditMode ? (
                      <Input
                        value={editForm.major}
                        onChange={(e) => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                        placeholder="ระบุสาขา"
                        className="text-lg font-medium border-pink-300 focus-visible:ring-pink-500"
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-xl text-gray-800 font-semibold">{userData?.major || 'ยังไม่ได้ระบุ'}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-blue-600 mb-3 uppercase tracking-wide">
                      วันเกิด
                    </label>
                    {isEditMode ? (
                      <Input
                        type="date"
                        value={editForm.birth_date}
                        onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                        className="text-lg font-medium border-blue-300 focus-visible:ring-blue-500"
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-xl text-gray-800 font-semibold">
                        {userData?.birth_date ? new Date(userData.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่ได้ระบุ'}
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-green-600 mb-3 uppercase tracking-wide">
                      ชั้นปี
                    </label>
                    {isEditMode ? (
                      <select
                        value={editForm.year_level}
                        onChange={(e) => setEditForm(prev => ({ ...prev, year_level: e.target.value }))}
                        className="w-full rounded-xl border border-green-300 px-3 py-2 text-lg font-medium focus:ring-2 focus:ring-green-500"
                        disabled={isSaving}
                      >
                        <option value="">เลือกชั้นปี</option>
                        <option value="1">ปี 1</option>
                        <option value="2">ปี 2</option>
                        <option value="3">ปี 3</option>
                        <option value="4">ปี 4</option>
                        <option value="5">ปี 5</option>
                        <option value="6">ปี 6</option>
                      </select>
                    ) : (
                      <p className="text-xl text-gray-800 font-semibold">{userData?.year_level ? `ปี ${userData.year_level}` : 'ยังไม่ได้ระบุ'}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-purple-50/50 to-fuchsia-50/50 rounded-3xl p-8 shadow-lg">
                    <label className="block text-sm font-bold text-purple-600 mb-3 uppercase tracking-wide">
                      เบอร์โทรศัพท์
                    </label>
                    {isEditMode ? (
                      <Input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="0812345678"
                        className="text-lg font-medium border-purple-300 focus-visible:ring-purple-500"
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-xl text-gray-800 font-semibold">{userData?.phone || 'ยังไม่ได้ระบุ'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Change Password Dialog */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Lock className="w-5 h-5" />
                  เปลี่ยนรหัสผ่าน
                </DialogTitle>
                <DialogDescription>
                  กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    className="mt-1"
                    disabled={isChangingPassword}
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    className="mt-1"
                    disabled={isChangingPassword}
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className="mt-1"
                    disabled={isChangingPassword}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  disabled={isChangingPassword}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                >
                  {isChangingPassword ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-12">
            {/* Navigation Actions */}
            <Card className="shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden group hover:shadow-3xl transition-all duration-500">
              <CardHeader className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8">
                <CardTitle className="flex items-center gap-4 text-2xl font-bold text-gray-800">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  การดำเนินการด่วน
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <Button asChild className="w-full justify-start h-16 bg-gradient-to-r from-white/90 to-emerald-50/90 hover:from-emerald-50 hover:to-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl group/btn">
                    <Link href="/history" className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center group-hover/btn:scale-110 transition-transform duration-300">
                        <History className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-lg text-gray-800">ประวัติการสมัครกิจกรรม</div>
                        <div className="text-sm text-gray-600 mt-1">ดูประวัติและสถานะการสมัครทั้งหมด</div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}