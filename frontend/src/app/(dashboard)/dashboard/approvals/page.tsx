// server component
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ApprovalsClient from './ApprovalsClient';

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard');
  }
  return <ApprovalsClient />;
}
