'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';

interface ClubStats {
  totalActivities: number;
  pendingActivities: number;
  approvedActivities: number;
  rejectedActivities: number;
  totalParticipants: number;
  totalRegistrations: number;
  averageParticipantsPerActivity: number;
  upcomingActivities: number;
  completedActivities: number;
  monthlyStats: {
    month: string;
    activities: number;
    participants: number;
  }[];
  topActivities: {
    id: number;
    name: string;
    participants: number;
    registrations: number;
  }[];
}

export default function ClubStatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');

  useEffect(() => {
    if (user?.role === 'president') {
      loadStats();
    } else {
      router.push('/dashboard');
    }
  }, [user, timeRange]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/clubs/stats?range=${timeRange}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading club stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดสถิติ...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ไม่สามารถโหลดสถิติได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">สถิติชมรม</h1>
              <p className="text-gray-600 mt-1">ภาพรวมและผลงานของชมรม</p>
            </div>
            <div className="flex gap-2">
              {[
                { value: '3months', label: '3 เดือน' },
                { value: '6months', label: '6 เดือน' },
                { value: '1year', label: '1 ปี' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === option.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">กิจกรรมทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
                <p className="text-sm text-gray-500 mt-1">
                  อนุมัติ: {stats.approvedActivities} | รออนุมัติ: {stats.pendingActivities}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ผู้เข้าร่วมทั้งหมด</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalParticipants}</p>
                <p className="text-sm text-gray-500 mt-1">
                  จากผู้สมัคร {stats.totalRegistrations} คน
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">กิจกรรมที่กำลังมา</p>
                <p className="text-2xl font-bold text-purple-600">{stats.upcomingActivities}</p>
                <p className="text-sm text-gray-500 mt-1">
                  เสร็จแล้ว: {stats.completedActivities} กิจกรรม
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เฉลี่ยผู้เข้าร่วม</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.averageParticipantsPerActivity.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 mt-1">คน/กิจกรรม</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">สถิติรายเดือน</h3>
            
            {stats.monthlyStats.length > 0 ? (
              <div className="space-y-4">
                {stats.monthlyStats.map((month, index) => {
                  const maxActivities = Math.max(...stats.monthlyStats.map(m => m.activities));
                  const maxParticipants = Math.max(...stats.monthlyStats.map(m => m.participants));
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{month.month}</span>
                        <div className="flex gap-4 text-gray-500">
                          <span>{month.activities} กิจกรรม</span>
                          <span>{month.participants} คน</span>
                        </div>
                      </div>
                      
                      {/* Activities Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${maxActivities > 0 ? (month.activities / maxActivities) * 100 : 0}%` }}
                          ></div>
                        </div>
                        
                        {/* Participants Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${maxParticipants > 0 ? (month.participants / maxParticipants) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-center gap-6 text-sm pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span>กิจกรรม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>ผู้เข้าร่วม</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                ยังไม่มีข้อมูลสถิติ
              </div>
            )}
          </motion.div>

          {/* Top Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">กิจกรรมยอดนิยม</h3>
            
            {stats.topActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.topActivities.map((activity, index) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.participants} คนเข้าร่วม จาก {activity.registrations} คนที่สมัคร
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold text-emerald-600">
                        {activity.registrations > 0 
                          ? Math.round((activity.participants / activity.registrations) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-500">อัตราเข้าร่วม</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                ยังไม่มีกิจกรรม
              </div>
            )}
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <button
            onClick={() => router.push('/dashboard/activities/create')}
            className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <div className="text-lg font-semibold">สร้างกิจกรรมใหม่</div>
            <div className="text-sm opacity-90">เพิ่มกิจกรรมสำหรับชมรม</div>
          </button>

          <button
            onClick={() => router.push('/dashboard/activities')}
            className="p-6 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <div className="text-lg font-semibold">จัดการกิจกรรม</div>
            <div className="text-sm text-gray-500">ดูและแก้ไขกิจกรรม</div>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="p-6 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2zm0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 13h10M7 17h4" />
            </svg>
            <div className="text-lg font-semibold">แดชบอร์ด</div>
            <div className="text-sm text-gray-500">กลับไปหน้าหลัก</div>
          </button>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-xl text-white"
        >
          <h3 className="text-xl font-semibold mb-4">สรุปผลงาน</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {stats.totalRegistrations > 0 
                  ? Math.round((stats.totalParticipants / stats.totalRegistrations) * 100)
                  : 0}%
              </div>
              <div className="text-emerald-100">อัตราเข้าร่วมโดยรวม</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {stats.totalActivities > 0 
                  ? Math.round((stats.approvedActivities / stats.totalActivities) * 100)
                  : 0}%
              </div>
              <div className="text-emerald-100">อัตราอนุมัติกิจกรรม</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {stats.completedActivities > 0 
                  ? Math.round((stats.completedActivities / (stats.completedActivities + stats.upcomingActivities)) * 100)
                  : 0}%
              </div>
              <div className="text-emerald-100">กิจกรรมที่เสร็จสิ้น</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
