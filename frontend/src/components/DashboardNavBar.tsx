'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { canApproveActivity, canManageUsers, canManageActivities, canManageClubs } from '@/lib/roles';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardNavBar({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = canManageUsers(user?.role);
  const canApprove = canApproveActivity(user?.role);
  const canManageActs = canManageActivities(user?.role);
  const canManageCls = canManageClubs(user?.role);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Measure dynamic sizes (desktop sidebar width + mobile bars height) =====
  const asideRef = useRef<HTMLElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomTabsRef = useRef<HTMLElement | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(256); // w-64 default
  const [topBarHeight, setTopBarHeight] = useState<number>(64);  // h-16 default
  const [bottomTabsHeight, setBottomTabsHeight] = useState<number>(72);

  const measure = useCallback(() => {
    const w = asideRef.current?.getBoundingClientRect().width ?? (isCollapsed ? 68 : 256);
    const t = topBarRef.current?.getBoundingClientRect().height ?? 64;
    const b = bottomTabsRef.current?.getBoundingClientRect().height ?? 72;
    setSidebarWidth(Math.ceil(w));
    setTopBarHeight(Math.ceil(t));
    setBottomTabsHeight(Math.ceil(b));
  }, [isCollapsed]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    measure();
  }, [isCollapsed, measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize, { passive: true });

    const obs: ResizeObserver | null = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (asideRef.current) obs?.observe(asideRef.current);
    if (topBarRef.current) obs?.observe(topBarRef.current);
    if (bottomTabsRef.current) obs?.observe(bottomTabsRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      obs?.disconnect();
    };
  }, [measure]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ===== Nav items =====
  const items = useMemo(
    () => [
      {
        href: '/dashboard',
        label: 'หน้าหลัก',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
        show: user?.role === 'president',
      },
      {
        href: '/admin',
        label: 'หน้าหลัก',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
        show: isAdmin,
      },
      {
        href: '/dashboard/approvals',
        label: 'อนุมัติกิจกรรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
        show: canApprove,
      },
      {
        href: '/dashboard/activities',
        label: user?.role === 'president' ? 'กิจกรรมของฉัน' : 'จัดการกิจกรรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        show: canManageActs,
      },
      {
        href: '/dashboard/clubs',
        label: user?.role === 'president' ? 'ชมรมของฉัน' : 'จัดการชมรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        show: canManageCls,
      },
      {
        href: '/dashboard/registrations',
        label: 'รายงานผู้สมัคร',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        show: user?.role === 'president',
      },
      {
        href: '/dashboard/activities/create',
        label: 'สร้างกิจกรรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        show: user?.role === 'president',
      },
      {
        href: '/dashboard/club-stats',
        label: 'สถิติชมรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        show: user?.role === 'president',
      },
      {
        href: '/admin/management',
        label: 'จัดการระบบ',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        show: isAdmin,
      },
      {
        href: '/admin/users',
        label: 'จัดการผู้ใช้',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.021M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        show: isAdmin,
      },
      {
        href: '/dashboard/reports',
        label: 'รายงาน',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        show: isAdmin,
      },
    ],
    [isAdmin, canApprove, canManageActs, canManageCls, user?.role]
  );

  const visibleItems = items.filter((i) => i.show);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* ===== Mobile TopBar (md:hidden) ===== */}
      <div
        ref={topBarRef}
        className="md:hidden fixed top-0 inset-x-0 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg z-50"
      >
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:text-emerald-100 p-2 rounded-lg hover:bg-emerald-600/50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">V</div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-white">Volunteer</span>
                <span className="text-[11px] text-emerald-100">แดชบอร์ด</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              โปรไฟล์
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-white hover:bg-red-500/30 transition-colors"
            >
              ออก
            </button>
          </div>
        </div>
      </div>

      {/* ===== Mobile Bottom Tabs (md:hidden) ===== */}
      <nav
        ref={bottomTabsRef as any}
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur shadow-lg"
      >
        <ul className="grid grid-cols-4 gap-1 p-2">
          {visibleItems.slice(0, 4).map((it) => {
            const active = isActive(it.href);
            return (
              <li key={it.href} className="relative">
                <Link
                  href={it.href}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs rounded-xl transition-all duration-200 ${
                    active 
                      ? 'text-emerald-600 bg-emerald-50' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-emerald-100' : 'bg-transparent'}`}>
                    {it.icon}
                  </span>
                  <span className="leading-none font-medium">{it.label}</span>
                  {active && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ===== Desktop Sidebar (hidden on mobile) ===== */}
      <aside
        ref={asideRef}
        className={[
          'hidden md:flex fixed top-0 left-0 h-screen bg-white shadow-xl border-r border-gray-100 z-40',
          'transition-all duration-300 ease-out',
          isCollapsed ? 'w-[68px]' : 'w-64',
        ].join(' ')}
      >
        <div className="flex flex-col w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">V</div>
                <div className="leading-tight">
                  <div className="text-[15px] font-semibold text-white">Volunteer</div>
                  <div className="text-[11px] text-emerald-100">Dashboard</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              aria-label="Toggle sidebar"
              title="ย่อ/ขยายเมนู"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {visibleItems.map((it) => {
              const active = isActive(it.href);
              return (
                <div key={it.href} className="relative">
                  <Link
                    href={it.href}
                    className={[
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                      active 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
                      isCollapsed ? 'justify-center' : '',
                    ].join(' ')}
                  >
                    <span className={`flex items-center justify-center transition-colors ${
                      active ? 'text-white' : 'text-emerald-600'
                    }`}>
                      {it.icon}
                    </span>
                    {!isCollapsed && <span className="font-medium">{it.label}</span>}

                    {active && (
                      <motion.div
                        layoutId="desktopActiveTab"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Tooltip when collapsed */}
                    {isCollapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition group-hover:opacity-100 z-50">
                        {it.label}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Profile / Actions */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4">
            {!isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/20 text-white flex items-center justify-center font-semibold">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {user?.email?.split('@')[0] || 'ผู้ใช้'}
                    </div>
                    <div className="text-xs text-emerald-100 capitalize">{user?.role}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    โปรไฟล์
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    กลับหน้าหลัก
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium rounded-lg bg-red-500/20 text-white hover:bg-red-500/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    ออกระบบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-white/20 text-white flex items-center justify-center font-semibold">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white hover:bg-red-500/30 rounded-lg transition-colors"
                  title="ออกจากระบบ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={`
        md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">V</div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">Volunteer</div>
                <div className="text-xs text-emerald-100">Dashboard</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-emerald-100 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {visibleItems.map((it) => {
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={`mr-3 transition-colors ${
                    active ? 'text-white' : 'text-emerald-600'
                  }`}>
                    {it.icon}
                  </span>
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center font-semibold">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {user?.email?.split('@')[0] || 'ผู้ใช้'}
                </p>
                <p className="text-xs text-emerald-100 capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Link
                href="/"
                className="flex items-center w-full px-3 py-2 text-sm text-white rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                กลับหน้าหลัก
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm text-white rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ออกระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Top bar for desktop */}
        <div className="hidden md:block bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('th-TH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}