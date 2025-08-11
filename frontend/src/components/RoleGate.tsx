// src/components/RoleGate.tsx
'use client';
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types';

export default function RoleGate({
  allow, children, fallback = null,
}: { allow: Role[]; children: ReactNode; fallback?: ReactNode; }) {
  const { user } = useAuth();
  if (!user) return fallback;
  return allow.includes(user.role) ? <>{children}</> : <>{fallback}</>;
}
