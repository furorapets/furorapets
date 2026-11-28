import type { Metadata } from 'next';
import './globals.css';
import DashboardLayoutShell from '@/components/dashboard-layout-shell';
import { SessionProvider } from '@/context/session-context';

export const metadata: Metadata = {
  title: 'Furora — Pet Inventory, Order & Delivery Platform',
  description: 'Enterprise Pet Inventory, Order, Medical Inspection, and Delivery System with Strict Server-Side RBAC',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F5F9] text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
        <SessionProvider>
          <DashboardLayoutShell>
            {children}
          </DashboardLayoutShell>
        </SessionProvider>
      </body>
    </html>
  );
}
