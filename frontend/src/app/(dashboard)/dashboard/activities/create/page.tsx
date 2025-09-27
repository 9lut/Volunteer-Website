'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';

interface CreateActivityForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  max_participants: number;
  club_id: number | null;
}

export default function CreateActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateActivityForm>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: 50,
    club_id: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      // สร้างกิจกรรมใหม่
      const response = await api.post('/api/activities', formData);
      
      if (response.data?.id) {
        router.push(`/dashboard/activities/${response.data.id}`);
      } else {
        router.push('/dashboard/activities');
      }
    } catch (error: any) {
      console.error('Error creating activity:', error);
      const errorMessage = error?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างกิจกรรม';
      
      if (errorMessage.includes('President has no club assigned')) {
        alert('ประธานชมรมต้องเป็นสมาชิกของชมรมก่อน กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มคุณเข้าชมรม');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // ถ้าไม่ใช่ president ให้ redirect กลับ
  if (user?.role !== 'president') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
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
              <h1 className="text-3xl font-bold text-gray-900">สร้างกิจกรรมใหม่</h1>
              <p className="text-gray-600 mt-1">เพิ่มกิจกรรมใหม่สำหรับชมรมของคุณ</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
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
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="เช่น การบริจาคโลหิต 2025"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.end_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.max_participants ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.max_participants && <p className="text-red-500 text-sm mt-1">{errors.max_participants}</p>}
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
                    กำลังสร้าง...
                  </div>
                ) : (
                  'สร้างกิจกรรม'
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6"
        >
          <h3 className="font-semibold text-emerald-800 mb-2">📝 หมายเหตุ</h3>
          <ul className="text-emerald-700 text-sm space-y-1">
            <li>• กิจกรรมที่สร้างใหม่จะอยู่ในสถานะ "รออนุมัติ" และต้องรอการอนุมัติจากแอดมิน</li>
            <li>• คุณสามารถเพิ่มรูปภาพและแก้ไขรายละเอียดได้หลังจากสร้างกิจกรรมแล้ว</li>
            <li>• ตรวจสอบข้อมูลให้ถูกต้องก่อนส่ง เพราะการแก้ไขหลังอนุมัติต้องขออนุมัติใหม่</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
