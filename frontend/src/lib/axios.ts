import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// ใช้เฉพาะฝั่ง client
if (typeof window !== 'undefined') {
  (async () => {
    const { getSession, signOut } = await import('next-auth/react');

    api.interceptors.request.use(async (config) => {
      const session = await getSession();
      const backendToken = (session as any)?.backendToken as string | undefined;
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
          // หมดอายุ/ไม่ถูกต้อง -> เด้งไป login
          await signOut({ callbackUrl: '/login' });
        }
        return Promise.reject(error);
      }
    );
  })();
}
