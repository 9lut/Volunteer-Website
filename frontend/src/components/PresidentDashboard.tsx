'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserPlus,
  FileText,
  Download
} from 'lucide-react';
import Link from 'next/link';

type ClubStats = {
  id: number;
  name: string;
  description?: string;
  totalMembers: number;
  totalActivities: number;
  pendingActivities: number;
  approvedActivities: number;
  totalRegistrations: number;
  recentRegistrations: number;
};

type Activity = {
  id: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  start_date: string;
  current_participants: number;
  max_participants?: number;
  created_at: string;
};

export default function PresidentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [clubStats, setClubStats] = useState<ClubStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load clubs with detailed stats
      const [statsRes, activitiesRes] = await Promise.all([
        api.get('/api/clubs/me/president/stats'),
        api.get('/api/activities?status=all&limit=10&sort=created_at:desc')
      ]);

      setClubStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (clubId: number) => {
    try {
      setIsExporting(true);
      const response = await api.get(`/api/clubs/${clubId}/report`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `club-report-${clubId}-${new Date().getTime()}.xlsx`;
      link.click();
      
      toast.success('ส่งออกรายงานสำเร็จ', 'ไฟล์รายงานได้ถูกดาวน์โหลดแล้ว');
    } catch (error: any) {
      console.error('Failed to export report:', error);
      toast.error('ไม่สามารถส่งออกรายงานได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (clubStats.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่ได้รับการแต่งตั้ง</h3>
        <p className="text-gray-500 mb-4">
          คุณยังไม่ได้ถูกแต่งตั้งให้เป็นประธานชมรมใดๆ
        </p>
        <div className="space-y-2 text-sm text-gray-600 max-w-md mx-auto">
          <p>หากคุณควรจะเป็นประธานชมรม กรุณา:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>ติดต่อผู้ดูแลระบบเพื่อขอการแต่งตั้ง</li>
            <li>ตรวจสอบว่าชมรมของคุณได้ถูกสร้างในระบบแล้ว</li>
            <li>รอการอนุมัติจากผู้ดูแลระบบ</li>
          </ul>
        </div>
        <div className="mt-6 space-x-3">
          <Button variant="outline" onClick={loadDashboardData}>
            รีเฟรช
          </Button>
          <Button asChild>
            <Link href="/dashboard/activities">
              ดูกิจกรรมทั่วไป
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          สวัสดี คุณ{user?.name || user?.email?.split('@')[0]}
        </h1>
        <p className="text-emerald-100">
          ประธานชมรม • จัดการ {clubStats.length} ชมรม
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-600">สมาชิกทั้งหมด</p>
                <p className="text-xl font-bold">
                  {clubStats.reduce((sum, club) => sum + club.totalMembers, 0)}
                </p>
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
                <p className="text-xl font-bold">
                  {clubStats.reduce((sum, club) => sum + club.totalActivities, 0)}
                </p>
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
                <p className="text-xl font-bold">
                  {clubStats.reduce((sum, club) => sum + club.pendingActivities, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">ผู้เข้าร่วม</p>
                <p className="text-xl font-bold">
                  {clubStats.reduce((sum, club) => sum + club.totalRegistrations, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Club Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Clubs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>ชมรมที่ดูแล</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clubStats.map((club) => (
              <div key={club.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{club.name}</h3>
                    {club.description && (
                      <p className="text-sm text-gray-600 mt-1">{club.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {club.pendingActivities > 0 && (
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                        {club.pendingActivities} รออนุมัติ
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{club.totalMembers}</p>
                    <p className="text-xs text-gray-500">สมาชิก</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{club.approvedActivities}</p>
                    <p className="text-xs text-gray-500">กิจกรรม</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{club.totalRegistrations}</p>
                    <p className="text-xs text-gray-500">ผู้เข้าร่วม</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/dashboard/clubs/${club.id}`}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      จัดการสมาชิก
                    </Link>
                  </Button>
                  <LoadingButton
                    onClick={() => exportReport(club.id)}
                    loading={isExporting}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    รายงาน
                  </LoadingButton>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5" />
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
                        <Badge 
                          variant="secondary" 
                          className={
                            activity.status === 'approved' ? 'bg-green-50 text-green-700' :
                            activity.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }
                        >
                          {activity.status === 'approved' ? 'อนุมัติแล้ว' :
                           activity.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {activity.current_participants || 0}
                          {activity.max_participants && `/${activity.max_participants}`} คน
                        </span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/activities?id=${activity.id}`}>
                        <FileText className="w-4 h-4" />
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
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>การดำเนินการด่วน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button asChild className="h-20 flex-col bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/activities/create">
                <Calendar className="w-6 h-6 mb-2" />
                สร้างกิจกรรม
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/clubs">
                <Users className="w-6 h-6 mb-2" />
                จัดการชมรม
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/activities">
                <ClipboardList className="w-6 h-6 mb-2" />
                กิจกรรมของฉัน
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/registrations">
                <FileText className="w-6 h-6 mb-2" />
                รายงานผู้สมัคร
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
