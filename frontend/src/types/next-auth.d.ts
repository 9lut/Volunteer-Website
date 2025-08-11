import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: 'student' | 'president' | 'admin';
      name?: string | null;
    } & DefaultSession['user'];
    backendToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: {
      id: string;
      email: string;
      role: 'student' | 'president' | 'admin';
      name?: string | null;
    };
    backendToken?: string;
  }
}

export {};
