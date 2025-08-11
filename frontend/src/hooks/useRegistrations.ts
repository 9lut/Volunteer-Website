import useSWR from 'swr';
import { api } from '@/lib/axios';

export interface MyRegistration {
  id: string;
  activity_id: number;
  user_id: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
  updated_at: string;
}

const fetcher = (url: string) => api.get(url).then(r => r.data);

export function useMyRegistrations(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MyRegistration[]>(
    enabled ? '/api/users/me/registrations' : null,
    fetcher
  );
  return { regs: data ?? [], error, isLoading, mutate };
}
