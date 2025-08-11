import useSWR from 'swr';
import { api } from '@/lib/axios';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export function useActivities(status: 'approved' | 'pending' | 'rejected' | 'all' = 'approved') {
  const { data, error, mutate, isLoading } = useSWR(`/api/activities?status=${status}`, fetcher);
  return {
    activities: data || [],
    error,
    isLoading,
    mutate,
  };
}

export function useActivity(id: number) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/activities/${id}` : null, fetcher);
  return { activity: data, error, isLoading, mutate };
}
