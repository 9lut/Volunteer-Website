'use client';

import { useAuth } from '@/hooks/useAuth';
import { useActivities } from '@/hooks/useActivities';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock,
  Star,
  BookOpen,
  Trophy,
  Activity,
  Heart,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

type UserStats = {
  totalRegistrations: number;
  completedActivities: number;
  upcomingActivities: number;
  favoriteClubs: string[];
  totalHours: number;
};

type PopularActivity = {
  id: number;
  name: string;
  club_name: string;
  participants_count: number;
  max_participants?: number;
  start_date: string;
  location?: string;
};

export default function StudentHomePage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const { activities: availableActivities, isLoading: activitiesLoading } = useActivities('approved');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [popularActivities, setPopularActivities] = useState<PopularActivity[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      
      const [statsRes, popularRes, registrationsRes] = await Promise.all([
        api.get('/api/users/me/stats'),
        api.get('/api/activities/popular?limit=6'),
        api.get('/api/users/me/registrations?limit=10')
      ]);

      setUserStats(statsRes.data);
      setPopularActivities(popularRes.data);
      setMyRegistrations(registrationsRes.data);
    } catch (error: any) {
      console.error('Failed to load student data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityStatus = (startDate: string) => {
    const now = new Date();
    const activityDate = new Date(startDate);
    
    if (activityDate > now) {
      return { label: 'กำลังจะมาถึง', className: 'bg-blue-50 text-blue-700' };
    } else {
      return { label: 'เสร็จสิ้นแล้ว', className: 'bg-green-50 text-green-700' };
    }
  };

  if (isLoading || activitiesLoading) {
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
          <BookOpen className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">
              สวัสดี คุณ{user?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-emerald-100">
              นักเรียน • เข้าร่วมกิจกรรมอาสาสมัครและพัฒนาตัวเอง
            </p>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-600">กิจกรรมที่เข้าร่วม</p>
                <p className="text-xl font-bold">{userStats?.totalRegistrations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">เสร็จสิ้นแล้ว</p>
                <p className="text-xl font-bold">{userStats?.completedActivities || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">กำลังจะมาถึง</p>
                <p className="text-xl font-bold">{userStats?.upcomingActivities || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">ชั่วโมงอาสา</p>
                <p className="text-xl font-bold">{userStats?.totalHours || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>สิ่งที่คุณสามารถทำได้</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button asChild className="h-20 flex-col bg-emerald-600 hover:bg-emerald-700">
              <Link href="/activities">
                <Calendar className="w-6 h-6 mb-2" />
                ดูกิจกรรมทั้งหมด
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/history">
                <Trophy className="w-6 h-6 mb-2" />
                ประวัติการเข้าร่วม
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/clubs">
                <Users className="w-6 h-6 mb-2" />
                ชมรมทั้งหมด
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Popular Activities and My Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>กิจกรรมยอดนิยม</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">ไม่มีกิจกรรมยอดนิยม</p>
              ) : (
                popularActivities.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{activity.name}</h4>
                      <p className="text-xs text-gray-500">{activity.club_name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {activity.participants_count}
                          {activity.max_participants && `/${activity.max_participants}`} คน
                        </Badge>
                        {activity.location && (
                          <div className="flex items-center text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            {activity.location}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.start_date).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/activities/${activity.id}`}>
                        ดูรายละเอียด
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            {popularActivities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/activities">
                    ดูกิจกรรมทั้งหมด
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>กิจกรรมของฉัน</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">คุณยังไม่ได้สมัครกิจกรรมใดๆ</p>
                  <Button asChild>
                    <Link href="/activities">
                      สำรวจกิจกรรม
                    </Link>
                  </Button>
                </div>
              ) : (
                myRegistrations.slice(0, 4).map((registration) => {
                  const status = getActivityStatus(registration.activity.start_date);
                  return (
                    <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{registration.activity.name}</h4>
                        <p className="text-xs text-gray-500">{registration.activity.club_name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className={status.className}>
                            {status.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(registration.activity.start_date).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/activities/${registration.activity.id}`}>
                          <Calendar className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
            
            {myRegistrations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/history">
                    ดูประวัติทั้งหมด
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Activities Preview */}
      {availableActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>กิจกรรมที่เปิดรับสมัคร</span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/activities">
                  ดูทั้งหมด ({availableActivities.length})
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableActivities.slice(0, 6).map((activity: any) => (
                <div key={activity.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-sm mb-2">{activity.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">{activity.club_name}</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(activity.start_date).toLocaleDateString('th-TH')}
                    </div>
                    {activity.location && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {activity.location}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {activity.current_participants || 0}
                      {activity.max_participants && `/${activity.max_participants}`} คน
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full mt-3" variant="outline">
                    <Link href={`/activities/${activity.id}`}>
                      ดูรายละเอียด
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
