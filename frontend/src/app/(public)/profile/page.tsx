'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Edit2, Save, X, Calendar, MapPin, Settings, History, Activity, Crown, UserCheck, Users } from 'lucide-react';
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
}

export default function ProfilePage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ name: string }>({ name: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Initialize edit data when user data loads
  useEffect(() => {
    if (user) {
      setEditData({ name: user.name || '' });
    }
  }, [user]);

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
        return 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200';
      case 'president':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200';
      case 'student':
        return 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200';
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

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await api.patch('/api/users/me', {
        name: editData.name.trim()
      });
      
      console.log('Profile updated:', response.data);
      toast.success('อัปเดตโปรไฟล์เรียบร้อยแล้ว');
      
      // Force a page refresh to update the user data
      setTimeout(() => window.location.reload(), 1000);
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const message = error?.response?.data?.message || 'ไม่สามารถอัปเดตโปรไฟล์ได้';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({ name: user?.name || '' });
    setIsEditing(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md animate-pulse">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">กรุณาเข้าสู่ระบบ</h3>
            <p className="text-gray-500 mb-6">คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถดูโปรไฟล์ได้</p>
            <Button asChild className="w-full">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-blue-600 pb-32">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              โปรไฟล์ของฉัน
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-emerald-100">
              จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Profile Card */}
          <Card className="mb-8 overflow-hidden shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  ข้อมูลส่วนตัว
                </CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-white/50 hover:bg-white/80 border-emerald-200 hover:border-emerald-300"
                  >
                    <Edit2 className="w-4 h-4" />
                    แก้ไข
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Profile Picture & Basic Info */}
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {user.name || 'ยังไม่ได้ตั้งชื่อ'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-600">{user.email}</p>
                    </div>
                    <div className="mt-3">
                      <Badge className={`${getRoleBadgeColor(user.role)} font-medium`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{getRoleDisplayName(user.role)}</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl p-6 border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชื่อ-นามสกุล
                      </label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                        placeholder="กรุณาใส่ชื่อ-นามสกุล"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                      >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Profile Display */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-500">
                        ชื่อ-นามสกุล
                      </label>
                      <p className="text-lg text-gray-900 font-medium">{user.name || 'ยังไม่ได้ตั้งชื่อ'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-500">
                        อีเมล
                      </label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-lg text-gray-900">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-500">
                        บทบาท
                      </label>
                      <Badge className={`${getRoleBadgeColor(user.role)} font-medium text-base px-3 py-1`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{getRoleDisplayName(user.role)}</span>
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-500">
                        สถานะบัญชี
                      </label>
                      <Badge className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200 font-medium text-base px-3 py-1">
                        <UserCheck className="w-3 h-3 mr-1" />
                        ใช้งานได้
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Navigation Actions */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  การดำเนินการด่วน
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start h-12 bg-white/50 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300">
                    <Link href="/history" className="flex items-center gap-3">
                      <History className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <div className="font-medium">ประวัติการสมัครกิจกรรม</div>
                        <div className="text-xs text-gray-500">ดูประวัติและสถานะการสมัคร</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full justify-start h-12 bg-white/50 hover:bg-blue-50 border-blue-200 hover:border-blue-300">
                    <Link href="/activities" className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">สำรวจกิจกรรม</div>
                        <div className="text-xs text-gray-500">ค้นหาและสมัครกิจกรรมใหม่</div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Role-based Actions */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="w-5 h-5 text-purple-600" />
                  จัดการระบบ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {user.role === 'admin' && (
                    <Button asChild variant="outline" className="w-full justify-start h-12 bg-white/50 hover:bg-red-50 border-red-200 hover:border-red-300">
                      <Link href="/dashboard/admin" className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <div className="font-medium">แผงควบคุมผู้ดูแล</div>
                          <div className="text-xs text-gray-500">จัดการผู้ใช้และระบบ</div>
                        </div>
                      </Link>
                    </Button>
                  )}

                  {user.role === 'president' && (
                    <Button asChild variant="outline" className="w-full justify-start h-12 bg-white/50 hover:bg-blue-50 border-blue-200 hover:border-blue-300">
                      <Link href="/dashboard/president" className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                          <div className="font-medium">แผงควบคุมประธาน</div>
                          <div className="text-xs text-gray-500">จัดการชมรมและกิจกรรม</div>
                        </div>
                      </Link>
                    </Button>
                  )}

                  {user.role === 'student' && (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">ไม่มีสิทธิ์เข้าถึงแผงควบคุม</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
