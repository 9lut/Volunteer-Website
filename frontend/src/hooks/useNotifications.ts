import { useState, useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: "registration_approved" | "registration_rejected";
  title: string;
  message: string;
  activity_id: number;
  activity_title: string;
  created_at: string;
  read: boolean;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useNotifications() {
  const { user } = useAuth();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // ดึง registrations ของ user
  const { data: registrations, error } = useSWR<any[]>(
    user ? "/api/users/me/registrations" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, 
    }
  );

  // แปลงเป็น notifications
  const notifications: Notification[] = useMemo(() => {
    return (registrations || [])
      .filter((reg: any) => reg.status !== "pending" && reg.approved_at)
      .map((reg: any) => {
        const id = `reg_${reg.id}`;
        return {
          id,
          type: (reg.status === "approved" ? "registration_approved" : "registration_rejected") as "registration_approved" | "registration_rejected",
          title: reg.status === "approved" ? "ได้รับการอนุมัติ!" : "ไม่ได้รับการอนุมัติ",
          message: `กิจกรรม "${reg.activity.name}"`,
          activity_id: reg.activity_id,
          activity_title: reg.activity.name,
          created_at: reg.approved_at,
          read: readIds.has(id),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [registrations, readIds]);

  // ฟังก์ชัน markAsRead (ทีละ id)
  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    isLoading: !registrations && !error,
    error,
  };
}
