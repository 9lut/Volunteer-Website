// src/lib/helpers/url.ts
export function toAbsoluteImageUrl(u?: string | null) {
      if (!u) return '';
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
    
      // รูปที่มาจาก backend จะเป็น /uploads/...
      if (u.startsWith('/uploads')) {
        const origin =
          (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
        return `${origin}${u}`;
      }
    
      // กรณีอื่น ๆ (เช่น ไฟล์ public ของ frontend)
      return u;
    }
    