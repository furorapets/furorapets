'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionUser } from '@/types';
import {
  LayoutGrid,
  Layers,
  QrCode,
  ClipboardList,
  ShoppingBag,
  Store,
  Truck,
  HeartHandshake,
  ShieldCheck,
  Users,
  UserCheck,
  Activity,
  LogOut,
  Key,
} from 'lucide-react';

interface DashboardSidebarProps {
  currentUser: SessionUser | null;
  onOpenChangePasswordModal?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export default function DashboardSidebar({
  currentUser,
  onOpenChangePasswordModal,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const getRoleHomeHref = (): string => {
    if (pathname.startsWith('/sales') || currentUser?.role === 'SALES') return '/sales';
    if (pathname.startsWith('/vendor') || currentUser?.role === 'VENDOR') return '/vendor';
    if (pathname.startsWith('/agent') || currentUser?.role === 'DELIVERY_AGENT') return '/agent';
    if (currentUser?.role === 'CUSTOMER') return '/customer/order';
    return '/admin';
  };

  const getNavItems = (): NavItem[] => {
    // 1. Sales Portal Navigation - Catalog & Customer Orders
    if (pathname.startsWith('/sales') || currentUser?.role === 'SALES') {
      const items: NavItem[] = [
        { label: 'Sales Catalog', href: '/sales', icon: ShoppingBag, badge: 'Stock' },
        { label: 'Orders & Bookings', href: '/sales/orders', icon: ClipboardList, badge: 'Orders' },
      ];
      if (currentUser?.role === 'ADMIN') {
        items.push({ label: 'Return to Admin HQ', href: '/admin', icon: LayoutGrid, badge: 'HQ' });
      }
      return items;
    }

    // 2. Vendor Portal Navigation - Isolated to Vendor features
    if (pathname.startsWith('/vendor') || currentUser?.role === 'VENDOR') {
      const items: NavItem[] = [
        { label: 'Vendor Dashboard', href: '/vendor', icon: LayoutGrid, badge: 'Overview' },
        { label: 'My Pets & Inventory', href: '/vendor/pets', icon: Layers, badge: 'Stock' },
        { label: 'Dispatch Orders', href: '/vendor/orders', icon: Store, badge: 'Orders' },
      ];
      if (currentUser?.role === 'ADMIN') {
        items.push({ label: 'Return to Admin HQ', href: '/admin', icon: LayoutGrid, badge: 'HQ' });
      }
      return items;
    }

    // 3. Delivery Agent Portal Navigation - Isolated to logistics
    if (pathname.startsWith('/agent') || currentUser?.role === 'DELIVERY_AGENT') {
      const items: NavItem[] = [
        { label: 'Operations Dashboard', href: '/agent', icon: LayoutGrid, badge: 'Overview' },
        { label: 'Delivery & Inspection', href: '/agent/order', icon: Truck, badge: 'Field' },
      ];
      if (currentUser?.role === 'ADMIN') {
        items.push({ label: 'Return to Admin HQ', href: '/admin', icon: LayoutGrid, badge: 'HQ' });
      }
      return items;
    }

    // 4. Customer Portal Navigation
    if (currentUser?.role === 'CUSTOMER') {
      return [
        { label: 'My Orders & Tracking', href: '/customer/order', icon: HeartHandshake },
        { label: 'Browse Pets', href: '/sales', icon: ShoppingBag },
      ];
    }

    // 5. Admin HQ Navigation - ONLY rendered on /admin routes or for verified ADMIN
    return [
      { label: 'Command Center', href: '/admin', icon: LayoutGrid, badge: 'HQ' },
      { label: 'Category & Pet Inventory', href: '/admin/categories', icon: Layers },
      { label: 'Orders & Dispatch', href: '/admin/orders', icon: ClipboardList },
      { label: 'Customers', href: '/admin/customers', icon: UserCheck },
      { label: 'Vendors & Breeders', href: '/admin/vendors', icon: Store },
      { label: 'Staff & Accounts', href: '/admin/users', icon: Users },
    ];
  };

  const navItems = getNavItems();
  const brandHomeHref = getRoleHomeHref();

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between flex-shrink-0 min-h-screen p-5 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href={brandHomeHref} className="flex items-center px-1.5 pt-1 group">
          <img
            src="/logo.png"
            alt="Furora"
            className="h-10 w-auto max-w-[180px] object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isRootRoute =
              item.href === '/admin' ||
              item.href === '/vendor' ||
              item.href === '/agent' ||
              item.href === '/sales';
            const isActive = isRootRoute
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Account Actions Card */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-sm">
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {currentUser?.name || 'User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 tracking-wide">
                  {currentUser?.role?.replace('_', ' ') || 'AUTHENTICATED'}
                </span>
                {currentUser?.assignedHub && (
                  <span className="text-[9px] text-slate-400 truncate max-w-[80px]" title={currentUser.assignedHub}>
                    {currentUser.assignedHub}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch (e) {
                console.error('Logout error', e);
              }
              window.location.href = '/login';
            }}
            title="Log Out of Furora"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex-shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Change Password with Email OTP */}
        {onOpenChangePasswordModal && (
          <button
            onClick={onOpenChangePasswordModal}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70 rounded-xl transition cursor-pointer shadow-2xs"
            title="Change Account Password with Email OTP Verification"
          >
            <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Change Password (Email OTP)</span>
          </button>
        )}
      </div>
    </aside>
  );
}
