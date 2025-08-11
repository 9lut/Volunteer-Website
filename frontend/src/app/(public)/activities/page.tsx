'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import ActivityCard from '@/components/ActivityCard';

type AnyActivity = Record<string, any>;
const PER_PAGE = 9;

export default function ActivitiesSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = (searchParams.get('q') || '').trim();
  const { activities = [], isLoading, error } = useActivities('approved');

  const [nameInput, setNameInput] = useState(q);
  const [page, setPage] = useState(1);

  // sync input เมื่อ q ใน URL เปลี่ยน + reset page
  useEffect(() => {
    setNameInput(q);
    setPage(1);
  }, [q]);

  // กรองตาม q
  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return activities.filter((a: AnyActivity) => {
      const text = `${a?.title || a?.name || ''} ${a?.description || ''}`.toLowerCase();
      return !term || text.includes(term);
    });
  }, [activities, q]);

  // เรียงล่าสุดก่อน (ถ้ามีวันที่)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const hasDate = arr.some((a) => a?.start_date || a?.createdAt);
    if (!hasDate) return arr;
    return arr.sort((a: AnyActivity, b: AnyActivity) => {
      const da =
        a?.start_date ? new Date(a.start_date).getTime()
        : a?.createdAt ? new Date(a.createdAt).getTime()
        : 0;
      const db =
        b?.start_date ? new Date(b.start_date).getTime()
        : b?.createdAt ? new Date(b.createdAt).getTime()
        : 0;
      return db - da;
    });
  }, [filtered]);

  // pagination (local state เท่านั้น)
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const displayed = sorted.slice(start, start + PER_PAGE);

  const goPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  const onSubmitSearch = () => {
    const term = nameInput.trim();
    if (term) router.push(`/activities?q=${encodeURIComponent(term)}`);
    else router.push('/activities');
  };

  if (error) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <p className="text-red-600">เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-5xl font-extrabold">ผลการค้นหากิจกรรม</h1>
          <p className="text-green-100 mt-2">
            {q ? <>คำค้น: <span className="font-semibold">"{q}"</span></> : 'แสดงทุกกิจกรรม'}
          </p>
        </div>
      </header>

      {/* แถบค้นหา */}
      <section className="py-4 sm:py-6 bg-white/70 sticky top-0 z-30 backdrop-blur border-b border-green-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white border border-green-200 rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  aria-label="ค้นหากิจกรรม"
                  type="text"
                  placeholder="พิมพ์คำที่ต้องการ แล้วกดค้นหา"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch()}
                />
              </div>
              <button
                onClick={onSubmitSearch}
                className="shrink-0 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">ค้นหา</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ผลลัพธ์ */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 animate-pulse">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="h-40 rounded-xl bg-gray-200 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : displayed.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                {displayed.map((a: AnyActivity) => (
                  <ActivityCard key={a.id} a={a} />
                ))}
              </div>

              {/* Pagination (local) */}
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-green-200 text-green-700 disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`px-4 py-2 rounded-lg border ${
                        p === page
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-green-200 text-green-700 disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 sm:w-12 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">ไม่พบกิจกรรมที่ตรงกับการค้นหา</h3>
              <p className="text-gray-500 text-sm sm:text-base">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่อีกครั้ง</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
