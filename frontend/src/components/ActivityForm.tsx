'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';

type Club = { id: number; name: string };
type Form = {
      title: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      location?: string;
      club_id?: number | null; // admin เท่านั้น (president จะผูกตามชมรมตนเองอัตโนมัติ)

};

const MAX_FILES = 8;
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 5);
const fetcher = (url: string) => api.get(url).then(r => r.data);


export default function ActivityForm() {
      const { register, handleSubmit, watch, formState: { isSubmitting }, setError, reset } = useForm<Form>();
      const router = useRouter();

      const [files, setFiles] = useState<File[]>([]);
      const [uploading, setUploading] = useState(false);
      const fileInputRef = useRef<HTMLInputElement | null>(null);
      const { user } = useAuth();

      const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
            const picked = Array.from(e.target.files || []);
            if (!picked.length) return;

            // validate type/size
            const okMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
            const valid = picked.filter(f => okMime.has(f.type) && f.size <= MAX_MB * 1024 * 1024);
            const tooMany = (files.length + valid.length) > MAX_FILES;

            const next = [...files, ...valid].slice(0, MAX_FILES);
            setFiles(next);

            if (valid.length !== picked.length) {
                  alert(`มีไฟล์บางไฟล์ไม่ใช่รูปภาพ หรือเกิน ${MAX_MB}MB`);
            }
            if (tooMany) {
                  alert(`เลือกรูปได้สูงสุด ${MAX_FILES} รูป`);
            }

            // reset input เพื่อให้เลือกไฟล์ซ้ำชื่อเดิมได้
            if (fileInputRef.current) fileInputRef.current.value = '';
      };

      const removeFile = (idx: number) => {
            setFiles(prev => prev.filter((_, i) => i !== idx));
      };

      const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);

      // กัน end_date ก่อน start_date แบบเบสิก
      const start = watch('start_date');
      const end = watch('end_date');
      const dateError = useMemo(() => {
            if (start && end && new Date(end) < new Date(start)) {
                  return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
            }
            return '';
      }, [start, end]);

      const onSubmit = async (v: Form) => {
            if (dateError) {
                  setError('end_date', { message: dateError });
                  return;
            }
            try {
                  const res = await api.post('/api/activities', v);
                  const id = res.data?.id;
                  if (id && files.length > 0) {
                        try {
                              const fd = new FormData();
                              for (const f of files) fd.append('images', f);
                              await api.post(`/api/activities/${id}/images`, fd);
                        } catch (e: any) {
                              console.error('upload failed:', e?.response?.status, e?.response?.data);
                              alert('สร้างกิจกรรมสำเร็จ แต่การอัปโหลดรูปไม่สำเร็จ');
                        }
                  }
                  router.push(`/activities/${id}`);
            } catch (e: any) {
                  console.error('create failed:', e?.response?.status, e?.response?.data);
                  alert(e?.response?.data?.message || 'บันทึกไม่สำเร็จ');
            }


      };

      const { data: clubs } = useSWR<Club[]>(
            user?.role === 'admin' ? '/api/clubs?limit=1000' : null,
            fetcher
      );

      useEffect(() => {
            return () => {
                  previews.forEach(url => URL.revokeObjectURL(url));
            };
      }, [previews]);

      return (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                        <label className="block text-sm font-medium">ชื่อกิจกรรม *</label>
                        <input
                              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="เช่น โครงการปลูกป่า"
                              {...register('title', { required: true })}
                        />
                  </div>

                  <div className="space-y-2">
                        <label className="block text-sm font-medium">รายละเอียด</label>
                        <textarea
                              rows={4}
                              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="อธิบายกิจกรรมโดยย่อ"
                              {...register('description')}
                        />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                              <label className="block text-sm font-medium">วันที่เริ่ม</label>
                              <input
                                    type="date"
                                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    {...register('start_date')}
                              />
                        </div>

                        <div className="space-y-2">
                              <label className="block text-sm font-medium">วันที่สิ้นสุด</label>
                              <input
                                    type="date"
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:ring-2 ${dateError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                                    {...register('end_date')}
                              />
                              {dateError && <p className="text-xs text-red-600">{dateError}</p>}
                        </div>
                  </div>

                  <div className="space-y-2">
                        <label className="block text-sm font-medium">สถานที่</label>
                        <input
                              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="เช่น สมุทรสงคราม"
                              {...register('location')}
                        />
                  </div>

                  {user?.role === 'admin' && (
                        <div>
                              <label className="block text-sm font-medium">สังกัดชมรม</label>
                              <select className="w-full border rounded p-2" {...register('club_id')}>
                                    <option value="">— ไม่ระบุ —</option>
                                    {(clubs || []).map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                              </select>
                        </div>
                  )}

                  {/* Upload images */}
                  <div className="space-y-2">
                        <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium">รูปภาพกิจกรรม (อัปได้หลายรูป)</label>
                              <span className="text-xs text-gray-500">สูงสุด {MAX_FILES} รูป • ≤ {MAX_MB}MB/ไฟล์</span>
                        </div>

                        <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={onPickFiles}
                              className="block w-full rounded-lg border p-2"
                        />

                        {/* Previews */}
                        {files.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {previews.map((src, i) => (
                                          <div key={i} className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                      src={src}
                                                      alt={`preview-${i}`}
                                                      className="aspect-[4/3] w-full object-cover rounded-lg border"
                                                />
                                                <button
                                                      type="button"
                                                      onClick={() => removeFile(i)}
                                                      className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                                                >
                                                      ลบ
                                                </button>
                                          </div>
                                    ))}
                              </div>
                        )}
                  </div>

                  <div className="flex gap-3">
                        <button
                              type="submit"
                              disabled={isSubmitting || uploading}
                              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                              {isSubmitting || uploading ? 'กำลังบันทึก…' : 'สร้างกิจกรรม'}
                        </button>

                        <button
                              type="button"
                              disabled={isSubmitting || uploading}
                              onClick={() => { reset(); setFiles([]); }}
                              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
                        >
                              ล้างฟอร์ม
                        </button>
                  </div>
            </form>
      );
}
