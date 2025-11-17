"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Calendar, Users, MapPin, FileText, Image as ImageIcon, Zap, CheckCircle2 } from "lucide-react";

interface Club {
  id: number;
  name: string;
}

const activityFormSchema = z.object({
  name: z.string().min(3, "ชื่อกิจกรรมต้องมีอย่างน้อย 3 ตัวอักษร"),
  description: z.string().min(10, "รายละเอียดต้องมีอย่างน้อย 10 ตัวอักษร"),
  start_date: z.string().min(1, "กรุณาเลือกวันเวลาที่เริ่ม"),
  end_date: z.string().min(1, "กรุณาเลือกวันเวลาที่สิ้นสุด"),
  location: z.string().min(3, "สถานที่ต้องมีอย่างน้อย 3 ตัวอักษร"),
  capacity: z.number().min(1, "จำนวนผู้เข้าร่วมต้องมากกว่า 0"),
  registration_start: z.string().min(1, "กรุณาเลือกวันเวลาเปิดรับสมัคร"),
  registration_end: z.string().min(1, "กรุณาเลือกวันเวลาปิดรับสมัคร"),
  approval_mode: z.enum(["auto", "manual"]),
  club_id: z.number().min(1, "กรุณาเลือกชมรม"),
});

type ActivityFormData = z.infer<typeof activityFormSchema>;

interface ActivityFormEditProps {
  activityId?: number;
  mode: "create" | "edit";
}

