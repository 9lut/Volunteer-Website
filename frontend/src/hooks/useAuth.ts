import { useSession, signIn, signOut } from 'next-auth/react';
export const useAuth = () => {
  const { data, status } = useSession();
  return {
    status, 
    session: data,
    user: (data as any)?.user,
    loading: status === 'loading',
    backendToken: (data as any)?.backendToken as string | undefined,
    signIn, 
    signOut,
  } as const;
};
