'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/components/ui/toast";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { 
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  Building,
  Type,
  FileText,
  X,
  Upload,
  Save,
  RotateCcw
} from 'lucide-react';

type Club = { id: number; name: string };

type Form = {
      name: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      location?: string;
      club_id?: number | null;
      max_participants: number;
      
      // Registration period
      registration_start_date?: string;
      registration_end_date?: string;
      
      // Time fields
      start_time?: string;
      end_time?: string;
      registration_start_time?: string;
      registration_end_time?: string;
};

const MAX_FILES = 8;
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 5);
const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ActivityForm() {
      const { register, handleSubmit, watch, formState: { isSubmitting }, setError, reset } = useForm<Form>({
            defaultValues: { max_participants: 50 },
      });
      const router = useRouter();
      const [files, setFiles] = useState<File[]>([]);
      const [uploading, setUploading] = useState(false);
      const fileInputRef = useRef<HTMLInputElement | null>(null);
      const { user } = useAuth();
      const { success, error } = useToast();

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
                  setError("end_date", { message: dateError });
                  return;
            }
            try {
                  const res = await api.post("/api/activities", v);
                  const id = res.data?.id;

                  if (id && files.length > 0) {
                        try {
                              const fd = new FormData();
                              for (const f of files) fd.append("images", f);
                              await api.post(`/api/activities/${id}/images`, fd);
                        } catch (e: any) {
                              console.error("upload failed:", e?.response?.status, e?.response?.data);
                              error("อัปโหลดรูปไม่สำเร็จ", "กิจกรรมถูกสร้างแล้ว แต่รูปไม่ถูกบันทึก");
                        }
                  }

                  success("สร้างกิจกรรมสำเร็จ", "กิจกรรมของคุณถูกบันทึกเรียบร้อยแล้ว");
                  router.push("/dashboard/activities");

            } catch (e: any) {
                  console.error("create failed:", e?.response?.status, e?.response?.data);
                  error("เกิดข้อผิดพลาด", e?.response?.data?.message || "บันทึกไม่สำเร็จ");
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
            <div className="min-h-screen p-2">
                  <div className="max-w-4xl mx-auto">
                        <Card className="mb-2">
                              <CardContent>
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                          {/* Activity Name */}
                                          <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-gray-700">
                                                      <Type className="h-4 w-4 text-green-500" />
                                                      <span>ชื่อกิจกรรม *</span>
                                                </Label>
                                                <div className="relative group">
                                                      <Input
                                                            className="h-12"
                                                            placeholder="เช่น โครงการปลูกป่า"
                                                            {...register('name', { required: true })}
                                                      />
                                                </div>
                                          </div>

                                          {/* Description */}
                                          <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-gray-700">
                                                      <FileText className="h-4 w-4 text-emerald-500" />
                                                      <span>รายละเอียด</span>
                                                </Label>
                                                <div className="relative group">
                                                      <textarea
                                                            rows={4}
                                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                                            placeholder="อธิบายกิจกรรมโดยย่อ"
                                                            {...register('description')}
                                                      />
                                                </div>
                                          </div>

                                          {/* Date Range */}
                                          <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-gray-700">
                                                      <Calendar className="h-4 w-4 text-purple-500" />
                                                      <span>ช่วงเวลา</span>
                                                </Label>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">วันที่เริ่ม</p>
                                                            <Input
                                                                  type="datetime-local"
                                                                  className="h-12"
                                                                  {...register('start_date')}
                                                            />
                                                      </div>
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">วันที่สิ้นสุด</p>
                                                            <Input
                                                                  type="datetime-local"
                                                                  className={`h-12 ${dateError ? 'border-red-500 ring-red-500/20' : ''}`}
                                                                  {...register('end_date')}
                                                            />
                                                            {dateError && (
                                                                  <p className="text-xs text-red-600 ml-1 flex items-center space-x-1">
                                                                        <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                                                        <span>{dateError}</span>
                                                                  </p>
                                                            )}
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Registration Period */}
                                          <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-gray-700">
                                                      <Calendar className="h-4 w-4 text-blue-500" />
                                                      <span>ช่วงรับสมัคร</span>
                                                </Label>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">เริ่มรับสมัคร</p>
                                                            <div className="space-y-2">
                                                                  <Input
                                                                        type="date"
                                                                        className="h-10"
                                                                        {...register('registration_start_date')}
                                                                  />
                                                                  <Input
                                                                        type="time"
                                                                        className="h-10"
                                                                        placeholder="เวลา"
                                                                        {...register('registration_start_time')}
                                                                  />
                                                            </div>
                                                      </div>
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">ปิดรับสมัคร</p>
                                                            <div className="space-y-2">
                                                                  <Input
                                                                        type="date"
                                                                        className="h-10"
                                                                        {...register('registration_end_date')}
                                                                  />
                                                                  <Input
                                                                        type="time"
                                                                        className="h-10"
                                                                        placeholder="เวลา"
                                                                        {...register('registration_end_time')}
                                                                  />
                                                            </div>
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Activity Time */}
                                          <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-gray-700">
                                                      <Calendar className="h-4 w-4 text-green-500" />
                                                      <span>เวลากิจกรรม</span>
                                                </Label>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">เวลาเริ่ม</p>
                                                            <Input
                                                                  type="time"
                                                                  className="h-12"
                                                                  {...register('start_time')}
                                                            />
                                                      </div>
                                                      <div className="space-y-2">
                                                            <p className="text-xs font-medium text-gray-500 ml-1">เวลาสิ้นสุด</p>
                                                            <Input
                                                                  type="time"
                                                                  className="h-12"
                                                                  {...register('end_time')}
                                                            />
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Location & Participants */}
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                      <Label className="text-sm font-semibold text-gray-700">
                                                            <MapPin className="h-4 w-4 text-orange-500" />
                                                            <span>สถานที่</span>
                                                      </Label>
                                                      <Input
                                                            className="h-12"
                                                            placeholder="เช่น สมุทรสงคราม"
                                                            {...register('location')}
                                                      />
                                                </div>

                                                <div className="space-y-3">
                                                      <Label className="text-sm font-semibold text-gray-700">
                                                            <Users className="h-4 w-4 text-teal-500" />
                                                            <span>จำนวนผู้เข้าร่วมสูงสุด *</span>
                                                      </Label>
                                                      <Input
                                                            type="number"
                                                            min={1}
                                                            className="h-12"
                                                            {...register('max_participants', { required: true, min: 1 })}
                                                      />
                                                </div>
                                          </div>

                                          {/* Club Selection (Admin only) */}
                                          {user?.role === 'admin' && (
                                                <div className="space-y-3">
                                                      <Label className="text-sm font-semibold text-gray-700">
                                                            <Building className="h-4 w-4 text-indigo-500" />
                                                            <span>สังกัดชมรม</span>
                                                      </Label>
                                                      <select 
                                                            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            {...register('club_id')}
                                                      >
                                                            <option value="">— ไม่ระบุ —</option>
                                                            {(clubs || []).map(c => (
                                                                  <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                      </select>
                                                </div>
                                          )}

                                          {/* Image Upload */}
                                          <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                      <Label className="text-sm font-semibold text-gray-700">
                                                            <ImageIcon className="h-4 w-4 text-green-500" />
                                                            <span>รูปภาพกิจกรรม</span>
                                                      </Label>
                                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                            สูงสุด {MAX_FILES} รูป • ≤ {MAX_MB}MB/ไฟล์
                                                      </span>
                                                </div>

                                                <div className="relative">
                                                      <Input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            onChange={onPickFiles}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                      />
                                                      <div className="flex items-center justify-center h-32 rounded-md border border-input bg-background hover:bg-accent/50 transition-colors cursor-pointer">
                                                            <div className="text-center">
                                                                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                                                                        <Upload className="h-6 w-6 text-primary" />
                                                                  </div>
                                                                  <p className="text-sm font-medium">คลิกเพื่อเลือกรูปภาพ</p>
                                                                  <p className="text-xs text-muted-foreground mt-1">หรือลากวางไฟล์มาที่นี่</p>
                                                            </div>
                                                      </div>
                                                </div>

                                                {/* Image Previews */}
                                                {files.length > 0 && (
                                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                                                            {previews.map((src, i) => (
                                                                  <div key={i} className="relative group">
                                                                        <div className="aspect-square rounded-lg overflow-hidden border bg-background">
                                                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                              <img
                                                                                    src={src}
                                                                                    alt={`preview-${i}`}
                                                                                    className="w-full h-full object-cover"
                                                                              />
                                                                        </div>
                                                                        <Button
                                                                              type="button"
                                                                              variant="destructive"
                                                                              size="sm"
                                                                              onClick={() => removeFile(i)}
                                                                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity p-0"
                                                                        >
                                                                              <X className="w-3 h-3" />
                                                                        </Button>
                                                                  </div>
                                                            ))}
                                                      </div>
                                                )}
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                                                <Button
                                                      type="submit"
                                                      disabled={isSubmitting || uploading}
                                                      size="lg"
                                                      className="cursor-pointer w-full sm:w-auto bg-green-400 hover:bg-green-500 text-white"
                                                >
                                                      <Save className="h-5 w-5 mr-2" />
                                                      {isSubmitting || uploading ? 'กำลังบันทึก…' : 'สร้างกิจกรรม'}
                                                </Button>
                                                <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="lg"
                                                      disabled={isSubmitting || uploading}
                                                      onClick={() => { reset(); setFiles([]); }}
                                                      className="cursor-pointer w-full sm:w-auto text-black bg-white hover:bg-gray-100"
                                                >
                                                      <RotateCcw className="h-5 w-5 mr-2" />
                                                      ล้างฟอร์ม
                                                </Button>
                                          </div>
                                    </form>
                              </CardContent>
                        </Card>
                  </div>
            </div>
      );
}