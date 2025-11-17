'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Activity } from '@/types/activity';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { CalendarDays, MapPin, Users, Clock, Eye, PlayCircle, Flag, CheckCircle } from 'lucide-react';
import { toAbsoluteImageUrl } from '@/lib/helpers/url';

type Status = 'approved' | 'pending' | 'rejected' | 'completed' | string;

function formatDate(dateString?: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: Status }) {
  const getStatusConfig = (status: Status) => {
    switch (status) {
      case 'approved':
        return { text: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-800 border-green-200' };
      case 'pending':
        return { text: 'รออนุมัติ', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'rejected':
        return { text: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-800 border-red-200' };
      case 'completed':
        return { text: 'เสร็จสิ้น', className: 'bg-gray-100 text-gray-800 border-gray-200' };
      default:
        return { text: status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={config.className}>
      {config.text}
    </Badge>
  );
}

export default function ActivityCard({ a }: { a: Activity }) {
  const { user } = useAuth();
  const { regs } = useMyRegistrations(!!user);

  const start = a.start_date ? new Date(a.start_date) : null;
  const end = a.end_date ? new Date(a.end_date) : null;
  const now = new Date();
  const registrationDeadline = (a as any).registration_deadline ? new Date((a as any).registration_deadline) : start;

  const isOngoing = !!(start && end && start <= now && end >= now);
  const isUpcoming = !!(start && start > now);
  const isPast = !!(end && end < now);
  const isRegistrationClosed = !!(registrationDeadline && registrationDeadline <= now);

  // Check if user is registered
  const myReg = regs.find(r => r.activity_id === a.id && r.status === 'registered');
  const isRegistered = !!myReg;

  // ตรวจสอบสถานะการสมัคร
  const isActivityApproved = a.status === 'approved';
  const approvedCount = a.approved_count || 0;
  const maxParticipants = a.max_participants || 0;
  const isActivityFull = maxParticipants > 0 && approvedCount >= maxParticipants;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-gray-200 hover:border-green-300 group">
      {/* Activity Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-100 to-indigo-100">
        {a.cover_url ? (
          <Image 
            src={toAbsoluteImageUrl(a.cover_url)} 
            alt={a.name || 'Activity image'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-100 to-indigo-100">
            <Flag className="w-16 h-16 text-green-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={a.status} />
        </div>

        {/* Time Status Badge */}
        <div className="absolute top-3 left-3">
          {isOngoing && (
            <Badge variant="default" className="bg-green-500 text-white border-0">
              <PlayCircle className="w-3 h-3 mr-1" />
              กำลังดำเนินการ
            </Badge>
          )}
          {isUpcoming && !isOngoing && (
            <Badge variant="secondary" className="bg-green-500 text-white border-0">
              <Clock className="w-3 h-3 mr-1" />
              เร็วๆ นี้
            </Badge>
          )}
          {isPast && (
            <Badge variant="outline" className="bg-gray-500 text-white border-gray-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              จบแล้ว
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
          {a.name}
        </h3>
        
        {/* Club Organizer */}
        {(a as any).club_name && (
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>จัดโดย: {(a as any).club_name}</span>
          </div>
        )}
        
        {a.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
            {a.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Registration Period */}
        {(a.registration_start_date || a.registration_end_date) && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-purple-500" />
            <div className="flex flex-col">
              <span className="font-medium text-xs text-purple-600 mb-1">ช่วงสมัคร:</span>
              <span>
                {a.registration_start_date 
                  ? formatDate(a.registration_start_date) 
                  : 'ไม่ระบุวันเริ่ม'
                }
                {a.registration_start_time && (
                  <span className="ml-1 text-xs">
                    {new Date(`1970-01-01T${a.registration_start_time}`).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
                {a.registration_end_date && (
                  <>
                    {' - '}
                    {formatDate(a.registration_end_date)}
                    {a.registration_end_time && (
                      <span className="ml-1 text-xs">
                        {new Date(`1970-01-01T${a.registration_end_time}`).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Activity Date and Time */}
        <div className="flex items-center text-sm text-gray-600">
          <CalendarDays className="w-4 h-4 mr-2 text-green-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs text-green-600 mb-1">วันที่จัดกิจกรรม:</span>
            <span>
              {start ? formatDate(a.start_date) : 'ไม่ระบุวันที่'}
              {a.start_time && (
                <span className="ml-1 text-xs">
                  {new Date(`1970-01-01T${a.start_time}`).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              {end && end.getTime() !== start?.getTime() && (
                <>
                  {' - '}
                  {formatDate(a.end_date)}
                  {a.end_time && (
                    <span className="ml-1 text-xs">
                      {new Date(`1970-01-01T${a.end_time}`).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Location */}
        {a.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-red-500" />
            <span className="line-clamp-1">{a.location}</span>
          </div>
        )}

        {/* Participants */}
        {a.max_participants && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-green-500" />
            <span className="font-medium">
              ผู้เข้าร่วม: <span className={`${isActivityFull ? 'text-red-600' : 'text-green-600'}`}>
                {approvedCount}
              </span> / {a.max_participants} คน
            </span>
            {isActivityFull && (
              <Badge variant="destructive" className="ml-2 text-xs">
                เต็มแล้ว
              </Badge>
            )}
          </div>
        )}

        {/* Registration Status for Students */}
        {user?.role === 'student' && (
          <div className="mt-3 space-y-2">
            {/* Registration Status */}
            {isRegistered && (
              <div className="flex items-center text-green-600 bg-green-50 p-2 rounded-md">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">คุณได้สมัครเข้าร่วมแล้ว</span>
              </div>
            )}

            {/* Status Indicators */}
            {!isActivityApproved && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                รออนุมัติ
              </Badge>
            )}
            
            {isPast && (
              <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                สิ้นสุดแล้ว
              </Badge>
            )}
            
            {isRegistrationClosed && !isPast && (
              <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                หมดเวลาสมัคร
              </Badge>
            )}
            
            {isActivityFull && (
              <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                เต็มแล้ว
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Link href={`/activities/${a.id}`} className="w-full">
          <Button className="cursor-pointer w-full bg-green-200 group-hover:bg-green-300 group-hover:border-green-300 transition-colors">
            <Eye className="w-4 h-4 mr-2" />
            ดูรายละเอียด
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
