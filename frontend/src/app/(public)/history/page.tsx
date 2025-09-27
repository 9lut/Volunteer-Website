'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  X,
  Users,
  Image as ImageIcon
} from 'lucide-react';

type RegItem = {
  id: number;
  activity_id: number;
  user_id: string;
  created_at: string;
  updated_at?: string;
  status: 'approved' | 'pending' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  activity?: {
    id: number;
    name: string;
    description?: string;
    start_date: string;
    end_date?: string;
    location?: string;
    cover_url?: string;
    max_participants?: number;
    current_participants?: number;
    club_name?: string;
    created_by?: string;
  };

  approver?: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
};

const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error('History API Error:', error);
    // จัดการ error ต่างๆ
    if (error.response?.status === 401) {
      throw new Error('กรุณาเข้าสู่ระบบก่อน');
    }
    if (error.response?.status === 403) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูล');
    }
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    throw new Error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
};

function StatusBadge({ status, rejection_reason }: { 
  status: 'approved'|'pending'|'rejected';
  rejection_reason?: string;
}) {
  const configs = {
    approved: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle className="w-3 h-3" />,
      text: 'ได้รับการอนุมัติ'
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Clock className="w-3 h-3" />,
      text: 'รออนุมัติ'
    },
    rejected: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <XCircle className="w-3 h-3" />,
      text: 'ไม่ได้รับการอนุมัติ'
    }
  };

  const config = configs[status];

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.text}
      </span>

      {status === 'rejected' && rejection_reason && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
          <div className="font-medium">เหตุผล:</div>
          <div>{rejection_reason}</div>
        </div>
      )}
    </div>
  );
}

