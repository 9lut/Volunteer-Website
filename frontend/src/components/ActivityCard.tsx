'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Activity } from '@/types/activity';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Users, Clock, Eye, PlayCircle, Flag } from 'lucide-react';
import { toAbsoluteImageUrl } from '@/lib/helpers/url';

type Status = 'approved' | 'pending' | 'rejected' | 'completed' | string;

function formatDate(dateString?: string | null) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusStyle(status: Status) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function pickCoverUrl(a: Activity): string {
  const raw =
    (a as any).cover_url ||
    (a as any).image_url ||
    a?.images?.[0]?.image_url ||
    '';
  const abs = toAbsoluteImageUrl(raw);
  return abs || '/no-image.jpg';
}

export default function ActivityCard({ a }: { a: Activity }) {
  const start = a.start_date ? new Date(a.start_date) : null;
  const end = a.end_date ? new Date(a.end_date) : null;
  const now = new Date();

  const isOngoing = !!(start && end && start <= now && end >= now);
  const isUpcoming = !!(start && start > now);
  const isCompleted = !!(end && end < now);

  const daysUntil = isUpcoming
    ? Math.max(0, Math.ceil((start!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const dateLabel = (() => {
    const s = formatDate(a.start_date);
    const e = formatDate(a.end_date);
    if (s && e && s !== e) return `${s} - ${e}`;
    return s || e || '-';
  })();

  const canRegister = a.status === 'approved';
  const coverUrl = pickCoverUrl(a);

  return (
    <Card className="group relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl border-2 border-gray-100 rounded-xl bg-white">
      {/* ส่วนรูปภาพ */}
      <Link href={`/activities/${a.id}`} className="relative block h-48 w-full overflow-hidden">
        <Image
          src={coverUrl}
          alt={a.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Badge สถานะ */}
        <div className="absolute top-3 right-3 z-10">
          {a.status && (
            <Badge
              variant="outline"
              className={`font-medium shadow-sm ${getStatusStyle(a.status)}`}
            >
              {a.title}
            </Badge>
          )}
        </div>
      </Link>

      {/* ส่วนเนื้อหา */}
      <CardHeader className="p-4 md:p-6 flex-grow">
        <div className="flex flex-col gap-2">
          {/* ชื่อกิจกรรม */}
          <Link href={`/activities/${a.id}`} className="block">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight transition-colors duration-200 hover:text-green-700">
              {a.title}
            </h3>
          </Link>
          {/* รายละเอียด */}
          {a.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {a.description}
            </p>
          )}
        </div>
      </CardHeader>

      {/* ส่วนรายละเอียดเพิ่มเติม */}
      <CardContent className="p-4 md:px-6 md:pt-0 pt-0 space-y-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <CalendarDays className="w-4 h-4 text-green-600 shrink-0" />
          <span className="font-medium text-gray-800">{dateLabel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-green-600 shrink-0" />
          <span className="font-medium text-gray-800">{a.location || 'ไม่ระบุสถานที่'}</span>
        </div>

        {((a as any).max_participants || (a as any).current_participants) ? (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Users className="w-4 h-4 text-green-600 shrink-0" />
            <span className="font-medium text-gray-800">
              ผู้เข้าร่วม: <span className="text-green-700">{(a as any).current_participants || 0}</span>
              {(a as any).max_participants ? (
                <>
                  <span className="text-gray-400"> / </span>
                  <span className="text-gray-500">{(a as any).max_participants}</span>
                </>
              ) : null}
            </span>
          </div>
        ) : null}

        {/* แสดงสถานะเวลา */}
        {isUpcoming && (
          <div className="flex items-center gap-2 text-sm text-orange-600 font-bold">
            <Clock className="w-4 h-4 shrink-0" />
            <span>เหลือเวลา {daysUntil} วัน</span>
          </div>
        )}
        {isOngoing && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
            <PlayCircle className="w-4 h-4 shrink-0 animate-pulse" />
            <span>กำลังดำเนินอยู่</span>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
            <Flag className="w-4 h-4 shrink-0" />
            <span>กิจกรรมผ่านไปแล้ว</span>
          </div>
        )}
      </CardContent>

      {/* ส่วน Footer และปุ่ม */}
      <CardFooter className="p-4 md:p-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex-grow flex-shrink">
          {(a as any).category ? (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
              {(a as any).category}
            </Badge>
          ) : null}
        </div>

        <Button asChild size="sm" className="flex-grow flex-shrink bg-green-600 text-white hover:bg-green-700 transition-colors">
          <Link href={`/activities/${a.id}`}>
            <Eye className="w-4 h-4 mr-2" />
            ดูรายละเอียด
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}