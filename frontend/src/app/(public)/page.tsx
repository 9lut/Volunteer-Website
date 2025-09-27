'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, Filter, Leaf, Award, Globe, Heart } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import RecentActivities from '@/components/activity/RecentActivities';
import ActivityCard from '@/components/ActivityCard';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

function StatsCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-xl flex items-center justify-center mb-3 sm:mb-4`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-gray-600 text-sm">{label}</div>
    </div>
  );
}

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
  const { activities = [], isLoading, error } = useActivities('approved');
  const toast = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(true), []);

  // แสดง error toast เมื่อมีข้อผิดพลาด
  useEffect(() => {
    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาลองใหม่อีกครั้ง');
    }
  }, [error, toast]);

  // หมวดหมู่จากข้อมูลจริง
  const categories = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a: any) => a?.category && set.add(String(a.category)));
    return ['ทั้งหมด', ...Array.from(set)];
  }, [activities]);

  // กรองในหน้า Home (แค่โชว์ตัวอย่าง)
  const filteredActivities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return activities.filter((a: any) => {
      const inCategory =
        selectedCategory === 'ทั้งหมด' ||
        String(a?.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const text = `${a?.name || ''} ${a?.description || ''}`.toLowerCase();
      const inSearch = !term || text.includes(term);
      return inCategory && inSearch;
    });
  }, [activities, selectedCategory, searchTerm]);

  // สถิติ
  const totalActivities = activities.length;
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a: any) => {
      const loc = a?.location || a?.province || a?.campus;
      if (loc) set.add(String(loc));
    });
    return set.size;
  }, [activities]);
  const uniqueOrgs = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a: any) => {
      const org = a?.organizer || a?.clubName || a?.organization;
      if (org) set.add(String(org));
    });
    return set.size;
  }, [activities]);

  // กดค้นหา -> ไปหน้า /activities?q=...
  const goSearchPage = () => {
    const term = searchTerm.trim();
    if (term) {
      router.push(`/activities?q=${encodeURIComponent(term)}`);
    } else {
      router.push('/activities'); // ไม่มี q ก็ไปหน้ารวม
    }
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
          className={`relative container mx-auto px-4 py-16 sm:py-20 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
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
              ค้นหา เข้าร่วม และสร้างการเปลี่ยนแปลงที่จับต้องได้ในชุมชนของคุณ
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

      {/* Search (sticky mobile) */}
      <section className="py-3 sm:py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="sticky top-0 z-30 -mx-4 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-green-100 sm:static sm:p-0 sm:bg-transparent sm:border-0">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-green-200">
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      aria-label="ค้นหากิจกรรม"
                      type="text"
                      placeholder="ค้นหากิจกรรมที่คุณสนใจ..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') goSearchPage();
                      }}
                    />
                  </div>
                  <button
                    aria-label="ค้นหา"
                    className="shrink-0 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    onClick={goSearchPage}
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden sm:inline">ค้นหา</span>
                  </button>
                </div>

                {/* Category chips (กรองเฉพาะในหน้า Home) */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm">หมวดหมู่</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map((category) => {
                      const active = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={[
                            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 snap-start',
                            active ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                                   : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700',
                          ].join(' ')}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  พบ <span className="font-semibold text-green-700">{filteredActivities.length}</span> กิจกรรมที่ตรงกับตัวกรองบนหน้านี้
                </div>
              </div>
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
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => router.push('/activities')}
                    className="px-6 sm:px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shadow-lg shadow-green-600/20"
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
      <section className="py-16 sm:py-20 bg-gradient-to-r from-green-600 to-emerald-600 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
            เริ่มต้นสร้างการเปลี่ยนแปลง <span className="text-yellow-300">วันนี้!</span>
          </h2>
          <p className="text-base sm:text-xl text-green-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
            เข้าร่วมชุมชนอาสาสมัครและร่วมสร้างสรรค์สังคมที่ดีกว่าไปด้วยกัน
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button className="bg-white text-green-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-green-50 transition-all duration-300 hover:scale-[1.02] shadow-lg">
              ลงทะเบียนเป็นอาสาสมัคร
            </button>
            <button className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-white hover:text-green-700 transition-all duration-300 hover:scale-[1.02]">
              สร้างกิจกรรม
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
