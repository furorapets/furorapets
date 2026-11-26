'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Layers,
  ClipboardList,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Truck,
  Sparkles,
  QrCode,
  FileText,
  ExternalLink,
  Award,
  Check,
  Phone,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useSession } from '@/context/session-context';

export default function VendorDashboardPage() {
  const { currentUser } = useSession();
  const [pets, setPets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendorData() {
      setLoading(true);
      try {
        const [petsRes, ordersRes, catRes] = await Promise.allSettled([
          fetch('/api/pets'),
          fetch('/api/orders'),
          fetch('/api/categories'),
        ]);

        if (petsRes.status === 'fulfilled' && petsRes.value.ok) {
          const d = await petsRes.value.json();
          if (d.success && Array.isArray(d.data)) {
            setPets(d.data);
          }
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const d = await ordersRes.value.json();
          if (Array.isArray(d)) {
            setOrders(d);
          } else if (d.success && Array.isArray(d.data)) {
            setOrders(d.data);
          }
        }

        if (catRes.status === 'fulfilled' && catRes.value.ok) {
          const d = await catRes.value.json();
          if (d.success && Array.isArray(d.data)) {
            setCategories(d.data);
          }
        }
      } catch (err) {
        console.error('Error loading vendor dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVendorData();
  }, [currentUser]);

  // Derived metrics
  const totalPets = pets.length;
  const availablePets = pets.filter((p) => p.status === 'AVAILABLE').length;
  const reservedPets = pets.filter((p) => p.status === 'RESERVED' || p.status === 'ASSIGNED_TO_ORDER').length;
  const inTransitOrDelivered = pets.filter(
    (p) => p.status === 'IN_TRANSIT' || p.status === 'DELIVERED'
  ).length;

  const pendingOrders = orders.filter(
    (o) => o.status === 'VENDOR_ASSIGNED' || o.status === 'ORDER_RECEIVED'
  );
  const activeOrders = orders.filter(
    (o) => o.status !== 'DELIVERY_COMPLETED' && o.status !== 'CANCELLED_REFUNDED'
  );

  // Parse authorized categories
  let authorizedCategoryNames: string[] = [];
  if (currentUser?.assignedCategories) {
    try {
      const parsedIds = JSON.parse(currentUser.assignedCategories);
      if (Array.isArray(parsedIds) && parsedIds.length > 0) {
        authorizedCategoryNames = categories
          .filter((c) => parsedIds.includes(c.id))
          .map((c) => c.name);
      }
    } catch {
      // not json
    }
  }

  return (
    <div className="space-y-8 select-none max-w-7xl mx-auto pb-12">
      {/* Kennel Header / Command Banner */}
      <div className="card-clean p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl shadow-xl relative overflow-hidden">
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-40 -mb-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {currentUser?.onboardingStatus === 'APPROVED' ? 'Verified Breeder Partner' : 'Certified Kennel Partner'}
              </span>
              {currentUser?.kennelRegNumber && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 backdrop-blur-md text-slate-300 border border-white/10">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Reg: {currentUser.kennelRegNumber}
                </span>
              )}
              {currentUser?.address && (
                <span className="text-xs text-slate-400 font-medium">
                  • {currentUser.address}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                {currentUser?.name || 'Partner Kennel'}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Breeder Portal
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Manage your certified kennel inventory, register individual pets with microchip numbers & lineage documents, and fulfill live Furora customer orders.
              </p>
            </div>

            {/* Authorized Categories Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Authorized Species:</span>
              {authorizedCategoryNames.length > 0 ? (
                authorizedCategoryNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-medium text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-lg">
                  All Approved Categories
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap md:flex-col gap-2.5 flex-shrink-0">
            <Link
              href="/vendor/pets"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow-lg shadow-black/20"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>+ Add New Pet Profile</span>
            </Link>
            <Link
              href="/vendor/orders"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs transition border border-indigo-500/40 shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Review Orders ({pendingOrders.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Kennel Pets */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Kennel Pets
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {loading ? '...' : totalPets}
            </span>
            <span className="text-xs text-slate-400 font-medium">registered</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Across your authorized categories
          </p>
        </div>

        {/* Available for Clients */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Available For Sale
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">
              {loading ? '...' : availablePets}
            </span>
            <span className="text-xs text-slate-400 font-medium">live on catalog</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Ready for customer reservations
          </p>
        </div>

        {/* Pending Dispatch Orders */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {loading ? '...' : pendingOrders.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">action needed</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Awaiting pet allocation & health docs
          </p>
        </div>

        {/* Transferred to Care */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Transferred to Care
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">
              {loading ? '...' : inTransitOrDelivered}
            </span>
            <span className="text-xs text-slate-400 font-medium">handed over</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Handed over to Furora medical care center
          </p>
        </div>
      </div>

      {/* Core Workflow Bridges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bridge 1: Kennel Inventory & Microchip Management */}
        <div className="card-clean p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Kennel Inventory & Microchip Registry
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Add individual puppies, kittens, and companion animals. Attach high-resolution photos, Sire & Dam pedigree documents, KCI certificates, and dedicated 15-digit microchip identification numbers.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500">
              {availablePets} active profiles listed
            </span>
            <Link
              href="/vendor/pets"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
            >
              <span>Manage Pets & Microchips</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bridge 2: Dispatch Orders & Health Documentation */}
        <div className="card-clean p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Order Fulfillment & Dispatch Responses
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accept customer orders, assign registered pets matching customer specifications, and upload mandatory 7-in-1 vaccination cards and deworming proofs before delivery agent pickup.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500">
              {pendingOrders.length} orders awaiting response
            </span>
            <Link
              href="/vendor/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition"
            >
              <span>Go to Orders Dispatch Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Orders Needing Attention Section */}
      <div className="card-clean bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Incoming & Active Orders</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Orders requiring pet assignment, health documents, or delivery agent pickup
            </p>
          </div>
          <Link
            href="/vendor/orders"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span>View All ({orders.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">No active dispatch orders</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When the Furora sales team assigns a customer order to your facility, it will appear here for one-click acceptance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Category & Breed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Pet</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => {
                  const isPending =
                    order.status === 'VENDOR_ASSIGNED' || order.status === 'ORDER_RECEIVED';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {order.category?.name || 'Pet'} • {order.breed?.name || 'Any Breed'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : order.status === 'HANDED_OVER' || ['PICKUP_ACCEPTED', 'MEDICAL_CHECK', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(order.status)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {order.status === 'HANDED_OVER' || ['PICKUP_ACCEPTED', 'MEDICAL_CHECK', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(order.status)
                            ? 'HANDED OVER TO CARE'
                            : order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {order.pet ? (
                          <span className="font-mono font-semibold text-slate-900">
                            {order.pet.petId} ({order.pet.sex})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold italic">
                            Needs Pet Allocation
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/vendor/orders"
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                            isPending
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{isPending ? 'Accept & Assign' : 'View Order'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Kennel Pets Preview */}
      <div className="card-clean bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Recent Kennel Pet Listings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inventory profiles uploaded with microchip and lineage verification
            </p>
          </div>
          <Link
            href="/vendor/pets"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span>Manage All Pets ({pets.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading pets...</div>
        ) : pets.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">No pets currently in your kennel inventory</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your available puppies, kittens, or birds with microchip numbers and pedigree records to make them available for sales reservations.
            </p>
            <Link
              href="/vendor/pets"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Your First Pet</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Pet ID</th>
                  <th className="py-3 px-4">Category & Breed</th>
                  <th className="py-3 px-4">Microchip #</th>
                  <th className="py-3 px-4">Sex & Colour</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pets.slice(0, 5).map((pet) => (
                  <tr key={pet.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {pet.petId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {pet.category?.name || 'Pet'} • {pet.breed?.name || 'Breed'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {pet.microchipNumber ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          {pet.microchipNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending Chip</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pet.sex} • {pet.colour}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pet.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pet.status === 'RESERVED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pet.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href="/vendor/pets"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold transition"
                      >
                        <span>Edit</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance & Support Banner */}
      <div className="card-clean p-6 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Furora Ethical Breeding & Biosecurity Commitment
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              All listed pets must have documented veterinary health records, clean living environment certifications, and adherence to AWBI and Kennel Club guidelines. For assistance or questions regarding verification, reach out to our partner helpline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-500">Breeder Ops Desk:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-sm">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            +91 800-FURORA-OPS
          </span>
        </div>
      </div>
    </div>
  );
}
