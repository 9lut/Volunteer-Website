import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: 'registration_approved' | 'registration_rejected';
  title: string;
  message: string;
  activity_id: number;
  activity_title: string;
  created_at: string;
  read: boolean;
}

const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

export function useNotifications() {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // ดึงข้อมูล registrations ของ user
  const { data: registrations, error } = useSWR<any[]>(
    user ? '/api/users/me/registrations' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // ตรวจสอบทุก 30 วินาที
    }
  );

  // สร้าง notifications จาก registrations ที่มีการอัปเดตสถานะ
  const notifications: Notification[] = (registrations || [])
    .filter((reg: any) => reg.status !== 'pending' && reg.approved_at)
    .map((reg: any) => ({
      id: `reg_${reg.id}`,
      type: (reg.status === 'approved' ? 'registration_approved' : 'registration_rejected') as 'registration_approved' | 'registration_rejected',
      title: reg.status === 'approved' ? 'ได้รับการอนุมัติ!' : 'ไม่ได้รับการอนุมัติ',
      message: `กิจกรรม "${reg.activity.title}"`,
      activity_id: reg.activity_id,
      activity_title: reg.activity.title,
      created_at: reg.approved_at,
      read: false, // TODO: เพิ่มระบบ read status ใน database ในอนาคต
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // นับ notifications ที่ยังไม่ได้อ่าน
  const unreadCount = notifications.filter(n => !n.read).length;

  // ตรวจสอบว่ามี notification ใหม่หรือไม่
  const hasNewNotifications = lastCheck ? 
    notifications.some(n => new Date(n.created_at) > lastCheck) : 
    unreadCount > 0;

  const markAsRead = () => {
    setLastCheck(new Date());
  };

  return {
    notifications,
    unreadCount,
    hasNewNotifications,
    markAsRead,
    isLoading: !registrations && !error,
    error
  };
}
