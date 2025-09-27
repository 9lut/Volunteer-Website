'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { api } from '@/lib/axios';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { CalendarDays, MapPin, ArrowLeft, Clock, Users, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { toAbsoluteImageUrl } from '@/lib/helpers/url';

export default function ActivityDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const { activity, isLoading } = useActivity(id);
  const { regs, mutate } = useMyRegistrations(!!user);
  const toast = useToast();

  // Loading states
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Confirmation dialog states
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className=" flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบกิจกรรม</h2>
          <p className="text-gray-600 mb-4">กิจกรรมที่คุณค้นหาอาจถูกลบหรือไม่มีอยู่</p>
          <Button asChild variant="outline">
            <Link href="/">กลับสู่หน้าหลัก</Link>
          </Button>
        </div>
      </div>
    );
  }

  const myReg = regs.find(r => r.activity_id === id && r.status === 'registered');
  const isRegistered = !!myReg;

  // ตรวจสอบสถานะการสมัคร
  const now = new Date();
  const startDate = new Date(activity.start_date);
  const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
  const registrationDeadline = activity.registration_deadline ? new Date(activity.registration_deadline) : startDate;
  
  // สถานะกิจกรรม
  const isActivityExpired = endDate < now; // กิจกรรมผ่านไปแล้ว
  const isActivityStarted = startDate <= now; // กิจกรรมเริ่มแล้ว
  const isRegistrationClosed = registrationDeadline <= now; // ปิดรับสมัครแล้ว
  const isActivityFull = activity.max_participants && activity.current_participants >= activity.max_participants;
  const isActivityApproved = activity.status === 'approved';

  // สถานะการสมัคร
  const canRegister = !isRegistered && 
                     isActivityApproved && 
                     !isActivityExpired && 
                     !isRegistrationClosed && 
                     !isActivityFull &&
                     user?.role === 'student';

  const canCancelRegistration = isRegistered && 
                               !isActivityStarted && 
                               !isActivityExpired;

  const handleRegisterClick = () => {
    if (!canRegister) {
      if (!isActivityApproved) {
        toast.warning('กิจกรรมยังไม่เปิดให้สมัคร', 'รอการอนุมัติจากผู้ดูแลระบบ');
      } else if (isActivityExpired) {
        toast.warning('กิจกรรมสิ้นสุดแล้ว', 'ไม่สามารถสมัครกิจกรรมที่ผ่านไปแล้วได้');
      } else if (isRegistrationClosed) {
        toast.warning('ปิดรับสมัครแล้ว', 'หมดเวลาการรับสมัครสำหรับกิจกรรมนี้');
      } else if (isActivityFull) {
        toast.warning('กิจกรรมเต็มแล้ว', 'ขออภัย จำนวนผู้เข้าร่วมเต็มแล้ว');
      } else if (user?.role !== 'student') {
        toast.warning('ไม่สามารถสมัครได้', 'เฉพาะนักเรียน/นักศึกษาเท่านั้นที่สามารถสมัครได้');
      }
      return;
    }
    setShowRegisterConfirm(true);
  };

  const register = async () => {
    try {
      setIsRegistering(true);
      await api.post(`/api/activities/${id}/register`);
      await mutate();
      router.refresh();
      
      toast.success('สมัครสำเร็จ!', `คุณได้สมัครเข้าร่วมกิจกรรม "${activity?.name}" เรียบร้อยแล้ว`);
      setShowRegisterConfirm(false);
    } catch (error: any) {
      console.error('Registration failed:', error);
      const message = error?.response?.data?.message || 'ไม่สามารถสมัครได้ในขณะนี้';
      toast.error('สมัครไม่สำเร็จ', message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelClick = () => {
    if (!canCancelRegistration) {
      if (isActivityStarted) {
        toast.warning('ไม่สามารถยกเลิกได้', 'ไม่สามารถยกเลิกการสมัครหลังจากกิจกรรมเริ่มแล้ว');
      } else if (isActivityExpired) {
        toast.warning('ไม่สามารถยกเลิกได้', 'กิจกรรมสิ้นสุดแล้ว');
      }
      return;
    }
    setShowCancelConfirm(true);
  };

  const cancel = async () => {
    try {
      setIsCancelling(true);
      await api.delete(`/api/activities/${id}/register`);
      await mutate();
      router.refresh();
      
      toast.success('ยกเลิกสำเร็จ', `คุณได้ยกเลิกการสมัครกิจกรรม "${activity?.name}" เรียบร้อยแล้ว`);
      setShowCancelConfirm(false);
    } catch (error: any) {
      console.error('Cancellation failed:', error);
      const message = error?.response?.data?.message || 'ไม่สามารถยกเลิกได้ในขณะนี้';
      toast.error('ยกเลิกไม่สำเร็จ', message);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 border-green-200';
      case 'pending':
        return 'text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'text-red-700 border-red-200';
      default:
        return 'text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'pending': return 'รออนุมัติ';
      case 'rejected': return 'ไม่อนุมัติ';
      default: return status;
    }
  };

  const coverSrc = toAbsoluteImageUrl(activity.cover_url);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image */}
            {coverSrc ? (
              <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gray-100">
                <Image
                  src={coverSrc}
                  alt={activity.name || 'Activity cover image'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                  priority
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            ) : (
              <div className="flex h-64 md:h-80 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                ไม่มีรูปภาพ
              </div>
            )}


            {/* Title & Status */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {activity.name}
                </h1>
                <Badge className={`${getStatusColor(activity.status)} px-3 py-1`}>
                  {getStatusText(activity.status)}
                </Badge>
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">รายละเอียดกิจกรรม</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {activity.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Info Card */}
            <Card className="border-0 shadow-sm sticky top-6">
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">ข้อมูลกิจกรรม</h3>

                {/* Date Range */}
                <div className="flex items-start space-x-3">
                  <CalendarDays className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">วันที่</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(activity.start_date)}
                      {activity.end_date && activity.start_date !== activity.end_date && (
                        <>
                          <br />
                          ถึง {formatDate(activity.end_date)}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">สถานที่</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.location || 'ไม่ระบุสถานที่'}
                    </p>
                  </div>
                </div>

                {/* Participants (if available) */}
                {(activity.max_participants || activity.current_participants) && (
                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">ผู้เข้าร่วม</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.current_participants || 0}
                        {activity.max_participants && ` / ${activity.max_participants}`} คน
                      </p>
                    </div>
                  </div>
                )}

                {/* Time Remaining */}
                {!isActivityExpired && (
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">สถานะกิจกรรม</p>
                      {isActivityStarted ? (
                        <p className="text-sm text-blue-600 mt-1 font-medium">
                          กำลังดำเนินการ
                        </p>
                      ) : (
                        <p className="text-sm text-orange-600 mt-1 font-medium">
                          อีก {Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} วัน
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Deadline */}
                {activity.registration_deadline && !isRegistrationClosed && !isActivityExpired && (
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">ปิดรับสมัคร</p>
                      <p className="text-sm text-red-600 mt-1 font-medium">
                        {formatDate(activity.registration_deadline)}
                        {Math.ceil((registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 3 && (
                          <span className="block text-xs">เหลือเวลาไม่มาก!</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <hr className="border-gray-100" />

                {/* Registration Section */}
                <div className="space-y-4">
                  {!user ? (
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      <Link href="/login">
                        เข้าสู่ระบบเพื่อสมัคร
                      </Link>
                    </Button>
                  ) : user.role !== 'student' ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Users className="w-5 h-5" />
                        <div>
                          <p className="font-medium">ไม่สามารถสมัครได้</p>
                          <p className="text-sm text-gray-600">เฉพาะนักเรียน/นักศึกษาเท่านั้นที่สามารถสมัครได้</p>
                        </div>
                      </div>
                    </div>
                  ) : isActivityExpired ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Clock className="w-5 h-5" />
                        <div>
                          <p className="font-medium">กิจกรรมสิ้นสุดแล้ว</p>
                          <p className="text-sm text-gray-600">กิจกรรมนี้ได้ดำเนินการเสร็จสิ้นแล้ว</p>
                        </div>
                      </div>
                    </div>
                  ) : !isActivityApproved ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-amber-800">
                        <Clock className="w-5 h-5" />
                        <div>
                          <p className="font-medium">กิจกรรมยังไม่เปิดให้สมัคร</p>
                          <p className="text-sm text-amber-700">รอการอนุมัติจากผู้ดูแลระบบ</p>
                        </div>
                      </div>
                    </div>
                  ) : isRegistrationClosed ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-800">
                        <Clock className="w-5 h-5" />
                        <div>
                          <p className="font-medium">ปิดรับสมัครแล้ว</p>
                          <p className="text-sm text-red-700">
                            หมดเวลาการรับสมัครเมื่อ {formatDate(activity.registration_deadline || activity.start_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isActivityFull ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-800">
                        <Users className="w-5 h-5" />
                        <div>
                          <p className="font-medium">กิจกรรมเต็มแล้ว</p>
                          <p className="text-sm text-red-700">
                            จำนวนผู้เข้าร่วมเต็มแล้ว ({activity.current_participants}/{activity.max_participants})
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : !isRegistered ? (
                    <div className="space-y-3">
                      <LoadingButton
                        onClick={handleRegisterClick}
                        loading={isRegistering}
                        loadingText="กำลังสมัคร..."
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        disabled={!canRegister}
                      >
                        สมัครเข้าร่วมกิจกรรม
                      </LoadingButton>
                      
                      {/* Additional warnings */}
                      {activity.registration_deadline && Math.ceil((registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 3 && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-orange-800 text-sm font-medium">
                            ⚠️ เหลือเวลารับสมัครไม่มาก - รีบสมัครเลย!
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-green-800">
                          <CheckCircle className="w-5 h-5" />
                          <div>
                            <p className="font-medium">คุณได้สมัครกิจกรรมนี้แล้ว</p>
                            <p className="text-sm text-green-700">
                              สมัครเมื่อ: {myReg && new Date(myReg.created_at).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {canCancelRegistration ? (
                        <LoadingButton
                          onClick={handleCancelClick}
                          loading={isCancelling}
                          loadingText="กำลังยกเลิก..."
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50"
                          size="lg"
                        >
                          ยกเลิกการสมัคร
                        </LoadingButton>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-700 text-sm">
                            {isActivityStarted 
                              ? "ไม่สามารถยกเลิกได้ เนื่องจากกิจกรรมเริ่มแล้ว" 
                              : "ไม่สามารถยกเลิกได้ เนื่องจากกิจกรรมสิ้นสุดแล้ว"
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <p>สร้างเมื่อ: {new Date(activity.created_at).toLocaleDateString('th-TH')}</p>
                  {activity.updated_at !== activity.created_at && (
                    <p>อัพเดทล่าสุด: {new Date(activity.updated_at).toLocaleDateString('th-TH')}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">การดำเนินการ</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/">
                      ดูกิจกรรมอื่นๆ
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/history">
                      ประวัติการสมัคร
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showRegisterConfirm}
        onOpenChange={setShowRegisterConfirm}
        title="ยืนยันการสมัคร"
        description={`คุณต้องการสมัครเข้าร่วมกิจกรรม "${activity?.name}" ใช่หรือไม่?`}
        confirmText="สมัครเลย"
        loading={isRegistering}
        onConfirm={register}
      />

      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="ยืนยันการยกเลิก"
        description={`คุณต้องการยกเลิกการสมัครกิจกรรม "${activity?.name}" ใช่หรือไม่?`}
        confirmText="ยกเลิกเลย"
        variant="destructive"
        loading={isCancelling}
        onConfirm={cancel}
      />
    </div>
  );
}