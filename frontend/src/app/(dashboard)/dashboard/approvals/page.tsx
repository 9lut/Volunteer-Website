// server component
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import ApprovalsClient from './ApprovalsClient';

export default async function ApprovalsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/dashboard');

  try {
    const payload: any = decodeJwt(token);
    const role = payload?.role as 'admin' | 'president' | 'student' | undefined;
    if (role !== 'admin') redirect('/dashboard');
  } catch {
    redirect('/dashboard');
  }

  return <ApprovalsClient />;
}
