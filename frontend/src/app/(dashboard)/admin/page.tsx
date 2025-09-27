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
  Edit
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
      toast.error('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="secondary" className="bg-green-50 text-green-700">อนุมัติแล้ว</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700">รออนุมัติ</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-50 text-red-700">ไม่อนุมัติ</Badge>;
      default:
        return <Badge variant="secondary">ไม่ทราบสถานะ</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="secondary" className="bg-red-50 text-red-700">ผู้ดูแลระบบ</Badge>;
      case 'president':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700">ประธานชมรม</Badge>;
      case 'student':
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">นักเรียน</Badge>;
      default:
        return <Badge variant="secondary">ไม่ทราบบทบาท</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">
              ยินดีต้อนรับ ผู้ดูแลระบบ
            </h1>
            <p className="text-emerald-100">
              {user?.name || user?.email?.split('@')[0]} • จัดการระบบอาสาสมัคร
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">กิจกรรมทั้งหมด</p>
                <p className="text-xl font-bold">{stats?.totalActivities || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">ชมรมทั้งหมด</p>
                <p className="text-xl font-bold">{stats?.totalClubs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-gray-600">รออนุมัติ</p>
                <p className="text-xl font-bold">{stats?.pendingActivities || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>สถิติกิจกรรม</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">อนุมัติแล้ว</span>
              </div>
              <span className="font-semibold">{stats?.approvedActivities || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm">รออนุมัติ</span>
              </div>
              <span className="font-semibold">{stats?.pendingActivities || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm">ไม่อนุมัติ</span>
              </div>
              <span className="font-semibold">{stats?.rejectedActivities || 0}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ผู้เข้าร่วมทั้งหมด</span>
                <span className="font-bold text-emerald-600">{stats?.totalRegistrations || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>สถิติผู้ใช้</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-600" />
                <span className="text-sm">ผู้ดูแลระบบ</span>
              </div>
              <span className="font-semibold">{stats?.adminUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-blue-600" />
                <span className="text-sm">ประธานชมรม</span>
              </div>
              <span className="font-semibold">{stats?.presidentUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">นักเรียน</span>
              </div>
              <span className="font-semibold">{stats?.studentUsers || 0}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ใช้งานอยู่</span>
                <span className="font-bold text-green-600">{stats?.activeUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>การดำเนินการด่วน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/activities/create">
                <Calendar className="w-4 h-4 mr-2" />
                เพิ่มกิจกรรมใหม่
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/users">
                <UserPlus className="w-4 h-4 mr-2" />
                จัดการผู้ใช้
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/approvals">
                <ClipboardList className="w-4 h-4 mr-2" />
                อนุมัติกิจกรรม ({stats?.pendingActivities || 0})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/activities">
                <Eye className="w-4 h-4 mr-2" />
                ดูกิจกรรมทั้งหมด
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/reports">
                <BarChart3 className="w-4 h-4 mr-2" />
                รายงานและสถิติ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities and Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>กิจกรรมล่าสุด</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">ยังไม่มีกิจกรรม</p>
              ) : (
                recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{activity.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(activity.status)}
                        {activity.club_name && (
                          <span className="text-xs text-gray-500">
                            {activity.club_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/activities?id=${activity.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            {recentActivities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/activities">
                    ดูกิจกรรมทั้งหมด
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>ผู้ใช้ใหม่ล่าสุด</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">ยังไม่มีผู้ใช้ใหม่</p>
              ) : (
                recentUsers.slice(0, 5).map((newUser) => (
                  <div key={newUser.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{newUser.name || 'ไม่ระบุชื่อ'}</h4>
                      <p className="text-xs text-gray-500">{newUser.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getRoleBadge(newUser.role)}
                        {newUser.status === 'disabled' && (
                          <Badge variant="secondary" className="bg-gray-50 text-gray-700">ปิดการใช้งาน</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(newUser.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/users?search=${newUser.email}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            {recentUsers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/users">
                    ดูผู้ใช้ทั้งหมด
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health Warning */}
      {stats && stats.pendingActivities > 10 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">ต้องการความสนใจ</h3>
                <p className="text-sm text-amber-800">
                  มีกิจกรรม {stats.pendingActivities} รายการที่รออนุมัติ กรุณาตรวจสอบและดำเนินการ
                </p>
                <Button asChild size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">
                  <Link href="/dashboard/approvals">
                    ไปอนุมัติกิจกรรม
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
