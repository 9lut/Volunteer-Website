'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import RecentActivities from '@/components/activity/RecentActivities';
import ActivityCard from '@/components/ActivityCard';
import ActivityFilter, { FilterOptions } from '@/components/ActivityFilter';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
      <div className="h-40 rounded-xl bg-gray-200 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();

  // Filter state for home page
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    location: '',
    dateStart: '',
    dateEnd: '',
    clubId: ''
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(true), []);

  // Use activities hook - แสดงทั้งหมดโดยไม่กรอง (เฉพาะ approved)
  const { activities = [], isLoading, error, mutate } = useActivities({
    status: 'approved'
  });

  // แสดง error toast เมื่อมีข้อผิดพลาด
  useEffect(() => {
    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาลองใหม่อีกครั้ง');
    }
  }, [error, toast]);


  // Additional category filtering (on top of backend filtering)
  const filteredActivities = useMemo(() => {
    return activities.filter((a: any) => {
      const inCategory =
        selectedCategory === 'ทั้งหมด' ||
        String(a?.category || '').toLowerCase() === selectedCategory.toLowerCase();
      return inCategory;
    });
  }, [activities, selectedCategory]);


  // Handle filter changes (ไม่กรองในหน้านี้)
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // ไปหน้า /activities พร้อมตัวกรองที่ตั้งไว้
  const goActivitiesWithFilters = () => {
    const params = new URLSearchParams();

    if (filters.search && filters.search.trim()) {
      params.set('q', filters.search.trim());
    }
    if (filters.location && filters.location.trim()) {
      params.set('location', filters.location.trim());
    }
    if (filters.dateStart && filters.dateStart.trim()) {
      params.set('dateStart', filters.dateStart.trim());
    }
    if (filters.dateEnd && filters.dateEnd.trim()) {
      params.set('dateEnd', filters.dateEnd.trim());
    }
    if (filters.clubId && filters.clubId.trim()) {
      params.set('clubId', filters.clubId.trim());
    }

    const queryString = params.toString();
    router.push(`/activities${queryString ? `?${queryString}` : ''}`);
  };

  if (error) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <p className="text-red-600">เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600" />
        <div
          className={`relative container mx-auto px-4 py-16 sm:py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
        >
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="flex justify-center mb-5 sm:mb-6">
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight">
              ศูนย์รวม <span className="text-green-300">กิจกรรม</span> และ{' '}
              <span className="text-yellow-300">จิตอาสา</span> ในมหาวิทยาลัย
            </h1>
            <p className="text-base sm:text-xl text-green-100 mb-6 sm:mb-8 leading-relaxed">
              ค้นหา กรอง และเข้าร่วมกิจกรรมที่ตรงใจคุณได้ง่ายๆ ด้วยระบบตัวกรองที่ครบถ้วน
            </p>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
          <svg className="relative block w-full h-16 sm:h-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
              className="fill-green-50"
            />
          </svg>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-3 sm:py-4 -mt-20">
        <div className="container mx-auto px-4 max-w-6xl flex justify-center ">
          <div className="w-full max-w-[1000px] bg-white/70 z-30 backdrop-blur border-b border-green-100 rounded-xl">
            <ActivityFilter
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onApplyFilters={goActivitiesWithFilters}
              isLoading={false}
              buttonText="ค้นหา"
              placeholder="ตั้งค่าตัวกรองแล้วกด 'ค้นหา' เพื่อดูผลลัพธ์..."
            />

            <div className="mt-3 text-sm text-gray-600 text-center">
              {Object.values(filters).some(v => v && v.trim()) && (
                <span className="ml-2 text-green-600">
                  • ตั้งค่าตัวกรองแล้ว กดปุ่มเพื่อดูผลลัพธ์
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activities */}
      <RecentActivities activities={activities} isLoading={isLoading} title="กิจกรรม" take={3} />

      {/* All Activities (ตัวอย่างบางส่วน) */}
      <section className="py-8 sm:py-12 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-800 mb-6 sm:mb-8 text-center">
              กิจกรรม<span className="text-green-600"> ทั้งหมด </span>
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                  {filteredActivities.slice(0, 6).map((a: any) => (
                    <ActivityCard key={a.id} a={a} />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
                  <button
                    onClick={goActivitiesWithFilters}
                    className="px-6 sm:px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    ดูทั้งหมดในหน้ากรอง
                  </button>
                  <button
                    onClick={() => router.push('/activities')}
                    className="px-6 sm:px-8 py-3 rounded-xl border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold transition-all duration-200"
                  >
                    ดูกิจกรรมทั้งหมด
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-green-400 to-gray-100 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
            เริ่มต้นสร้างการเปลี่ยนแปลง <span className="text-yellow-300">วันนี้!</span>
          </h2>
          <p className="text-base sm:text-xl text-green-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
            เข้าร่วมชุมชนอาสาสมัครและร่วมสร้างสรรค์สังคมที่ดีกว่าไปด้วยกัน
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/register">
              <Button className="cursor-pointer bg-white text-green-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-green-50 transition-all duration-300 hover:scale-[1.02] shadow-lg">
                ลงทะเบียนเป็นอาสาสมัคร
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
