'use client';

import React, { useMemo } from 'react';
import ActivityCard from '@/components/ActivityCard';

type AnyActivity = Record<string, any>;

type Variant = 'latest' | 'upcoming'; 
// latest = อิง updated_at/created_at ล่าสุดก่อน
// upcoming = อิง start_date ใกล้เริ่มก่อน (อนาคต)

export default function RecentActivities({
  activities = [],
  title = 'กิจกรรม',
  take = 3,
  isLoading = false,
  variant = 'latest', // <-- เลือกโหมดได้
}: {
  activities: AnyActivity[];
  title?: string;
  take?: number;
  isLoading?: boolean;
  variant?: Variant;
}) {
  const get = (o: any, ...keys: string[]) => keys.reduce<any>((v, k) => (v ?? o?.[k]), undefined);

  const list = useMemo(() => {
    const now = Date.now();
    const arr = [...activities];

    if (variant === 'upcoming') {
      // เอาเฉพาะอนาคต เรียงใกล้เริ่มก่อน
      const withStart = arr
        .map(a => ({ a, start: get(a, 'start_date', 'startDate') }))
        .filter(x => x.start && !Number.isNaN(new Date(x.start).getTime()))
        .filter(x => new Date(x.start).getTime() >= now)
        .sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime())
        .map(x => x.a);
      return withStart;
    }

    // latest: อิง updated_at > created_at
    return arr
      .map(a => ({
        a,
        updated: get(a, 'updated_at', 'updatedAt'),
        created: get(a, 'created_at', 'createdAt'),
      }))
      .sort((x, y) => {
        const dx = new Date(x.updated ?? x.created ?? 0).getTime();
        const dy = new Date(y.updated ?? y.created ?? 0).getTime();
        return dy - dx; // ใหม่สุดก่อน
      })
      .map(x => x.a);
  }, [activities, variant]);

  const visible = useMemo(() => list.slice(0, take), [list, take]);

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-800 mb-2 sm:mb-4">
                {title} <span className="text-green-600">{variant === 'upcoming' ? ' ใกล้เริ่ม ' : ' ล่าสุด '}</span>
              </h2>
              <p className="text-gray-600 text-sm sm:text-lg">กำลังโหลด...</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="h-40 rounded-xl bg-gray-200 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-800 mb-2 sm:mb-4">
              {title}
              <span className="text-green-600">
                {variant === 'upcoming' ? ' ใกล้เริ่ม' : ' ล่าสุด'}
              </span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-lg">
              {variant === 'upcoming' ? 'กิจกรรมที่จะเริ่มเร็ว ๆ นี้' : 'อัปเดต/โพสต์ล่าสุดจากผู้จัด'}
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-600">
                {variant === 'upcoming' ? 'ยังไม่มีกิจกรรมที่กำลังจะเริ่ม' : 'ยังไม่มีกิจกรรมล่าสุด'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {visible.map((a: any) => (
                <ActivityCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
