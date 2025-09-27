'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';

interface EditActivityForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  max_participants: number;
  
  // Registration period
  registration_start_date: string;
  registration_end_date: string;
  
  // Time fields
  start_time: string;
  end_time: string;
  registration_start_time: string;
  registration_end_time: string;
}

export default function EditActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = params.id;
  const toast = useToast();

  const [activity, setActivity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

  const [formData, setFormData] = useState<EditActivityForm>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: 50,
    registration_start_date: '',
    registration_end_date: '',
    start_time: '',
    end_time: '',
    registration_start_time: '',
    registration_end_time: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // โหลดข้อมูลกิจกรรม
  useEffect(() => {
    if (activityId) {
      loadActivity();
    }
  }, [activityId]);

  const loadActivity = async () => {
    try {
      setIsLoadingData(true);
      const [activityRes, imagesRes] = await Promise.all([
        api.get(`/api/activities/${activityId}`),
        api.get(`/api/activities/${activityId}/images`)
      ]);

      const activityData = activityRes.data;
      setActivity(activityData);
      setExistingImages(imagesRes.data || []);

      // ตรวจสอบสิทธิ์การแก้ไข
      if (user?.role !== 'admin' && user?.role !== 'president') {
        toast.error('คุณไม่มีสิทธิ์แก้ไขกิจกรรม');
        router.push('/dashboard/activities');
        return;
      }

      // ถ้าเป็น president ต้องตรวจสอบว่าเป็นประธานของชมรมนี้หรือไม่
      if (user?.role === 'president' && activityData.club_id) {
        try {
          const clubsRes = await api.get('/api/clubs/me/president');
          const myClubIds = clubsRes.data.map((club: any) => club.id);
          
          if (!myClubIds.includes(activityData.club_id)) {
            toast.error('คุณไม่มีสิทธิ์แก้ไขกิจกรรมของชมรมนี้');
            router.push('/dashboard/activities');
            return;
          }
        } catch (error) {
          console.error('Error checking club membership:', error);
          toast.error('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
          router.push('/dashboard/activities');
          return;
        }
      }

      // แปลงวันที่ให้เป็นรูปแบบ datetime-local
      const formatDateTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        name: activityData.name || '',
        description: activityData.description || '',
        start_date: formatDateTime(activityData.start_date),
        end_date: formatDateTime(activityData.end_date),
        location: activityData.location || '',
        max_participants: activityData.max_participants || 50,
        registration_start_date: formatDateTime(activityData.registration_start_date),
        registration_end_date: formatDateTime(activityData.registration_end_date),
        start_time: activityData.start_time || '',
        end_time: activityData.end_time || '',
        registration_start_time: activityData.registration_start_time || '',
        registration_end_time: activityData.registration_end_time || '',
      });
    } catch (error) {
      console.error('Error loading activity:', error);
      toast.error('ไม่สามารถโหลดข้อมูลกิจกรรมได้');
      router.push('/dashboard/activities');
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'กรุณาใส่ชื่อกิจกรรม';
    if (!formData.description.trim()) newErrors.description = 'กรุณาใส่คำอธิบายกิจกรรม';
    if (!formData.start_date) newErrors.start_date = 'กรุณาเลือกวันที่เริ่ม';
    if (!formData.end_date) newErrors.end_date = 'กรุณาเลือกวันที่สิ้นสุด';
    if (!formData.location.trim()) newErrors.location = 'กรุณาใส่สถานที่';
    if (formData.max_participants < 1) newErrors.max_participants = 'จำนวนผู้เข้าร่วมต้องมากกว่า 0';

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'วันที่สิ้นสุดต้องมาหลังวันที่เริ่ม';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // อัปเดตข้อมูลกิจกรรม
      await api.put(`/api/activities/${activityId}`, formData);

      // อัปโหลดรูปภาพใหม่ (ถ้ามี)
      if (images.length > 0) {
        const imageFormData = new FormData();
        images.forEach(image => {
          imageFormData.append('images', image);
        });

        await api.post(`/api/activities/${activityId}/images`, imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('อัปเดตกิจกรรมเรียบร้อยแล้ว');
      
      // เด้งไปที่ dashboard/activities แทน
      setTimeout(() => {
        router.push('/dashboard/activities');
      }, 1000);
    } catch (error: any) {
      console.error('Error updating activity:', error);
      const errorMessage = error?.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตกิจกรรม';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_participants' ? parseInt(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!confirm('คุณต้องการลบรูปภาพนี้หรือไม่?')) return;

    try {
      await api.delete(`/api/activities/${activityId}/images/${imageId}`);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('ลบรูปภาพเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('เกิดข้อผิดพลาดในการลบรูปภาพ');
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบกิจกรรมที่ต้องการแก้ไข</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">แก้ไขกิจกรรม</h1>
              <p className="text-gray-600 mt-1">แก้ไขรายละเอียดและจัดการรูปภาพ</p>
            </div>
          </div>

          {/* Activity Status */}
          <div className="flex gap-2">
            สถานะกิจกรรม :
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
              }`}>
              {activity.status === 'approved' ? ' อนุมัติแล้ว' :
                activity.status === 'pending' ? ' รออนุมัติ' :
                  ' ไม่อนุมัติ'}
            </span>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อกิจกรรม <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                placeholder="เช่น การบริจาคโลหิต 2025"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                คำอธิบายกิจกรรม <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                placeholder="อธิบายรายละเอียดของกิจกรรม วัตถุประสงค์ และสิ่งที่ผู้เข้าร่วมจะได้รับ..."
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่เริ่ม <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                />
                {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่สิ้นสุด <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.end_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                />
                {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
              </div>
            </div>

            {/* Location and Participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานที่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="เช่น อาคาร A ชั้น 2 ห้อง 201"
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนผู้เข้าร่วมสูงสุด <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.max_participants ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                />
                {errors.max_participants && <p className="text-red-500 text-sm mt-1">{errors.max_participants}</p>}
              </div>
            </div>

            {/* Registration Period Section */}
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ช่วงเวลาการลงทะเบียน</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่เปิดรับสมัคร
                    </label>
                    <input
                      type="datetime-local"
                      name="registration_start_date"
                      value={formData.registration_start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่ปิดรับสมัคร
                    </label>
                    <input
                      type="datetime-local"
                      name="registration_end_date"
                      value={formData.registration_end_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาเปิดรับสมัคร
                    </label>
                    <input
                      type="time"
                      name="registration_start_time"
                      value={formData.registration_start_time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาปิดรับสมัคร
                    </label>
                    <input
                      type="time"
                      name="registration_end_time"
                      value={formData.registration_end_time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Activity Time Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">เวลากิจกรรม</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาเริ่มกิจกรรม
                    </label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาสิ้นสุดกิจกรรม
                    </label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    กำลังบันทึก...
                  </div>
                ) : (
                  'บันทึกการแก้ไข'
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Image Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6">จัดการรูปภาพ</h3>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-700 mb-4">รูปภาพปัจจุบัน</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {existingImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={`/api/uploads/${image.filename}`}
                      alt=""
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เพิ่มรูปภาพใหม่
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-sm text-gray-500 mt-2">
              เลือกรูปภาพได้หลายไฟล์ พร้อมกัน (PNG, JPG, JPEG, WebP)
            </p>

            {/* Preview New Images */}
            {images.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">ตัวอย่างรูปภาพใหม่:</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        ใหม่
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
