import useSWR from 'swr';
import { api } from '@/lib/axios';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export interface ActivityFilters {
  status?: 'approved' | 'pending' | 'rejected' | 'all';
  search?: string;
  location?: string;
  dateStart?: string;
  dateEnd?: string;
  clubId?: string;
  limit?: number;
}

// Overload for backward compatibility with string status
export function useActivities(status: string): any;
export function useActivities(filters: ActivityFilters): any;
export function useActivities(filtersOrStatus: ActivityFilters | string = {}) {
  // Handle backward compatibility
  const filters = typeof filtersOrStatus === 'string' 
    ? { status: filtersOrStatus as 'approved' | 'pending' | 'rejected' | 'all' }
    : filtersOrStatus;

  const { 
    status = 'approved', 
    search, 
    location, 
    dateStart, 
    dateEnd, 
    clubId, 
    limit 
  } = filters;

  // Build query string
  const params = new URLSearchParams();
  params.append('status', status);
  
  // Safe string handling with nullish coalescing and type checking
  if (search && typeof search === 'string' && search.trim()) {
    params.append('search', search.trim());
  }
  if (location && typeof location === 'string' && location.trim()) {
    params.append('location', location.trim());
  }
  if (dateStart && typeof dateStart === 'string' && dateStart.trim()) {
    params.append('dateStart', dateStart.trim());
  }
  if (dateEnd && typeof dateEnd === 'string' && dateEnd.trim()) {
    params.append('dateEnd', dateEnd.trim());
  }
  if (clubId && typeof clubId === 'string' && clubId.trim()) {
    params.append('clubId', clubId.trim());
  }
  if (limit) params.append('limit', limit.toString());

  const queryString = params.toString();
  const { data, error, mutate, isLoading } = useSWR(
    `/api/activities?${queryString}`, 
    fetcher
  );

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
