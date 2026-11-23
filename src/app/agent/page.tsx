'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Phone,
  MapPin,
  Store,
  User,
  CheckSquare,
  FileCheck2,
  QrCode,
  Sparkles,
  ChevronRight,
  Calendar,
  Layers,
  Activity,
  HeartHandshake,
} from 'lucide-react';
import { useSession } from '@/context/session-context';

export default function AgentDashboardPage() {
  const { currentUser } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgentOrders() {
      setLoading(true);
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d)) {
            setOrders(d);
          } else if (d.success && Array.isArray(d.data)) {
            setOrders(d.data);
          }
        }
      } catch (err) {
        console.error('Error loading agent orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAgentOrders();
  }, [currentUser]);

  // Derived metrics
  const activeOrders = orders.filter(
    (o) => o.status !== 'DELIVERY_COMPLETED' && o.status !== 'CANCELLED_REFUNDED'
  );
  const pendingPickups = orders.filter(
    (o) =>
      o.status === 'PICKUP_ASSIGNED' ||
      o.status === 'VENDOR_ACCEPTED' ||
      o.status === 'PET_ASSIGNED'
  );
  const pendingMedical = orders.filter(
    (o) =>
      o.status === 'PICKUP_ACCEPTED' ||
      o.status === 'PICKUP_INSPECTION' ||
      o.status === 'MEDICAL_CHECK'
  );
  const completedDeliveries = orders.filter(
    (o) => o.status === 'DELIVERY_COMPLETED'
  );

  return (
    <div className="space-y-8 select-none max-w-7xl mx-auto pb-12">
      {/* Agent Operational Status Banner */}
      <div className="card-clean p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-xl relative overflow-hidden">
        {/* Decorative ambient blur */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-40 -mb-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active on Duty • Live Dispatch
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 backdrop-blur-md text-slate-300 border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Hub: {currentUser?.assignedHub || 'Regional Field Hub'}
              </span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                {currentUser?.name || 'Delivery Operations Agent'}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Field Logistics
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Conduct on-site 10-point kennel health inspections, microchip verification, vet clinic medical clearances, and secure OTP doorstep handovers.
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-wrap md:flex-col gap-2.5 flex-shrink-0">
            <Link
              href="/agent/order"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-950/40"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Open Field Inspection Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Trips */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {loading ? '...' : activeOrders.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">in progress</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Assigned deliveries requiring action
          </p>
        </div>

        {/* Pending Pickups */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Pickups
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {loading ? '...' : pendingPickups.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">at breeder facility</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Requires 10-point checklist & photo
          </p>
        </div>

        {/* Medical Sign-Offs */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vet Clearances
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">
              {loading ? '...' : pendingMedical.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">clinical checks</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Rapid antigen & clinical inspection
          </p>
        </div>

        {/* Completed Deliveries */}
        <div className="card-clean p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Completed Handover
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">
              {loading ? '...' : completedDeliveries.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">safe deliveries</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            OTP confirmed by customer
          </p>
        </div>
      </div>

      {/* 3 Step Protocol Overview Card */}
      <div className="card-clean p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Standard Field Operational Protocol (3-Stage Chain of Custody)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-900">Breeder Kennel Pickup</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Verify 15-digit microchip, complete 10-point health checklist, inspect carrier hygiene, and capture physical photo evidence.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-900">Vet Medical Clearance</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Bring pet to partner vet clinic. Obtain negative test for Parvo/Corona/Distemper and official veterinarian medical certificate.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <h4 className="text-xs font-bold text-slate-900">Doorstep OTP Handover</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Verify customer identity, enter 6-digit customer delivery OTP, hand over vaccination records and pet welcome kit.
            </p>
          </div>
        </div>
      </div>

      {/* Active Trip Queue */}
      <div className="card-clean bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Delivery Trips</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live orders assigned to your field route requiring inspection, vet clearance, or customer delivery
            </p>
          </div>
          <Link
            href="/agent/order"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span>Open Field Inspection Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading assigned trips...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">No active delivery assignments</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              New orders scheduled for pickup in your hub territory will be automatically routed to your dispatch queue.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const isCompleted = order.status === 'DELIVERY_COMPLETED';
              const isReadyForDelivery = order.status === 'READY_FOR_DELIVERY';
              const isMedical = order.status === 'PICKUP_ACCEPTED' || order.status === 'MEDICAL_CHECK';
              const isPickup = !isCompleted && !isReadyForDelivery && !isMedical;

              return (
                <div
                  key={order.id}
                  className="p-5 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isReadyForDelivery
                            ? 'bg-blue-100 text-blue-800'
                            : isMedical
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      {order.pet?.microchipNumber && (
                        <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Chip: {order.pet.microchipNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div>
                        <span className="font-bold text-slate-800">Pet:</span>{' '}
                        {order.category?.name || 'Pet'} • {order.breed?.name || 'Breed'}
                      </div>
                      {order.vendor && (
                        <div className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>Breeder: {order.vendor.name}</span>
                        </div>
                      )}
                      {order.deliveryCity && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Destination: {order.deliveryCity}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                      href={`/agent/order?orderId=${order.id}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                        isCompleted
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : isReadyForDelivery
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : isMedical
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>
                        {isCompleted
                          ? 'View Verification Log'
                          : isReadyForDelivery
                          ? 'Verify Customer OTP'
                          : isMedical
                          ? 'Submit Vet Sign-Off'
                          : 'Start 10-Point Pickup'}
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fleet Hygiene & Biosecurity Checklist Card */}
      <div className="card-clean p-6 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Transit Vehicle Biosecurity Protocol
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Every transport vehicle must be disinfected with veterinary-grade Virkon-S between pickups. Temperature inside the carrier compartment must be maintained between 21°C and 25°C at all times.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-500">Logistics Helpline:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-sm">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            +91 800-TRANSIT-HUB
          </span>
        </div>
      </div>
    </div>
  );
}
