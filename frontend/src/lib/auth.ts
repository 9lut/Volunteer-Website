// lib/auth.ts
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { api } from './axios';
import { decodeJwt } from 'jose';

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        try {
          const { data } = await api.post('/api/auth/login', {
            email: creds?.email,
            password: creds?.password,
          }); // backend ตอบ { token, user }
          return { ...data.user, backendToken: data.token } as any;
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const backendToken = (user as any).backendToken as string | undefined;
        if (backendToken) {
          (token as any).backendToken = backendToken;
          try {
            const payload = decodeJwt(backendToken);
            const exp = payload?.exp ? payload.exp * 1000 : undefined;
            (token as any).backendExp = exp;
            if (exp) (token as any).exp = Math.floor(exp / 1000);
          } catch {}
        }
        (token as any).user = {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
          name: (user as any).name,
          club_id: (user as any).club_id,
        };
      }
      return token as any;
    },
    async session({ session, token }) {
      (session as any).user = (token as any).user;
      (session as any).backendToken = (token as any).backendToken;
      (session as any).backendExp = (token as any).backendExp;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  pages: { signIn: '/login' },
};

export async function auth() {
  return getServerSession(authOptions);
}