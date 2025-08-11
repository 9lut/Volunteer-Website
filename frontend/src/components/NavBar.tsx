'use client';
import Link from 'next/link';
import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_MAIN, NAV_SIDE, NAV_MOBILE } from '@/config/nav';

export default function NavBar() {
  const { user, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // === NEW: วัดความสูง navbar แล้วสร้าง spacer อัตโนมัติ ===
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState<number>(64); // fallback กันกระพริบ

  const updateNavHeight = useCallback(() => {
    const h = navRef.current?.getBoundingClientRect().height ?? 64;
    setNavHeight(Math.ceil(h));
  }, []);

  useLayoutEffect(() => {
    updateNavHeight();
  }, [updateNavHeight]);

  useEffect(() => {
    const onResize = () => updateNavHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateNavHeight]);

  // เมื่อเปิด/ปิดเมนูมือถือ หรือโปรไฟล์ dropdown ให้รีเฟรชความสูง
  useEffect(() => {
    updateNavHeight();
  }, [isMobileMenuOpen, isProfileOpen, updateNavHeight]);

  // เงา/พื้นหลังเมื่อ scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ปิดโปรไฟล์เมื่อคลิกนอก navbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const NavLink = ({
    href,
    label,
    mobile = false,
  }: {
    href: string;
    label: string;
    mobile?: boolean;
  }) => (
    <Link
      href={href}
      className={
        mobile
          ? 'block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors'
          : 'text-gray-600 hover:text-gray-900 transition-colors font-medium'
      }
      onClick={() => mobile && setIsMobileMenuOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <>
      {/* NAV: fixed อยู่บนสุดเสมอ */}
      <nav
        ref={navRef}
        className={`fixed top-0 inset-x-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* โลโก้ + เมนู (Desktop) */}
            <div className="flex items-center space-x-6">
              <Link
                href="/"
                className="text-xl font-bold text-gray-900 hover:text-green-600 transition-colors"
              >
                Volunteer
              </Link>

              <div className="hidden lg:flex items-center space-x-6">
                {NAV_MAIN.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
                {NAV_SIDE.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>
            </div>

            {/* ฝั่งขวา: Auth/โปรไฟล์ + Hamburger */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!user ? (
                <>
                  {/* Desktop Auth */}
                  <div className="hidden sm:flex items-center space-x-3">
                    <Link
                      href="/register"
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                    >
                      สมัครสมาชิก
                    </Link>
                    <Link
                      href="/login"
                      className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-medium shadow-sm"
                    >
                      เข้าสู่ระบบ
                    </Link>
                  </div>
                  {/* Mobile Auth */}
                  <Link
                    href="/login"
                    className="sm:hidden px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen((v) => !v)}
                    className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-full hover:bg-gray-50 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={isProfileOpen}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user.email?.split('@')[0]}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
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
                            className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
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
              )}

              {/* ปุ่มเมนูมือถือ */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* เมนูมือถือ */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden mt-4 py-4 border-t border-gray-100">
            <div className="space-y-2">
              {NAV_MOBILE.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} mobile />
              ))}
              {!user && (
                <div className="pt-2 border-t border-gray-100 mt-4 space-y-2">
                  <Link
                    href="/register"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    สมัครสมาชิก
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* === NEW: spacer ด้านล่าง navbar เพื่อดันคอนเทนต์ลงอัตโนมัติ === */}
      <div aria-hidden="true" style={{ height: navHeight }} />
    </>
  );
}
