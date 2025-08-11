// src/types/index.ts
export type Role = 'student' | 'president' | 'admin';

export interface User {
      id: string;            // UUID
      email: string;
      role: Role;
      name?: string | null;
}

export interface Registration {
      id: string;
      activity_id: number;
      user_id: string;
      status: 'registered' | 'cancelled' | 'attended';
      created_at: string;
      updated_at: string;
}
