'use client';
import useSWR from 'swr';
import { api } from '@/lib/axios';
import { ActivityImage } from '@/types/activity';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export function useActivityImages(activityId?: number) {
  const { data, error, isLoading, mutate } = useSWR<ActivityImage[]>(
    activityId ? `/api/activities/${activityId}/images` : null,
    fetcher
  );
  return { images: data || [], error, isLoading, mutate };
}
