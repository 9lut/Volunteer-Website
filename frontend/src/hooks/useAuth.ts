import { useAuthContext } from '@/components/AuthProvider';

export const useAuth = () => {
  const { status, user, backendToken, signIn, signOut } = useAuthContext();
  return { status, session: user ? { user, backendToken } : undefined, user, backendToken, signIn, signOut } as const;
};
