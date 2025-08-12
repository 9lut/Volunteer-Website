import axios from 'axios';
import { getAuthTokenFromCookie, clearAuthTokenCookie } from './jwt';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Client-side interceptors only
if (typeof window !== 'undefined') {
  api.interceptors.request.use(async (config) => {
    const backendToken = getAuthTokenFromCookie() || undefined;
    if (backendToken) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${backendToken}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        clearAuthTokenCookie();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}
