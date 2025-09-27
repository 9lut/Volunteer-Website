export type ActivityImage = {
      id: number;
      activity_id: number;
      image_url: string;
      created_at: string;
      cover_url?: string;
};

export type Activity = {
      id: number;
      name: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      location: string | null;
      created_by: string;
      status: 'pending' | 'approved' | 'rejected' | 'completed';
      max_participants?: number;
      current_participants?: number;
      cover_url?: string; // Optional for backward compatibility
      images?: ActivityImage[];
      created_at: string;
      updated_at: string;
      
      // Registration period
      registration_start_date?: string | null;
      registration_end_date?: string | null;
      registration_deadline?: string | null;
      
      // Time fields
      start_time?: string | null;
      end_time?: string | null;
      registration_start_time?: string | null;
      registration_end_time?: string | null;
};
