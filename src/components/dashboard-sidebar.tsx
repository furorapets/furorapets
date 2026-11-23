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
} from 'lucide-react';

interface DashboardSidebarProps {
  currentUser: SessionUser | null;
  onOpenSwitchModal: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export default function DashboardSidebar({ currentUser, onOpenSwitchModal }: DashboardSidebarProps) {
  const pathname = usePathname();

  const getRoleHomeHref = (): string => {
    const role = currentUser?.role || 'ADMIN';
    if (role === 'VENDOR') return '/vendor';
    if (role === 'DELIVERY_AGENT') return '/agent';
    if (role === 'SALES') return '/sales';
    if (role === 'CUSTOMER') return '/customer/order';
    return '/admin';
  };

  const getNavItems = (): NavItem[] => {
    const role = currentUser?.role || 'ADMIN';

    if (role === 'VENDOR') {
      return [
        { label: 'Vendor Dashboard', href: '/vendor', icon: LayoutGrid, badge: 'Overview' },
        { label: 'My Pets & Inventory', href: '/vendor/pets', icon: Layers, badge: 'Stock' },
        { label: 'Dispatch Orders', href: '/vendor/orders', icon: Store, badge: 'Orders' },
      ];
    }

    if (role === 'DELIVERY_AGENT') {
      return [
        { label: 'Operations Dashboard', href: '/agent', icon: LayoutGrid, badge: 'Overview' },
        { label: 'Delivery & Inspection', href: '/agent/order', icon: Truck, badge: 'Field' },
      ];
    }

    if (role === 'SALES') {
      return [
        { label: 'Sales Dashboard', href: '/sales', icon: ShoppingBag, badge: 'Live' },
      ];
    }

    if (role === 'CUSTOMER') {
      return [
        { label: 'My Orders & Tracking', href: '/customer/order', icon: HeartHandshake },
        { label: 'Browse Pets', href: '/sales', icon: ShoppingBag },
      ];
    }

    // Admin: Complete operational control suite
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
        <Link href={brandHomeHref} className="flex items-center px-2 pt-1 group">
          <span className="text-xl font-extrabold tracking-tight text-slate-900">furora</span>
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

      {/* Bottom Persona / Active Role Card */}
      <div className="pt-4 border-t border-slate-100">
        {currentUser?.role === 'ADMIN' ? (
          <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-sm">
                {currentUser?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {currentUser?.name || 'Furora Admin'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  ADMIN
                </p>
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
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onOpenSwitchModal}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition group text-left cursor-pointer"
              title="Switch Active Persona / Role"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-sm">
                  {currentUser?.name?.[0] || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {currentUser?.name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {currentUser?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-100 transition flex-shrink-0 ml-1">
                Switch
              </span>
            </button>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition rounded-xl hover:bg-slate-50"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign In as Another User</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
