'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';

interface Registration {
  id: number;
  activity_id: number;
  user_id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  email: string;
  name: string;
  role: string;
}

export default function ActivityParticipantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = params.id;
  
  const [activity, setActivity] = useState<any>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activityId) {
      loadData();
    }
  }, [activityId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [activityRes, registrationsRes] = await Promise.all([
        api.get(`/api/activities/${activityId}`),
        api.get(`/api/activities/${activityId}/registrations`)
      ]);

      const activityData = activityRes.data;
      setActivity(activityData);

      // ตรวจสอบสิทธิ์
      if (user?.role !== 'admin' && user?.role !== 'president') {
        router.push('/dashboard/activities');
        return;
      }

      // สำหรับประธานชมรม ตรวจสอบว่าเป็นประธานของชมรมที่จัดกิจกรรมนี้หรือไม่
      if (user?.role === 'president') {
        try {
          const myClubsRes = await api.get('/api/clubs/my-clubs');
          const myClubs = myClubsRes.data || [];
          const isMyClubActivity = myClubs.some((club: any) => club.id === activityData.club_id);
          
          if (!isMyClubActivity) {
            router.push('/dashboard/activities');
            return;
          }
        } catch (error) {
          console.error('Error checking club membership:', error);
          router.push('/dashboard/activities');
          return;
        }
      }

      setRegistrations(registrationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/dashboard/activities');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRegistrationStatus = async (registrationId: number, status: 'approved' | 'rejected') => {
    try {
      const endpoint = status === 'approved' ? 'approve' : 'reject';
      await api.patch(`/api/activities/${activityId}/registrations/${registrationId}/${endpoint}`);
      
      setRegistrations(prev => prev.map(reg => 
        reg.id === registrationId ? { ...reg, status } : reg
      ));
      
      // แสดงข้อความสำเร็จ
      const message = status === 'approved' ? 'อนุมัติการสมัครเรียบร้อยแล้ว' : 'ปฏิเสธการสมัครเรียบร้อยแล้ว';
      alert(message);
      
    } catch (error: any) {
      console.error('Error updating registration:', error);
      alert(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const bulkApprove = async () => {
    if (!confirm('ต้องการอนุมัติการสมัครที่รออยู่ทั้งหมดหรือไม่?')) return;
    
    try {
      const response = await api.patch(`/api/activities/${activityId}/registrations/approve-all`);
      
      // รีเฟรชข้อมูล
      await loadData();
      alert(`อนุมัติการสมัครเรียบร้อย ${response.data.count} คน`);
      
    } catch (error: any) {
      console.error('Error bulk approving:', error);
      alert(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติทั้งหมด');
    }
  };

  const bulkReject = async () => {
    const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):');
    if (!confirm('ต้องการปฏิเสธการสมัครที่รออยู่ทั้งหมดหรือไม่?')) return;
    
    try {
      const response = await api.patch(`/api/activities/${activityId}/registrations/reject-all`, {
        reason: reason || 'ปฏิเสธทั้งหมด'
      });
      
      // รีเฟรชข้อมูล
      await loadData();
      alert(`ปฏิเสธการสมัครเรียบร้อย ${response.data.count} คน`);
      
    } catch (error: any) {
      console.error('Error bulk rejecting:', error);
      alert(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธทั้งหมด');
    }
  };

  const changeRegistrationStatus = async (registrationId: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      if (newStatus === 'pending') {
        // เปลี่ยนเป็น pending โดยการ reset status
        await api.patch(`/api/activities/${activityId}/registrations/${registrationId}/reset`);
      } else {
        const endpoint = newStatus === 'approved' ? 'approve' : 'reject';
        await api.patch(`/api/activities/${activityId}/registrations/${registrationId}/${endpoint}`);
      }
      
      setRegistrations(prev => prev.map(reg => 
        reg.id === registrationId ? { ...reg, status: newStatus } : reg
      ));
      
      const statusText = newStatus === 'approved' ? 'อนุมัติ' : 
                        newStatus === 'rejected' ? 'ปฏิเสธ' : 'รอการพิจารณา';
      alert(`เปลี่ยนสถานะเป็น "${statusText}" เรียบร้อยแล้ว`);
      
    } catch (error: any) {
      console.error('Error changing status:', error);
      alert(error?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const exportParticipants = async () => {
    try {
      setIsExporting(true);
      
      // ใช้ backend endpoint สำหรับ export CSV
      const response = await api.get(`/api/activities/${activityId}/registrations.csv`, {
        responseType: 'blob'
      });
      
      // สร้างลิงก์ดาวน์โหลด
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `participants_${activityId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting participants:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกรายชื่อ');
    } finally {
      setIsExporting(false);
    }
  };

  // กรองข้อมูล
  const filteredRegistrations = registrations.filter(reg => {
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // สถิติ
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screenflex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">จัดการผู้เข้าร่วม</h1>
              <p className="text-gray-600 mt-1">{activity?.name}</p>
            </div>
            <button
              onClick={exportParticipants}
              disabled={isExporting || stats.approved === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ส่งออกรายชื่อ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                <p className="text-sm font-medium text-gray-600">รออนุมัติ</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <p className="text-sm font-medium text-gray-600">อนุมัติแล้ว</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <p className="text-sm font-medium text-gray-600">ไม่อนุมัติ</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหาด้วยชื่อ, อีเมล, หรือรหัสนักศึกษา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'ทั้งหมด' :
                   status === 'pending' ? 'รออนุมัติ' :
                   status === 'approved' ? 'อนุมัติแล้ว' :
                   'ไม่อนุมัติ'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Participants List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                รายชื่อผู้สมัคร ({filteredRegistrations.length} คน)
              </h3>
              
              {/* Bulk Actions */}
              {stats.pending > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={bulkApprove}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    อนุมัติทั้งหมด ({stats.pending})
                  </button>
                  <button
                    onClick={bulkReject}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    ปฏิเสธทั้งหมด ({stats.pending})
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">ไม่มีผู้สมัครตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">ลำดับ</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">ข้อมูลผู้สมัคร</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">วันที่สมัคร</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">สถานะ</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegistrations.map((registration, index) => (
                    <tr key={registration.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {registration.name || 'ไม่ระบุชื่อ'}
                          </p>
                          <p className="text-sm text-gray-500">{registration.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(registration.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                          registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {registration.status === 'approved' ? 'อนุมัติแล้ว' :
                           registration.status === 'pending' ? 'รออนุมัติ' :
                           'ไม่อนุมัติ'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {registration.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                                className="cursor-pointer px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                              >
                                อนุมัติ
                              </Button>
                              <Button
                                onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                                className="cursor-pointer px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                              >
                                ปฏิเสธ
                              </Button>
                            </>
                          )}
                          {registration.status === 'approved' && (
                            <>
                              <div className="text-sm text-green-600 font-medium mb-1">
                                ✓ อนุมัติแล้ว
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => changeRegistrationStatus(registration.id, 'rejected')}
                                  className="cursor-pointer px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                                  title="เปลี่ยนเป็นปฏิเสธ"
                                >
                                  ปฏิเสธ
                                </Button>
                              </div>
                            </>
                          )}
                          {registration.status === 'rejected' && (
                            <>
                              <div className="text-sm text-red-600 font-medium mb-1">
                                ✗ ปฏิเสธแล้ว
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => changeRegistrationStatus(registration.id, 'approved')}
                                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                                  title="เปลี่ยนเป็นอนุมัติ"
                                >
                                  อนุมัติ
                                </button>
                                <button
                                  onClick={() => changeRegistrationStatus(registration.id, 'pending')}
                                  className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded hover:bg-yellow-200 transition-colors"
                                  title="เปลี่ยนเป็นรอพิจารณา"
                                >
                                  รอพิจารณา
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Activity Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6"
        >
          <h4 className="font-semibold text-emerald-800 mb-2">ข้อมูลกิจกรรม</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-emerald-700">
            <div>
              <p><strong>จำนวนที่รับ:</strong> {activity?.max_participants} คน</p>
              <p><strong>ที่เหลือ:</strong> {(activity?.max_participants || 0) - stats.approved} คน</p>
            </div>
            <div>
              <p><strong>วันที่จัด:</strong> {activity?.start_date ? new Date(activity.start_date).toLocaleDateString('th-TH') : '-'}</p>
              <p><strong>สถานที่:</strong> {activity?.location || '-'}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
