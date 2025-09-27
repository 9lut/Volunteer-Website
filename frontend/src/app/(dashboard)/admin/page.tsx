'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  Shield,
  TrendingUp,
  UserPlus,
  FileText,
  Settings,
  Crown,
  Building,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

type AdminStats = {
  totalUsers: number;
  totalActivities: number;
  totalClubs: number;
  pendingActivities: number;
  approvedActivities: number;
  rejectedActivities: number;
  totalRegistrations: number;
  recentRegistrations: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  presidentUsers: number;
  studentUsers: number;
};

type RecentActivity = {
  id: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  club_name?: string;
  user_name?: string;
};

type RecentUser = {
  id: string;
  name?: string;
  email: string;
  role: 'admin' | 'president' | 'student';
  created_at: string;
  status?: 'active' | 'disabled';
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [statsRes, activitiesRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/activities?limit=10&sort=created_at:desc'),
        api.get('/api/users?limit=10&sort=created_at:desc')
      ]);

      setStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
      setRecentUsers(usersRes.data);
    } catch (error: any) {
      console.error('Failed to load admin dashboard:', error);
      toast.error('โหลดข้อมูลไม่สำเร็จ', 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 hover:from-emerald-200 hover:to-green-200 border-0 font-medium">อนุมัติแล้ว</Badge>;
      case 'pending':
        return <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 hover:from-amber-200 hover:to-yellow-200 border-0 font-medium">รออนุมัติ</Badge>;
      case 'rejected':
        return <Badge className="bg-gradient-to-r from-red-100 to-rose-100 text-red-800 hover:from-red-200 hover:to-rose-200 border-0 font-medium">ไม่อนุมัติ</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-0 font-medium">ไม่ทราบสถานะ</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 hover:from-red-200 hover:to-pink-200 border-0 font-medium">ผู้ดูแลระบบ</Badge>;
      case 'president':
        return <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 hover:from-blue-200 hover:to-indigo-200 border-0 font-medium">ประธานชมรม</Badge>;
      case 'student':
        return <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 hover:from-emerald-200 hover:to-teal-200 border-0 font-medium">นักเรียน</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-0 font-medium">ไม่ทราบบทบาท</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-8 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-24 w-24 rounded-full bg-white/5"></div>
          
          <div className="relative flex items-center space-x-4">
            <div className="flex-shrink-0 p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  ยินดีต้อนรับ ผู้ดูแลระบบ
                </h1>
                <Sparkles className="h-6 w-6 text-yellow-200" />
              </div>
              <p className="text-emerald-100 text-lg">
                {user?.name || user?.email?.split('@')[0]} • จัดการระบบอาสาสมัคร
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">กิจกรรมทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalActivities || 0}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">ชมรมทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalClubs || 0}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingActivities || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Activity Stats */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="flex items-center space-x-3 text-lg font-semibold text-gray-900">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200">
                  <Activity className="h-5 w-5 text-emerald-700" />
                </div>
                <span>สถิติกิจกรรม</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-700">อนุมัติแล้ว</span>
                </div>
                <span className="text-xl font-bold text-green-700">{stats?.approvedActivities || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-gray-700">รออนุมัติ</span>
                </div>
                <span className="text-xl font-bold text-amber-700">{stats?.pendingActivities || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-gray-700">ไม่อนุมัติ</span>
                </div>
                <span className="text-xl font-bold text-red-700">{stats?.rejectedActivities || 0}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">ผู้เข้าร่วมทั้งหมด</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{stats?.totalRegistrations || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="flex items-center space-x-3 text-lg font-semibold text-gray-900">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
                <span>สถิติผู้ใช้</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-gray-700">ผู้ดูแลระบบ</span>
                </div>
                <span className="text-xl font-bold text-red-700">{stats?.adminUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Crown className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-700">ประธานชมรม</span>
                </div>
                <span className="text-xl font-bold text-blue-700">{stats?.presidentUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-gray-700">นักเรียน</span>
                </div>
                <span className="text-xl font-bold text-emerald-700">{stats?.studentUsers || 0}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">ใช้งานอยู่</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats?.activeUsers || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900">การดำเนินการด่วน</h3>
            </div>
            <div className="p-6 space-y-3">
              <Button asChild className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 text-white font-medium">
                <Link href="/dashboard/activities/create">
                  <Calendar className="w-5 h-5 mr-3" />
                  เพิ่มกิจกรรมใหม่
                  <ArrowUpRight className="w-4 h-4 ml-auto" />
                </Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                <Link href="/admin/users">
                  <UserPlus className="w-5 h-5 mr-3" />
                  จัดการผู้ใช้
                  <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
                </Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                <Link href="/dashboard/approvals">
                  <ClipboardList className="w-5 h-5 mr-3" />
                  อนุมัติกิจกรรม ({stats?.pendingActivities || 0})
                  <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
                </Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                <Link href="/dashboard/activities">
                  <Eye className="w-5 h-5 mr-3" />
                  ดูกิจกรรมทั้งหมด
                  <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
                </Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                <Link href="/dashboard/reports">
                  <BarChart3 className="w-5 h-5 mr-3" />
                  รายงานและสถิติ
                  <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activities and Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Recent Activities */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="flex items-center space-x-3 text-lg font-semibold text-gray-900">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200">
                  <Calendar className="h-5 w-5 text-purple-700" />
                </div>
                <span>กิจกรรมล่าสุด</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">ยังไม่มีกิจกรรม</p>
                  </div>
                ) : (
                  recentActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="group p-4 rounded-xl bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-2 truncate">{activity.name}</h4>
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusBadge(activity.status)}
                            {activity.club_name && (
                              <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                                {activity.club_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.created_at).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                        <Button asChild size="sm" className="ml-4 rounded-lg bg-white hover:bg-gray-50 shadow-sm text-gray-600 opacity-60 group-hover:opacity-100 transition-all">
                          <Link href={`/dashboard/activities?id=${activity.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {recentActivities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                    <Link href="/dashboard/activities">
                      ดูกิจกรรมทั้งหมด
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="flex items-center space-x-3 text-lg font-semibold text-gray-900">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-100 to-teal-200">
                  <Users className="h-5 w-5 text-teal-700" />
                </div>
                <span>ผู้ใช้ใหม่ล่าสุด</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">ยังไม่มีผู้ใช้ใหม่</p>
                  </div>
                ) : (
                  recentUsers.slice(0, 5).map((newUser) => (
                    <div key={newUser.id} className="group p-4 rounded-xl bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 truncate">{newUser.name || 'ไม่ระบุชื่อ'}</h4>
                          <p className="text-sm text-gray-500 mb-2 truncate">{newUser.email}</p>
                          <div className="flex items-center space-x-2 mb-2">
                            {getRoleBadge(newUser.role)}
                            {newUser.status === 'disabled' && (
                              <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-0 font-medium">ปิดการใช้งาน</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(newUser.created_at).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                        <Button asChild size="sm" className="ml-4 rounded-lg bg-white hover:bg-gray-50 shadow-sm text-gray-600 opacity-60 group-hover:opacity-100 transition-all">
                          <Link href={`/admin/users?search=${newUser.email}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {recentUsers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Button asChild className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 font-medium border border-gray-200">
                    <Link href="/admin/users">
                      ดูผู้ใช้ทั้งหมด
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Health Warning */}
        {stats && stats.pendingActivities > 10 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-amber-200/20"></div>
            <div className="relative p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-2">ต้องการความสนใจ</h3>
                  <p className="text-amber-800 mb-4">
                    มีกิจกรรม <span className="font-bold">{stats.pendingActivities}</span> รายการที่รออนุมัติ กรุณาตรวจสอบและดำเนินการ
                  </p>
                  <Button asChild className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <Link href="/dashboard/approvals" className="inline-flex items-center">
                      ไปอนุมัติกิจกรรม
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}