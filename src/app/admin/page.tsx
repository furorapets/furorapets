'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ClipboardList,
  Store,
  UserCheck,
  Users,
  Activity,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Database,
  Cloud,
  Mail,
  QrCode,
  Plus,
} from 'lucide-react';
import { useSession } from '@/context/session-context';

export default function AdminDashboardPage() {
  const { currentUser } = useSession();
  const [stats, setStats] = useState({
    petsCount: 0,
    availablePets: 0,
    ordersCount: 0,
    activeOrders: 0,
    vendorsCount: 0,
    draftVendors: 0,
    customersCount: 0,
    usersCount: 0,
    healthStatus: 'HEALTHY',
    r2Configured: true,
    smtpConfigured: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [petsRes, ordersRes, vendorsRes, healthRes] = await Promise.allSettled([
          fetch('/api/pets'),
          fetch('/api/orders'),
          fetch('/api/vendors'),
          fetch('/api/health'),
        ]);

        let petsCount = 0;
        let availablePets = 0;
        if (petsRes.status === 'fulfilled' && petsRes.value.ok) {
          const d = await petsRes.value.json();
          if (d.success && Array.isArray(d.data)) {
            petsCount = d.data.length;
            availablePets = d.data.filter((p: any) => p.status === 'AVAILABLE').length;
          }
        }

        let ordersCount = 0;
        let activeOrders = 0;
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const d = await ordersRes.value.json();
          if (d.success && Array.isArray(d.data)) {
            ordersCount = d.data.length;
            activeOrders = d.data.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
          }
        }

        let vendorsCount = 0;
        let draftVendors = 0;
        if (vendorsRes.status === 'fulfilled' && vendorsRes.value.ok) {
          const d = await vendorsRes.value.json();
          if (d.success && Array.isArray(d.data)) {
            vendorsCount = d.data.length;
            draftVendors = d.data.filter((v: any) => v.onboardingStatus === 'DRAFT').length;
          }
        }

        let healthStatus = 'HEALTHY';
        let r2Configured = true;
        let smtpConfigured = true;
        if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
          const d = await healthRes.value.json();
          healthStatus = d.status || 'HEALTHY';
          r2Configured = d.storage?.r2Configured ?? true;
          smtpConfigured = d.email?.smtpConfigured ?? true;
        }

        setStats({
          petsCount,
          availablePets,
          ordersCount,
          activeOrders,
          vendorsCount,
          draftVendors,
          customersCount: 0,
          usersCount: 0,
          healthStatus,
          r2Configured,
          smtpConfigured,
        });
      } catch (err) {
        console.error('Error loading admin dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Admin Command Center
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Operations
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Furora Platform Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Unified management for categories, pet inventories, vendor breeder partnerships, 11-step dispatch workflows, and access controls.
          </p>
        </div>

        {/* System Health Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-xs">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Turso Cloud LibSQL</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-xs">
            <Cloud className="w-3.5 h-3.5 text-amber-500" />
            <span>Cloudflare R2</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-xs">
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hostinger SMTP</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Pets */}
        <Link
          href="/admin/categories"
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-900 shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pet Inventory</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-blue-700 transition">
            {stats.petsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats.availablePets} Available for sale</span>
            <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition">Manage →</span>
          </div>
        </Link>

        {/* Orders in Pipeline */}
        <Link
          href="/admin/orders"
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-900 shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-amber-700 transition">
            {stats.ordersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats.activeOrders} Active in fulfillment</span>
            <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition">Track →</span>
          </div>
        </Link>

        {/* Vendors */}
        <Link
          href="/admin/vendors"
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-900 shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendor Kennels</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-emerald-700 transition">
            {stats.vendorsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats.draftVendors > 0 ? `${stats.draftVendors} Awaiting wizard` : 'All reviewed'}</span>
            <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition">Review →</span>
          </div>
        </Link>

        {/* Customers */}
        <Link
          href="/admin/customers"
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-900 shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customers</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 group-hover:text-purple-700 transition">
            Active
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Delivery & order records</span>
            <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition">Inspect →</span>
          </div>
        </Link>
      </div>

      {/* 3. Core Operational Modules Cockpit */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Operational Management Modules
          </h2>
          <span className="text-xs text-slate-400">Direct access to all platform workflows</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Categories & Inventory */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-100">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Core Module
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Category & Pet Inventory
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Manage 6 pet categories, 16 breeds, individual pet profiles, microchip IDs, Cloudflare R2 photos/videos, and public QR code verification.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/categories"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-blue-600 transition"
              >
                <span>Open Pet Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Orders & Dispatch */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-100">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  11-Step Pipeline
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Orders & Dispatch Control
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Manage orders from placement to vendor acceptance, pickup verification, vet clinic medical health check sign-off, and customer OTP delivery.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-amber-600 transition"
              >
                <span>Manage Dispatch Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Vendors & Kennels */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Category Scoping
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Vendors & Partner Kennels
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Review onboarding applications, assign authorized pet categories per vendor, verify 5 compliance documents, and inspect facility inventory.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/vendors"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-emerald-600 transition"
              >
                <span>Review Kennels & Assign</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Customers */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-100">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Records
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Customers & Deliveries
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Lookup customer details, delivery destination addresses, past pet orders, and digital health inspection certificates.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/customers"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-purple-600 transition"
              >
                <span>View Customer Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 5: Staff & Accounts */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-200">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Security & Access
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Staff & Access Accounts
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Manage roles and credentials for Administrators, Sales Representatives, Vendor Partners, and Field Delivery Agents.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-slate-700 transition"
              >
                <span>Manage Staff Accounts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 6: Audit Activity */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold border border-rose-100">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Immutable Log
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                System Activity & Audit Log
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Full chronological audit trail documenting pet profile creations, medical reviews, driver dispatches, and role logins.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-rose-600 transition"
              >
                <span>View System Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dedicated Role Portals Hub (Cross-Role Testing for Admin) */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Role Portals Command Access</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              As an Administrator, you can inspect and verify the dedicated dashboards built for Vendors, Sales, and Delivery Agents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Link
            href="/vendor"
            className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs block text-white group-hover:text-emerald-400 transition">
                  Vendor Portal
                </span>
                <span className="text-[10px] text-slate-400">Stock & Order fulfillment</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/sales"
            className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs block text-white group-hover:text-blue-400 transition">
                  Sales Catalog
                </span>
                <span className="text-[10px] text-slate-400">Verified inventory & client shares</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/agent"
            className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs block text-white group-hover:text-amber-400 transition">
                  Delivery Agent Portal
                </span>
                <span className="text-[10px] text-slate-400">Field pickup, vet sign-off & OTP</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}
