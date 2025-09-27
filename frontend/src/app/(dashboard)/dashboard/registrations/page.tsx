'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { 
  FileText, 
  Download, 
  Search, 
  Users, 
  Calendar,
  Filter,
  TrendingUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Activity = {
  id: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  start_date: string;
  end_date?: string;
  location?: string;
  current_participants: number;
  max_participants?: number;
  created_at: string;
  club_name?: string;
};

type Registration = {
  id: string;
  user_id: string;
  activity_id: number;
  activity_title: string;
  user_name?: string;
  user_email: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
  updated_at: string;
};

export default function RegistrationsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load activities created by this president
      const activitiesRes = await api.get('/api/activities?status=all&limit=1000');
      setActivities(activitiesRes.data);

      // Load all registrations for president's activities
      const registrationsPromises = activitiesRes.data.map((activity: Activity) =>
        api.get(`/api/activities/${activity.id}/registrations`).catch(() => ({ data: [] }))
      );
      
      const registrationsResults = await Promise.all(registrationsPromises);
      const allRegistrations: Registration[] = [];
      
      registrationsResults.forEach((result, index) => {
        const activity = activitiesRes.data[index];
        result.data.forEach((reg: any) => {
          allRegistrations.push({
            id: reg.id,
            user_id: reg.user_id,
            activity_id: activity.id,
            activity_title: activity.name,
            user_name: reg.name,
            user_email: reg.email,
            status: 'registered', // Default status
            created_at: reg.created_at,
            updated_at: reg.created_at,
          });
        });
      });
      
      setRegistrations(allRegistrations);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      setIsExporting(true);
      
      const filteredData = getFilteredRegistrations();
      const csvContent = generateCSV(filteredData);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `registrations-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('ส่งออกรายงานสำเร็จ', 'ไฟล์ CSV ได้ถูกดาวน์โหลดแล้ว');
    } catch (error: any) {
      console.error('Failed to export report:', error);
      toast.error('ไม่สามารถส่งออกรายงานได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (data: Registration[]) => {
    const headers = ['กิจกรรม', 'ชื่อผู้สมัคร', 'อีเมล', 'สถานะ', 'วันที่สมัคร'];
    const rows = data.map(reg => [
      reg.activity_title,
      reg.user_name || 'ไม่ระบุชื่อ',
      reg.user_email,
      reg.status === 'registered' ? 'ลงทะเบียนแล้ว' : 
      reg.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'เข้าร่วมแล้ว',
      new Date(reg.created_at).toLocaleDateString('th-TH')
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const getFilteredRegistrations = () => {
    return registrations.filter(reg => {
      const matchesSearch = search === '' || 
        reg.activity_title.toLowerCase().includes(search.toLowerCase()) ||
        reg.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        reg.user_email.toLowerCase().includes(search.toLowerCase());
      
      const matchesActivity = selectedActivity === 'all' || 
        reg.activity_id.toString() === selectedActivity;
      
      const matchesStatus = selectedStatus === 'all' || 
        reg.status === selectedStatus;
      
      return matchesSearch && matchesActivity && matchesStatus;
    });
  };

  const filteredRegistrations = getFilteredRegistrations();

  // Stats
  const totalRegistrations = registrations.length;
  const totalActivities = activities.length;
  const activeActivities = activities.filter(a => a.status === 'approved').length;
  const totalParticipants = activities.reduce((sum, a) => sum + a.current_participants, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงานผู้สมัครกิจกรรม</h1>
          <p className="text-gray-600">รายงานสรุปผู้สมัครเข้าร่วมกิจกรรมของชมรม</p>
        </div>
        <LoadingButton
          onClick={exportReport}
          loading={isExporting}
          loadingText="กำลังส่งออก..."
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="w-4 h-4 mr-2" />
          ส่งออก CSV
        </LoadingButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">กิจกรรมทั้งหมด</p>
                <p className="text-xl font-bold">{totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">กิจกรรมที่เปิด</p>
                <p className="text-xl font-bold">{activeActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ผู้เข้าร่วมรวม</p>
                <p className="text-xl font-bold">{totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">การสมัครทั้งหมด</p>
                <p className="text-xl font-bold">{totalRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>รายการผู้สมัคร</span>
            <Badge variant="secondary">{filteredRegistrations.length} รายการ</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Activity Filter */}
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="เลือกกิจกรรม" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">กิจกรรมทั้งหมด</SelectItem>
                {activities.map(activity => (
                  <SelectItem key={activity.id} value={activity.id.toString()}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="สถานะ" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="registered">ลงทะเบียนแล้ว</SelectItem>
                <SelectItem value="cancelled">ยกเลิกแล้ว</SelectItem>
                <SelectItem value="attended">เข้าร่วมแล้ว</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setSelectedActivity('all');
                setSelectedStatus('all');
              }}
            >
              ล้างตัวกรอง
            </Button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search || selectedActivity !== 'all' || selectedStatus !== 'all' 
                  ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข' 
                  : 'ยังไม่มีผู้สมัครกิจกรรม'}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">กิจกรรม</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ผู้สมัคร</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">อีเมล</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">สถานะ</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">วันที่สมัคร</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{reg.activity_title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{reg.user_name || 'ไม่ระบุชื่อ'}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{reg.user_email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={
                            reg.status === 'registered' ? 'bg-green-50 text-green-700' :
                            reg.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                            'bg-blue-50 text-blue-700'
                          }
                        >
                          {reg.status === 'registered' ? 'ลงทะเบียนแล้ว' :
                           reg.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'เข้าร่วมแล้ว'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(reg.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