export default function ActivityFormEdit({ activityId, mode }: ActivityFormEditProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedApprovalMode, setSelectedApprovalMode] = useState<"auto" | "manual">("manual");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      approval_mode: "manual",
    },
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const registrationStart = watch("registration_start");
  const registrationEnd = watch("registration_end");

  useEffect(() => {
    fetchClubs();
    if (mode === "edit" && activityId) {
      loadActivityData();
    }
  }, [mode, activityId]);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        toast.error("วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่ม");
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (registrationStart && registrationEnd) {
      const start = new Date(registrationStart);
      const end = new Date(registrationEnd);
      if (end < start) {
        toast.error("วันปิดรับสมัครต้องมากกว่าหรือเท่ากับวันเปิดรับสมัคร");
      }
    }
  }, [registrationStart, registrationEnd]);

  const fetchClubs = async () => {
    try {
      const response = await axios.get("/api/clubs");
      setClubs(response.data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลชมรมได้");
    } finally {
      setLoadingClubs(false);
    }
  };

  const loadActivityData = async () => {
    if (!activityId) return;

    try {
      const response = await axios.get(`/api/activities/${activityId}`);
      const activity = response.data;

      setValue("name", activity.name);
      setValue("description", activity.description);
      
      // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
      if (activity.start_date) {
        const startDate = new Date(activity.start_date);
        setValue("start_date", startDate.toISOString().slice(0, 16));
      }
      if (activity.end_date) {
        const endDate = new Date(activity.end_date);
        setValue("end_date", endDate.toISOString().slice(0, 16));
      }
      if (activity.registration_start_date) {
        const regStart = new Date(activity.registration_start_date);
        setValue("registration_start", regStart.toISOString().slice(0, 16));
      }
      if (activity.registration_end_date) {
        const regEnd = new Date(activity.registration_end_date);
        setValue("registration_end", regEnd.toISOString().slice(0, 16));
      }
      
      setValue("location", activity.location);
      setValue("capacity", activity.max_participants);
      setValue("approval_mode", activity.approval_mode || "manual");
      setSelectedApprovalMode(activity.approval_mode || "manual");

      if (activity.club_id) {
        setValue("club_id", activity.club_id);
      }

      if (activity.images && activity.images.length > 0) {
        setExistingImages(activity.images);
      }
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลกิจกรรมได้");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + newFiles.length;

    if (totalImages > 5) {
      toast.error("สามารถอัพโหลดรูปภาพได้สูงสุด 5 รูป");
      return;
    }

    setNewImages([...newImages, ...newFiles]);

    const urls = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...urls]);
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setImagesToDelete([...imagesToDelete, imageUrl]);
  };

  const handleRemoveNewImage = (index: number) => {
    const updatedImages = newImages.filter((_, i) => i !== index);
    const updatedUrls = previewUrls.filter((_, i) => i !== index);

    URL.revokeObjectURL(previewUrls[index]);

    setNewImages(updatedImages);
    setPreviewUrls(updatedUrls);
  };

  const onSubmit = async (data: ActivityFormData) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("start_date", data.start_date);
      formData.append("end_date", data.end_date);
      formData.append("location", data.location);
      formData.append("capacity", data.capacity.toString());
      formData.append("registration_start", data.registration_start);
      formData.append("registration_end", data.registration_end);
      formData.append("approval_mode", data.approval_mode);

      if (data.club_id) {
        formData.append("club_id", data.club_id.toString());
      }

      newImages.forEach((image) => {
        formData.append("images", image);
      });

      if (mode === "edit" && activityId) {
        formData.append("images_to_delete", JSON.stringify(imagesToDelete));
        await axios.put(`/api/activities/${activityId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("อัพเดทกิจกรรมสำเร็จ");
      } else {
        await axios.post("/api/activities", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("สร้างกิจกรรมสำเร็จ");
      }

      router.push("/dashboard/activities");
      router.refresh();
    } catch (error: any) {
      console.error("Error submitting activity:", error);
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const displayedExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img));

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Card className="shadow-xl border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardTitle className="text-3xl font-bold text-center">
            {mode === "create" ? "สร้างกิจกรรมใหม่" : "แก้ไขกิจกรรม"}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-200">
                <FileText className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">ข้อมูลพื้นฐาน</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="text-base font-semibold">
                    ชื่อกิจกรรม <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="เช่น งานวันเด็ก 2024"
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description" className="text-base font-semibold">
                    รายละเอียด <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="อธิบายรายละเอียดกิจกรรม วัตถุประสงค์ และสิ่งที่ผู้เข้าร่วมจะได้รับ"
                    rows={6}
                    className="mt-2 text-base"
                    disabled={isLoading}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div>
                  <Label htmlFor="location" className="text-base font-semibold">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    สถานที่ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="เช่น หอประชุมใหญ่"
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                </div>

                <div>
                  <Label htmlFor="capacity" className="text-base font-semibold">
                    <Users className="inline h-4 w-4 mr-1" />
                    จำนวนที่รับ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    {...register("capacity", { valueAsNumber: true })}
                    placeholder="เช่น 100"
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="club_id" className="text-base font-semibold">
                    ชมรม <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="club_id"
                    {...register("club_id", { 
                      valueAsNumber: true,
                      required: "กรุณาเลือกชมรม"
                    })}
                    className="mt-2 h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
                    disabled={isLoading || loadingClubs}
                  >
                    <option value="">-- เลือกชมรม --</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                  {errors.club_id && <p className="text-red-500 text-sm mt-1">{errors.club_id.message}</p>}
                </div>
              </div>
            </div>

            {/* Date & Time Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-green-200">
                <Calendar className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">วันและเวลา</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="start_date" className="text-base font-semibold">
                    วันเวลาที่เริ่ม <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    {...register("start_date")}
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                </div>

                <div>
                  <Label htmlFor="end_date" className="text-base font-semibold">
                    วันเวลาที่สิ้นสุด <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    {...register("end_date")}
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>}
                </div>

                <div>
                  <Label htmlFor="registration_start" className="text-base font-semibold">
                    วันเวลาเปิดรับสมัคร <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registration_start"
                    type="datetime-local"
                    {...register("registration_start")}
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.registration_start && <p className="text-red-500 text-sm mt-1">{errors.registration_start.message}</p>}
                </div>

                <div>
                  <Label htmlFor="registration_end" className="text-base font-semibold">
                    วันเวลาปิดรับสมัคร <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registration_end"
                    type="datetime-local"
                    {...register("registration_end")}
                    className="mt-2 h-12 text-base"
                    disabled={isLoading}
                  />
                  {errors.registration_end && <p className="text-red-500 text-sm mt-1">{errors.registration_end.message}</p>}
                </div>
              </div>
            </div>

            {/* Approval Mode Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-purple-200">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">รูปแบบการอนุมัติ</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Auto Approval Card */}
                <div
                  onClick={() => {
                    setSelectedApprovalMode("auto");
                    setValue("approval_mode", "auto");
                  }}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                    selectedApprovalMode === "auto"
                      ? "border-green-500 bg-green-50 shadow-md dark:bg-green-950"
                      : "border-gray-200 bg-white hover:border-green-300 dark:border-gray-700 dark:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    value="auto"
                    {...register("approval_mode")}
                    checked={selectedApprovalMode === "auto"}
                    className="sr-only"
                  />
                  
                  {selectedApprovalMode === "auto" && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-3 ${
                      selectedApprovalMode === "auto" ? "bg-green-500" : "bg-green-100"
                    }`}>
                      <Zap className={`h-6 w-6 ${
                        selectedApprovalMode === "auto" ? "text-white" : "text-green-600"
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        อนุมัติอัตโนมัติ
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        First Come First Served
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>ผู้สมัครได้รับการอนุมัติทันที</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>สะดวกรวดเร็ว ไม่ต้องรออนุมัติ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>เหมาะกับกิจกรรมทั่วไป</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Manual Approval Card */}
                <div
                  onClick={() => {
                    setSelectedApprovalMode("manual");
                    setValue("approval_mode", "manual");
                  }}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                    selectedApprovalMode === "manual"
                      ? "border-blue-500 bg-blue-50 shadow-md dark:bg-blue-950"
                      : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    value="manual"
                    {...register("approval_mode")}
                    checked={selectedApprovalMode === "manual"}
                    className="sr-only"
                  />
                  
                  {selectedApprovalMode === "manual" && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-3 ${
                      selectedApprovalMode === "manual" ? "bg-blue-500" : "bg-blue-100"
                    }`}>
                      <Users className={`h-6 w-6 ${
                        selectedApprovalMode === "manual" ? "text-white" : "text-blue-600"
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        อนุมัติด้วยตนเอง
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        ต้องการการอนุมัติจากผู้จัด
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span>คัดเลือกผู้เข้าร่วมได้</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span>ควบคุมคุณภาพผู้เข้าร่วม</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span>เหมาะกับกิจกรรมพิเศษ</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {errors.approval_mode && (
                <p className="text-red-500 text-sm">{errors.approval_mode.message}</p>
              )}
            </div>

            {/* Images Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-orange-200">
                <ImageIcon className="h-6 w-6 text-orange-600" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">รูปภาพ</h3>
              </div>

              <div>
                <Label htmlFor="images" className="text-base font-semibold">
                  เพิ่มรูปภาพกิจกรรม (สูงสุด 5 รูป)
                </Label>
                <div className="mt-2">
                  <label
                    htmlFor="images"
                    className="flex items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors dark:border-gray-600 dark:hover:border-orange-500 dark:hover:bg-orange-950"
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">คลิกเพื่ออัพโหลดรูปภาพ</span>
                  </label>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                </div>

                {/* Existing Images */}
                {displayedExistingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">รูปภาพปัจจุบัน:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {displayedExistingImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(imageUrl)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images Preview */}
                {previewUrls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">รูปภาพใหม่:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1 h-12 text-base font-semibold"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : mode === "create" ? (
                  "สร้างกิจกรรม"
                ) : (
                  "บันทึกการแก้ไข"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
