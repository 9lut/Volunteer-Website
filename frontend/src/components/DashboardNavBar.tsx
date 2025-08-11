'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { canApproveActivity, canManageUsers } from '@/lib/roles';
import { usePathname } from 'next/navigation';
import { useMemo, useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';

export default function DashboardNavBar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const isAdmin = canManageUsers(user?.role);
  const canApprove = canApproveActivity(user?.role);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // ===== Measure dynamic sizes (desktop sidebar width + mobile bars height) =====
  const asideRef = useRef<HTMLElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomTabsRef = useRef<HTMLElement | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(256); // w-64 default
  const [topBarHeight, setTopBarHeight] = useState<number>(10);  // h-14 default
  const [bottomTabsHeight, setBottomTabsHeight] = useState<number>(56);

  const measure = useCallback(() => {
    const w = asideRef.current?.getBoundingClientRect().width ?? (isCollapsed ? 68 : 256);
    const t = topBarRef.current?.getBoundingClientRect().height ?? 25;
    const b = bottomTabsRef.current?.getBoundingClientRect().height ?? 56;
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

    // Observe size changes smoothly
    const obs: ResizeObserver | null = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (asideRef.current) obs?.observe(asideRef.current);
    if (topBarRef.current) obs?.observe(topBarRef.current);
    if (bottomTabsRef.current) obs?.observe(bottomTabsRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      obs?.disconnect();
    };
  }, [measure]);

  // ===== Nav items =====
  const items = useMemo(
    () => [
      {
        href: '/dashboard',
        label: 'หน้าหลัก',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-7 9 7v8a2 2 0 01-2 2h-3m-8 0H5a2 2 0 01-2-2v-8" />
          </svg>
        ),
        show: true,
      },
      {
        href: '/dashboard/approvals',
        label: 'อนุมัติกิจกรรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V7a2 2 0 00-2-2H9l-4 4v9a2 2 0 002 2z" />
          </svg>
        ),
        show: canApprove,
      },
      {
        href: '/dashboard/activities',
        label: 'จัดการกิจกรรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 19h14a2 2 0 002-2v-6H3v6a2 2 0 002 2z" />
          </svg>
        ),
        show: canApprove,
      },
      {
        href: '/dashboard/clubs',
        label: 'จัดการชมรม',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a6 6 0 00-9-5.197M9 20H4v-1a6 6 0 0112 0v1M12 12a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        ),
        show: isAdmin || canApprove,
      },
      {
        href: '/admin/users',
        label: 'จัดการผู้ใช้',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A6 6 0 0112 15a6 6 0 016.879 2.804M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        show: isAdmin,
      },
      {
        href: '/dashboard/reports',
        label: 'รายงาน',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6H5l7-7 7 7h-4v6H9z" />
          </svg>
        ),
        show: isAdmin,
      },
    ],
    [isAdmin, canApprove]
  );

  const visibleItems = items.filter((i) => i.show);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ===== Mobile TopBar (md:hidden) ===== */}
      <div
        ref={topBarRef}
        className="md:hidden fixed top-0 inset-x-0 h-14 bg-white/90 backdrop-blur border-b border-gray-100 z-50"
      >
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold">V</div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">Volunteer</span>
              <span className="text-[11px] text-gray-500">แดชบอร์ด</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              โปรไฟล์
            </Link>
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              ออก
            </button>
          </div>
        </div>
      </div>

      {/* ===== Mobile Bottom Tabs (md:hidden) ===== */}
      <nav
        ref={bottomTabsRef as any}
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur"
      >
        <ul className="grid grid-cols-4">
          {visibleItems.slice(0, 4).map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs ${
                  isActive(it.href) ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className={`p-2 rounded-lg ${isActive(it.href) ? 'bg-green-50' : 'bg-transparent'}`}>
                  {it.icon}
                </span>
                <span className="leading-none">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ===== Desktop Sidebar (hidden on mobile) ===== */}
      <aside
        ref={asideRef}
        className={[
          'hidden md:flex fixed top-0 left-0 h-screen bg-white border-r border-gray-100 z-40',
          'transition-all duration-300 ease-out',
          isCollapsed ? 'w-[68px]' : 'w-64',
        ].join(' ')}
      >
        <div className="flex flex-col w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold">V</div>
                <div className="leading-tight">
                  <div className="text-[15px] font-semibold text-gray-900">Volunteer</div>
                  <div className="text-[11px] text-gray-500">Dashboard</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-50 text-gray-500"
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
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {visibleItems.map((it) => {
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    isCollapsed ? 'justify-center' : '',
                  ].join(' ')}
                >
                  <span className={`flex items-center justify-center ${isCollapsed ? '' : 'text-green-600'}`}>
                    {it.icon}
                  </span>
                  {!isCollapsed && <span className="font-medium">{it.label}</span>}

                  {/* Tooltip when collapsed */}
                  {isCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition group-hover:opacity-100">
                      {it.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile / Actions */}
          <div className="border-t border-gray-100 p-3">
            {!isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-green-600/10 text-green-700 flex items-center justify-center font-semibold">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {user?.email?.split('@')[0] || 'ผู้ใช้'}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/profile"
                    className="flex-1 text-center px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    โปรไฟล์
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    ออกระบบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-green-600/10 text-green-700 flex items-center justify-center font-semibold">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

      {/* ===== Auto spacers (ไม่ต้องไปใส่ margin/padding เองในทุกหน้า) ===== */}
      {/* ดันคอนเทนต์ออกจาก Sidebar (เฉพาะ Desktop) */}
      <div aria-hidden className="hidden md:block" style={{ width: sidebarWidth }} />
      {/* ดันคอนเทนต์ลงจาก TopBar (เฉพาะ Mobile) */}
      <div aria-hidden className="md:hidden" style={{ height: Math.min(topBarHeight, 0) }} />
      {/* ดันคอนเทนต์ขึ้นจาก BottomTabs (เฉพาะ Mobile) */}
      <div aria-hidden className="md:hidden" style={{ height: bottomTabsHeight }} />
    </>
  );
}
