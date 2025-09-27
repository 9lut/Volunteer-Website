'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Bell } from 'lucide-react';
import useSWR from 'swr';
import { api } from '@/lib/axios';

const NAV_LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/activities', label: 'กิจกรรม' },
];

const NAV_MOBILE = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/activities', label: 'กิจกรรม' },
];

function NavLink({ href, label, mobile = false }: { href: string; label: string; mobile?: boolean }) {
  return (
    <Link
      href={href}
      className={
        mobile
          ? 'block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors'
          : 'text-gray-700 hover:text-gray-900 transition-colors font-medium'
      }
    >
      {label}
    </Link>
  );
}

export default function NavBar() {
  const { user, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // ดึงข้อมูลแจ้งเตือนสำหรับ student
  const { data: notifications = [] } = useSWR(
    user?.role === 'student' ? '/api/users/me/registrations' : null,
    async (url: string) => {
      const response = await api.get(url);
      return response.data.filter((reg: any) => 
        reg.status === 'approved' || reg.status === 'rejected'
      );
    },
    { revalidateOnFocus: false }
  );

  const unreadCount = notifications.length;

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* โลโก้ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Volunteer Web</span>
            </Link>
          </div>

          {/* เมนูหลัก (Desktop) */}
          <div className="hidden lg:flex items-center space-x-4">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          {/* ส่วนขวา */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* แจ้งเตือนสำหรับ student */}
                {user.role === 'student' && (
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in slide-in-from-top-1 duration-200 max-h-96 overflow-y-auto">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900">การแจ้งเตือน</h3>
                        </div>
                        
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>ไม่มีการแจ้งเตือน</p>
                          </div>
                        ) : (
                          <div className="py-2">
                            {notifications.map((notification: any) => (
                              <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0">
                                <div className="flex items-start space-x-3">
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                    notification.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {notification.activity.name}
                                    </p>
                                    <p className={`text-sm ${
                                      notification.status === 'approved' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {notification.status === 'approved' ? '✅ ได้รับการอนุมัติ' : '❌ ไม่ได้รับการอนุมัติ'}
                                    </p>
                                    {notification.rejection_reason && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        เหตุผล: {notification.rejection_reason}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(notification.approved_at || notification.created_at).toLocaleDateString('th-TH')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* โปรไฟล์ */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in slide-in-from-top-1 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm truncate">{user.email}</p>
                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm font-medium">โปรไฟล์</span>
                        </Link>

                        <Link
                          href="/history"
                          className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">ประวัติของฉัน</span>
                        </Link>

                        {(user.role === 'admin' || user.role === 'president') && (
                          <Link
                            href="/dashboard"
                            className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-medium">แผงควบคุม</span>
                          </Link>
                        )}

                        <hr className="my-2 border-gray-100" />

                        <button
                          onClick={() => {
                            signOut();
                            setIsProfileOpen(false);
                          }}
                          className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-sm font-medium">ออกจากระบบ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}

            {/* ปุ่มเมนูมือถือ */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* เมนูมือถือ */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-gray-100">
            <div className="space-y-2">
              {NAV_MOBILE.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} mobile />
              ))}
              {!user && (
                <div className="pt-2 border-t border-gray-100 mt-4 space-y-2">
                  <Link
                    href="/register"
                    className="block px-4 py-2 text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    สมัครสมาชิก
                  </Link>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-center text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
