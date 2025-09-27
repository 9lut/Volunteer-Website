'use client';
import { useActivityImages } from '@/hooks/useActivityImages';
import Image from 'next/image';

export default function ActivityGallery({ activityId }:{ activityId: number }) {
  const { images, isLoading } = useActivityImages(activityId);
  if (isLoading) return <div className="text-sm text-gray-500">กำลังโหลดรูปภาพ…</div>;
  if (!images.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {images.map(img => (
        <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border">
          {/* ถ้าไม่อยาก optimize ก็ใช้ <img src=...> ได้ */}
          <Image
            src={img.image_url}
            alt={`Activity gallery image ${img.id}`}
            fill
            sizes="(max-width:768px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        </div>
      ))}
    </div>
  );
}
