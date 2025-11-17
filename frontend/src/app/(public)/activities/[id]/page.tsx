'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { useActivityImages } from '@/hooks/useActivityImages';
import { api } from '@/lib/axios';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { CalendarDays, MapPin, ArrowLeft, Clock, Users, CheckCircle, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toAbsoluteImageUrl } from '@/lib/helpers/url';

export default function ActivityDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const { activity, isLoading } = useActivity(id);
  const { images, isLoading: imagesLoading } = useActivityImages(id);
  const { regs, mutate } = useMyRegistrations(!!user);
  const toast = useToast();

  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Loading states
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Confirmation dialog states
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Prepare images array
  const activityImages = images && images.length > 0 
    ? images.map(img => toAbsoluteImageUrl(img.image_url))
    : activity?.cover_url 
      ? [toAbsoluteImageUrl(activity.cover_url)]
      : [];

  // Auto-advance slideshow
  useEffect(() => {
    if (activityImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % activityImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [activityImages.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % activityImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + activityImages.length) % activityImages.length);
  };

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
  const approvedCount = activity.approved_count || 0;
  const isActivityExpired = endDate < now; // กิจกรรมผ่านไปแล้ว
  const isActivityStarted = startDate <= now; // กิจกรรมเริ่มแล้ว
  const isRegistrationClosed = registrationDeadline <= now; // ปิดรับสมัครแล้ว
  const isActivityFull = activity.max_participants && approvedCount >= activity.max_participants;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header with Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="hover:bg-white/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery Section */}
            <div className="relative group">
              {activityImages.length > 0 ? (
                <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  {/* Main Image */}
                  <Image
                    src={activityImages[currentImageIndex]}
                    alt={`${activity?.name} - รูปที่ ${currentImageIndex + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                  
                  {/* Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />

                  {/* Image Counter */}
                  {activityImages.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>{currentImageIndex + 1} / {activityImages.length}</span>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {activityImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-900" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-900" />
                      </button>
                    </>
                  )}

                  {/* Image Indicators */}
                  {activityImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {activityImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`transition-all duration-300 rounded-full ${
                            index === currentImageIndex
                              ? 'w-8 h-2 bg-white'
                              : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                          }`}
                          aria-label={`ไปยังรูปที่ ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[400px] md:h-[500px] items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 shadow-xl">
                  <div className="text-center">
                    <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">ไม่มีรูปภาพ</p>
                  </div>
                </div>
              )}

              {/* Thumbnail Gallery */}
              {activityImages.length > 1 && (
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {activityImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex
                          ? 'ring-4 ring-blue-500 scale-95'
                          : 'ring-2 ring-gray-200 hover:ring-blue-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>


            {/* Title & Status */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-3 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                    {activity.name}
                  </h1>
                  {activity.club_name && (
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-full text-sm">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-semibold text-indigo-900">จัดโดย:</span>
                      <span className="ml-2 text-indigo-700">{activity.club_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">รายละเอียดกิจกรรม</h3>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                      {activity.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Info Card */}
            <Card className="border-0 shadow-sm top-6">
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">ข้อมูลกิจกรรม</h3>

                {/* Club Organizer */}
                {activity.club_name && (
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">ชมรมผู้จัด</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        {activity.club_name}
                      </p>
                      {activity.club_description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {activity.club_description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Period */}
                {(activity.registration_start_date || activity.registration_end_date) && (
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">ช่วงเวลาสมัคร</p>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {activity.registration_start_date && (
                          <div>
                            <span className="font-medium">เริ่มสมัคร:</span> {formatDate(activity.registration_start_date)}
                            {activity.registration_start_time && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {new Date(`1970-01-01T${activity.registration_start_time}`).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        )}
                        {activity.registration_end_date && (
                          <div>
                            <span className="font-medium">ปิดสมัคร:</span> {formatDate(activity.registration_end_date)}
                            {activity.registration_end_time && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {new Date(`1970-01-01T${activity.registration_end_time}`).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Date and Time */}
                <div className="flex items-start space-x-3">
                  <CalendarDays className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">วันเวลาจัดกิจกรรม</p>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>
                        <span className="font-medium">วันที่:</span> {formatDate(activity.start_date)}
                        {activity.start_time && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            เริ่ม {new Date(`1970-01-01T${activity.start_time}`).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      {activity.end_date && activity.start_date !== activity.end_date && (
                        <div>
                          <span className="font-medium">ถึงวันที่:</span> {formatDate(activity.end_date)}
                          {activity.end_time && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              สิ้นสุด {new Date(`1970-01-01T${activity.end_time}`).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
                {activity.max_participants && (
                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">ผู้เข้าร่วม</p>
                      <div className="mt-1">
                        <p className={`text-sm font-semibold ${
                          approvedCount >= activity.max_participants 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {approvedCount} / {activity.max_participants} คน
                        </p>
                        {approvedCount >= activity.max_participants && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            เต็มแล้ว
                          </Badge>
                        )}
                      </div>
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
                            จำนวนผู้เข้าร่วมเต็มแล้ว ({approvedCount}/{activity.max_participants})
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