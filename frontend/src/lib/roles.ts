import { Role } from '@/types';

export const canCreateActivity = (r?: Role) => r === 'admin' || r === 'president';
export const canApproveActivity = (r?: Role) => r === 'admin';
export const canCreateActivities = (r?: Role) => r === 'admin' || r === 'president';
export const canManageUsers = (r?: Role) => r === 'admin';
export const canManageRoles = (r?: Role) => r === 'admin';
export const canManageEvents = (r?: Role) => r === 'admin' || r === 'president';
export const canManageRegistrations = (r?: Role) => r === 'admin' || r === 'president';

export const canManageActivities = (r?: Role) => r === 'admin' || r === 'president';
export const canManageClubs = (r?: Role) => r === 'admin' || r === 'president';
