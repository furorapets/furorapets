import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RootHomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'ADMIN') {
    redirect('/admin');
  } else if (user.role === 'VENDOR') {
    redirect('/vendor');
  } else if (user.role === 'SALES') {
    redirect('/sales');
  } else if (user.role === 'DELIVERY_AGENT') {
    redirect('/agent');
  } else if (user.role === 'CUSTOMER') {
    redirect('/customer/order');
  }

  redirect('/login');
}
