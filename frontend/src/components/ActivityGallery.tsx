'use client';
import { useActivityImages } from '@/hooks/useActivityImages';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Camera } from 'lucide-react';

export default function ActivityGallery({ activityId }:{ activityId: number }) {
  const { images, isLoading } = useActivityImages(activityId);
  
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">กำลังโหลดรูปภาพ…</span>
        </div>
      </Card>
    );
  }
  
  if (!images?.length) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-muted flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-sm">ยังไม่มีรูปภาพสำหรับกิจกรรมนี้</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">รูปภาพกิจกรรม</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {images.length} รูป
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, index) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover:shadow-md transition-shadow">
            <Image
              src={img.image_url}
              alt={`กิจกรรมรูปที่ ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              priority={index < 4} // โหลดรูป 4 รูปแรกก่อน
            />
            
            {/* Overlay เมื่อ hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
    </Card>
  );
}