function ActivityImage({ coverUrl, title }: { coverUrl?: string; title: string }) {
  const [imageError, setImageError] = useState(false);

  if (!coverUrl || imageError) {
    return (
      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
      <img
        src={coverUrl}
        alt={title}
        className="w-full h-full object-cover rounded-lg"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export default function HistoryPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Authentication middleware
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // เรียก hooks ทั้งหมดก่อน - ไม่ว่าจะอยู่ในสถานะไหน
  const { data, isLoading, error, mutate } = useSWR<RegItem[]>(
    user ? '/api/users/me/registrations' : null, // เรียก API เฉพาะเมื่อมีผู้ใช้เข้าสู่ระบบ
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  );

  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [q, setQ] = useState('');

  // แสดง error toast เมื่อโหลดข้อมูลไม่สำเร็จ
  useEffect(() => {
    if (error) {
      toast.error('ไม่สามารถโหลดประวัติการสมัครได้');
    }
  }, [error, toast]);

  // สร้าง computed values ทั้งหมดก่อน conditional returns
  const todayFloor = new Date(new Date().toDateString());

  const list = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const qLower = (q || '').toLowerCase().trim();
    const raw = data.filter(i => {
      // Filter by activity title if it exists, otherwise allow all items
      if (!qLower) return true;
      return (i.activity?.name || '').toLowerCase().includes(qLower);
    });

    if (tab === 'all') return raw;

    return raw.filter(i => {
      const endStr = i.activity?.end_date || i.activity?.start_date;
      if (!endStr) return tab === 'upcoming';
      const end = new Date(endStr);
      return tab === 'upcoming' ? end >= todayFloor : end < todayFloor;
    });
  }, [data, q, tab, todayFloor]);

  const cancelable = (r: RegItem) => {
    if (r.status !== 'pending') return false;
    const endStr = r.activity?.end_date || r.activity?.start_date;
    if (!endStr) return true;
    const end = new Date(endStr);
    return end >= todayFloor;
  };

  const unregister = async (activityId: number, name: string) => {
    if (!confirm(`ยกเลิกการสมัคร "${name}" ?`)) return;
    
    try {
      await api.delete(`/api/activities/${activityId}/register`);
      await mutate();
      toast.success(`ยกเลิกการสมัคร "${name}" เรียบร้อยแล้ว`);
    } catch (e: any) {
      console.error('unregister failed:', e?.response?.data || e?.message);
      const errorMessage = e?.response?.data?.message || 'ไม่สามารถยกเลิกการสมัครได้';
      toast.error(errorMessage);
    }
  };

  // Conditional returns after all hooks are called
  // Show loading during authentication check
  if (status === 'loading' || (status === 'unauthenticated' && !user)) {
    return null; // Router will redirect to login
  }

  // ตรวจสอบสถานะการล็อกอิน
  if (!user) {
    router.push('/login');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">กำลังเปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">ประวัติกิจกรรมของฉัน</h1>
        <p className="mt-2 text-gray-600">
          ดูรายการกิจกรรมที่คุณสมัครไว้ พร้อมสถานะการอนุมัติและรายละเอียดผู้อนุมัติ
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-emerald-50 p-1">
              {([
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'upcoming', label: 'กำลังจะถึง' },
                { key: 'past', label: 'ที่ผ่านมา' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'text-emerald-700/70 hover:text-emerald-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="ค้นหาชื่อกิจกรรม…"
                className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm outline-none ring-0 transition focus:border-emerald-300 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
              />
              <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 w-1/2 bg-gray-200 rounded" />
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-red-800 mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
            <p className="text-red-700 mb-4">{error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}</p>
            <div className="space-y-2">
              <Button onClick={() => mutate()} variant="outline" className="mr-2">
                ลองใหม่
              </Button>
              <Button asChild variant="default">
                <Link href="/activities">กลับไปหน้ากิจกรรม</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {!data || list.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {!data ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีประวัติการสมัคร'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {!data ? 'รอสักครู่...' : 'เริ่มสำรวจกิจกรรมที่น่าสนใจและสมัครเข้าร่วมได้เลย'}
                </p>
                {data && (
                  <Button asChild>
                    <Link href="/activities">สำรวจกิจกรรม</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {list.map((r) => {
                const activity = r.activity;
                
                // ถ้าไม่มีข้อมูล activity ให้แสดงข้อมูลพื้นฐาน
                if (!activity) {
                  return (
                    <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow border-yellow-200 bg-yellow-50">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Placeholder Image */}
                          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-yellow-200">
                            <ImageIcon className="w-8 h-8 text-yellow-500" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xl font-semibold text-gray-900">
                                  กิจกรรม ID: {r.activity_id}
                                </h3>
                                <p className="text-yellow-700 mt-1 text-sm">
                                  📋 ข้อมูลกิจกรรมกำลังโหลด... กรุณารอสักครู่
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    สมัครเมื่อ: {new Date(r.created_at).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <StatusBadge 
                                status={(r.status as any) || 'pending'}
                                rejection_reason={r.rejection_reason}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                const startDate = new Date(activity.start_date);
                const endDate = activity.end_date ? new Date(activity.end_date) : null;
                const isUpcoming = startDate > new Date();

                return (
                  <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Activity Image */}
                        <ActivityImage 
                          coverUrl={activity.cover_url} 
                          title={activity.name}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <Link 
                                href={`/activities/${activity.id}`}
                                className="block group"
                              >
                                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                                  {activity.name}
                                </h3>
                              </Link>
                              
                              {activity.club_name && (
                                <p className="text-sm text-gray-600 mt-1">
                                  จัดโดย: {activity.club_name}
                                </p>
                              )}

                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>

                            {/* Status */}
                            <StatusBadge 
                              status={r.status}
                              rejection_reason={r.rejection_reason}
                            />
                          </div>

                          {/* Activity Details */}
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>
                                {startDate.toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {endDate && (
                                  <> - {endDate.toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}</>
                                )}
                              </span>
                            </div>

                            {activity.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{activity.location}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>
                                สมัครเมื่อ {new Date(r.created_at).toLocaleDateString('th-TH')}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/activities/${activity.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                ดูรายละเอียด
                              </Link>
                            </Button>

                            {cancelable(r) && (
                              <Button
                                onClick={() => unregister(activity.id, activity.name)}
                                variant="destructive"
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                ยกเลิกการสมัคร
                              </Button>
                            )}

                            {isUpcoming && r.status === 'approved' && (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                กำลังจะเริ่ม
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
