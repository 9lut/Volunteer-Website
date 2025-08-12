// src/lib/roles.ts
import { Role } from '@/types';
export const canCreateActivity = (r?: Role) => r === 'admin' || r === 'president';
export const canApproveActivity = (r?: Role) => r === 'admin';
export const canManageUsers = (r?: Role) => r === 'admin';
export const canManageActivities = (r?: Role) => r === 'admin' || r === 'president';
export const canManageClubs = (r?: Role) => r === 'admin' || r === 'president';
