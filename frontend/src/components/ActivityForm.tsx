"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ImageIcon,
  AlertCircle,
  Star,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ActivityFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  registration_start: string;
  registration_deadline: string;
  location: string;
  capacity: number;
  club_id: number;
}

interface Club {
  id: number;
  name: string;
}

export default function ActivityForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateErrors, setDateErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivityFormData>();

  // Watch date fields for validation
  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const regStart = watch("registration_start");
  const regDeadline = watch("registration_deadline");

  // Real-time date validation
  useEffect(() => {
    const errors: string[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start < now) {
        errors.push("⚠️ วันเริ่มกิจกรรมต้องไม่เป็นอดีต");
      }
      if (end < start) {
        errors.push("⚠️ วันสิ้นสุดต้องมาหลังวันเริ่ม");
      }
    }

    if (regStart && regDeadline) {
      const rs = new Date(regStart);
      const rd = new Date(regDeadline);

      if (rs < now) {
        errors.push("⚠️ วันเริ่มลงทะเบียนต้องไม่เป็นอดีต");
      }
      if (rd < rs) {
        errors.push("⚠️ วันปิดลงทะเบียนต้องมาหลังวันเริ่ม");
      }
      if (startDate && rd > new Date(startDate)) {
        errors.push("⚠️ ต้องปิดลงทะเบียนก่อนกิจกรรมเริ่ม");
      }
    }

    setDateErrors(errors);
  }, [startDate, endDate, regStart, regDeadline]);

  // Fetch clubs
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await api.get("/api/clubs/my-clubs");
        const userClubs = response.data;
        setClubs(userClubs);

        // Auto-select if only 1 club
        if (userClubs.length === 1) {
          setValue("club_id", userClubs[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch clubs:", error);
        toast.error("ไม่สามารถโหลดข้อมูลชมรมได้");
      }
    };

    if (user) {
      fetchClubs();
    }
  }, [user, setValue]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    if (selectedImages.length + files.length > 5) {
      toast.error("สามารถอัพโหลดได้สูงสุด 5 รูป");
      return;
    }

    setSelectedImages((prev) => [...prev, ...files]);

    // Generate preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    
    // Adjust cover index if needed
    if (coverImageIndex === index) {
      setCoverImageIndex(0);
    } else if (coverImageIndex > index) {
      setCoverImageIndex((prev) => prev - 1);
    }
  };

  // Submit form
  const onSubmit = async (data: ActivityFormData) => {
    if (dateErrors.length > 0) {
      toast.error("กรุณาแก้ไขข้อผิดพลาดของวันที่");
      return;
    }

    if (selectedImages.length === 0) {
      toast.error("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create activity
      const activityData = {
        name: data.title,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        registration_start: data.registration_start,
        registration_deadline: data.registration_deadline,
        location: data.location,
        max_participants: data.capacity,
        club_id: data.club_id,
      };

      const activityResponse = await api.post("/api/activities", activityData);
      const createdActivity = activityResponse.data;

      // Step 2: Upload images
      const formData = new FormData();
      
      // Reorder images so cover image is first
      const reorderedImages = [...selectedImages];
      if (coverImageIndex > 0) {
        const coverImage = reorderedImages[coverImageIndex];
        reorderedImages.splice(coverImageIndex, 1);
        reorderedImages.unshift(coverImage);
      }
      
      reorderedImages.forEach((file) => {
        formData.append("images", file);
      });

      const uploadResponse = await api.post(
        `/api/activities/${createdActivity.id}/images`, 
        formData, 
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Step 3: Set first uploaded image as cover (it's already first but explicitly set it)
      const uploadedImages = uploadResponse.data;
      console.log("Uploaded images:", uploadedImages); // Debug
      
      if (uploadedImages && uploadedImages.length > 0 && uploadedImages[0].id) {
        console.log("Setting cover image ID:", uploadedImages[0].id, typeof uploadedImages[0].id); // Debug
        
        try {
          await api.patch(
            `/api/activities/${createdActivity.id}/images/${uploadedImages[0].id}/cover`
          );
        } catch (coverError) {
          console.warn("Failed to set cover, but activity created:", coverError);
          // Don't fail the whole operation if cover setting fails
        }
      }

      toast.success("✅ สร้างกิจกรรมสำเร็จ!");
      router.push("/dashboard/activities");
    } catch (error: any) {
      console.error("Failed to create activity:", error);
      const message = error.response?.data?.message || "ไม่สามารถสร้างกิจกรรมได้";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Info Card - Emerald */}
      <Card className="p-6 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-emerald-900">ข้อมูลพื้นฐาน</h2>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-gray-700 font-medium">
              ชื่อกิจกรรม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register("title", { required: "กรุณากรอกชื่อกิจกรรม" })}
              placeholder="เช่น งานวันกีฬาสี ประจำปี 2567"
              className="mt-1"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-gray-700 font-medium">
              รายละเอียดกิจกรรม <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register("description", { required: "กรุณากรอกรายละเอียด" })}
              placeholder="อธิบายรายละเอียดของกิจกรรม วัตถุประสงค์ และสิ่งที่ผู้เข้าร่วมจะได้รับ..."
              rows={5}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Club Selection */}
          <div>
            <Label htmlFor="club_id" className="text-gray-700 font-medium">
              ชมรมที่จัด <span className="text-red-500">*</span>
            </Label>
            <select
              id="club_id"
              {...register("club_id", {
                required: "กรุณาเลือกชมรม",
                valueAsNumber: true,
              })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              disabled={clubs.length === 1}
            >
              <option value="">-- เลือกชมรม --</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            {errors.club_id && (
              <p className="text-red-500 text-sm mt-1">{errors.club_id.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Date/Time Card - Purple */}
      <Card className="p-6 border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-purple-900">วันและเวลา</h2>
        </div>

        {/* Date Validation Alerts */}
        {dateErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            {dateErrors.map((error, idx) => (
              <div key={idx} className="flex items-center gap-2 text-red-700 text-sm mb-1">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Activity Dates */}
          <div>
            <Label htmlFor="start_date" className="text-gray-700 font-medium">
              วันเริ่มกิจกรรม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="start_date"
              type="datetime-local"
              {...register("start_date", { required: "กรุณาเลือกวันเริ่ม" })}
              className="mt-1"
            />
            {errors.start_date && (
              <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="end_date" className="text-gray-700 font-medium">
              วันสิ้นสุดกิจกรรม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="end_date"
              type="datetime-local"
              {...register("end_date", { required: "กรุณาเลือกวันสิ้นสุด" })}
              className="mt-1"
            />
            {errors.end_date && (
              <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
            )}
          </div>

          {/* Registration Dates */}
          <div>
            <Label htmlFor="registration_start" className="text-gray-700 font-medium">
              วันเริ่มลงทะเบียน <span className="text-red-500">*</span>
            </Label>
            <Input
              id="registration_start"
              type="datetime-local"
              {...register("registration_start", { required: "กรุณาเลือกวันเริ่มลงทะเบียน" })}
              className="mt-1"
            />
            {errors.registration_start && (
              <p className="text-red-500 text-sm mt-1">{errors.registration_start.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="registration_deadline" className="text-gray-700 font-medium">
              วันปิดลงทะเบียน <span className="text-red-500">*</span>
            </Label>
            <Input
              id="registration_deadline"
              type="datetime-local"
              {...register("registration_deadline", { required: "กรุณาเลือกวันปิดลงทะเบียน" })}
              className="mt-1"
            />
            {errors.registration_deadline && (
              <p className="text-red-500 text-sm mt-1">{errors.registration_deadline.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Location/Capacity Card - Orange */}
      <Card className="p-6 border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2 mb-4">
          <MapPinIcon className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-orange-900">สถานที่และจำนวนผู้เข้าร่วม</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-gray-700 font-medium">
              สถานที่จัดกิจกรรม <span className="text-red-500">*</span>
            </Label>
            <Input
              id="location"
              {...register("location", { required: "กรุณากรอกสถานที่" })}
              placeholder="เช่น สนามกีฬา อาคาร 1 ชั้น 2"
              className="mt-1"
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <Label htmlFor="capacity" className="text-gray-700 font-medium flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              จำนวนผู้เข้าร่วมสูงสุด <span className="text-red-500">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              {...register("capacity", {
                required: "กรุณากรอกจำนวนผู้เข้าร่วม",
                valueAsNumber: true,
                min: { value: 1, message: "ต้องมากกว่า 0" },
              })}
              placeholder="เช่น 100"
              className="mt-1"
            />
            {errors.capacity && (
              <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Images Card - Pink */}
      <Card className="p-6 border-l-4 border-pink-500 bg-gradient-to-r from-pink-50 to-white">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-pink-600" />
          <h2 className="text-xl font-semibold text-pink-900">รูปภาพกิจกรรม</h2>
        </div>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="text-gray-700 font-medium">
              เพิ่มรูปภาพ (สูงสุด 5 รูป) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="mt-1"
              disabled={selectedImages.length >= 5}
            />
            <p className="text-sm text-gray-500 mt-1">
              รูปแรกจะเป็นรูปปก คุณสามารถเปลี่ยนได้โดยคลิกดาวบนรูป
            </p>
          </div>

          {/* Image Preview Grid */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className={`w-full h-32 object-cover rounded-lg ${
                      coverImageIndex === index
                        ? "ring-4 ring-pink-500"
                        : "ring-1 ring-gray-200"
                    }`}
                  />
                  
                  {/* Cover Badge */}
                  {coverImageIndex === index && (
                    <div className="absolute top-2 left-2 bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      รูปปก
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setCoverImageIndex(index)}
                      className="p-2"
                      title="ตั้งเป็นรูปปก"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                      className="p-2"
                      title="ลบรูป"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || dateErrors.length > 0}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? "กำลังสร้าง..." : "สร้างกิจกรรม"}
        </Button>
      </div>
    </form>
  );
}
