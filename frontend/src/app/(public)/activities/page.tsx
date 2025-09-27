'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import ActivityCard from '@/components/ActivityCard';
import ActivityFilter, { FilterOptions } from '@/components/ActivityFilter';
import type { Activity } from '@/types/activity';
import { useToast } from '@/components/ui/toast';

type AnyActivity = Activity & Record<string, any>;
const PER_PAGE = 9;

function ActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterOptions>({
    search: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    dateStart: searchParams.get('dateStart') || '',
    dateEnd: searchParams.get('dateEnd') || '',
    clubId: searchParams.get('clubId') || '',
  });

  // Applied filters (what is actually sent to API)
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({
    search: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    dateStart: searchParams.get('dateStart') || '',
    dateEnd: searchParams.get('dateEnd') || '',
    clubId: searchParams.get('clubId') || '',
  });

  const [page, setPage] = useState(1);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Use activities hook with applied filters only
  const { activities = [], isLoading, error, mutate } = useActivities({
    status: 'approved',
    ...appliedFilters
  });

  // sync filters เมื่อ URL parameters เปลี่ยน
  useEffect(() => {
    const newFilters = {
      search: searchParams.get('q') || '',
      location: searchParams.get('location') || '',
      dateStart: searchParams.get('dateStart') || '',
      dateEnd: searchParams.get('dateEnd') || '',
      clubId: searchParams.get('clubId') || '',
    };
    setFilters(newFilters);
    setAppliedFilters(newFilters);
    setPage(1);
  }, [searchParams]);

  // แสดง error toast เมื่อโหลดข้อมูลไม่สำเร็จ
  useEffect(() => {
    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลกิจกรรมได้');
    }
  }, [error, toast]);

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = async () => {
    setIsApplyingFilters(true);
    setPage(1);

    // Update applied filters
    setAppliedFilters(filters);

    // Update URL with new filters
    const params = new URLSearchParams();
    if (filters.search && filters.search.trim()) params.set('q', filters.search.trim());
    if (filters.location && filters.location.trim()) params.set('location', filters.location.trim());
    if (filters.dateStart && filters.dateStart.trim()) params.set('dateStart', filters.dateStart.trim());
    if (filters.dateEnd && filters.dateEnd.trim()) params.set('dateEnd', filters.dateEnd.trim());
    if (filters.clubId && filters.clubId.trim()) params.set('clubId', filters.clubId.trim());

    const queryString = params.toString();
    router.push(`/activities${queryString ? `?${queryString}` : ''}`);

    // Trigger data refetch
    await mutate();
    setIsApplyingFilters(false);
  };

  // Since we're using backend filtering, we don't need client-side filtering
  const filtered = activities;

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
          <h1 className="text-3xl sm:text-5xl font-extrabold">ค้นหากิจกรรม</h1>
          <p className="text-green-100 mt-2">
            {Object.values(appliedFilters).some(v => v && v.trim()) 
              ? 'แสดงผลตามตัวกรอง' 
              : 'แสดงทุกกิจกรรม'
            }
          </p>
        </div>
      </header>

      {/* Filter Section */}
      <section className="py-6 bg-white/70 backdrop-blur border-b border-green-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <ActivityFilter
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            isLoading={isApplyingFilters}
          />
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

export default function ActivitiesSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center">กำลังโหลด…</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
