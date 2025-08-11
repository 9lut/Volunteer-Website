export type ActivityImage = {
      id: number;
      activity_id: number;
      image_url: string;
      created_at: string;
      cover_url?: string;
};

export type Activity = {
      id: number;
      title: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      location: string | null;
      created_by: string;
      status: 'pending' | 'approved' | 'rejected' | 'completed';
      cover_url?: string; // Optional for backward compatibility
      images?: ActivityImage[];
      created_at: string;
      updated_at: string;
};
