'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import {
  Store,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  X,
  Sparkles,
  Search,
  Layers,
  ChevronDown,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  Check,
  FileText,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VendorOrdersContent() {
  const { currentUser, switchToRoleName, availableUsers } = useSession();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [orders, setOrders] = useState<any[]>([]);
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  // Accept Modal
  const [acceptingOrder, setAcceptingOrder] = useState<any | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [vaccinationCardUrl, setVaccinationCardUrl] = useState<string>(
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80'
  );
  const [dewormingRecordUrl, setDewormingRecordUrl] = useState<string>(
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'
  );
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  // Reject Modal
  const [rejectingOrder, setRejectingOrder] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Infinite Scroll Pagination
  const [visibleCount, setVisibleCount] = useState(25);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, petsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/pets?status=AVAILABLE'),
      ]);

      const ordersData = await ordersRes.json();
      const petsData = await petsRes.json();

      if (ordersData.success) setOrders(ordersData.data);
      if (petsData.success) setAvailablePets(petsData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle URL query changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setVisibleCount(25);
  }, [searchQuery, statusFilter, vendorFilter]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 25);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Vendor filter for Admin view
      if (currentUser?.role === 'ADMIN' && vendorFilter !== 'ALL') {
        if (o.vendorId !== vendorFilter) return false;
      }

      // Status Filter
      if (statusFilter === 'ACTION_REQUIRED') {
        if (o.status !== 'VENDOR_ASSIGNED') return false;
      } else if (statusFilter === 'PET_ASSIGNED') {
        if (o.status !== 'PET_ASSIGNED' && o.status !== 'VENDOR_ACCEPTED') return false;
      } else if (statusFilter === 'IN_TRANSIT') {
        if (!['PICKUP_ASSIGNED', 'READY_FOR_DELIVERY'].includes(o.status)) return false;
      } else if (statusFilter === 'INSPECTION_FAILED') {
        if (o.status !== 'INSPECTION_FAILED') return false;
      } else if (statusFilter === 'VENDOR_REJECTED') {
        if (o.status !== 'VENDOR_REJECTED') return false;
      } else if (statusFilter === 'DELIVERY_COMPLETED') {
        if (o.status !== 'DELIVERY_COMPLETED') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderIdMatch = o.orderId?.toLowerCase().includes(q);
        const custMatch = o.customerName?.toLowerCase().includes(q);
        const breedMatch = o.breed?.name?.toLowerCase().includes(q);
        const catMatch = o.category?.name?.toLowerCase().includes(q);
        const petMatch = o.pet?.petId?.toLowerCase().includes(q);
        const pkgMatch = o.productOrPackage?.toLowerCase().includes(q);
        if (!orderIdMatch && !custMatch && !breedMatch && !catMatch && !petMatch && !pkgMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, currentUser, vendorFilter, statusFilter, searchQuery]);

  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  // Metrics counts
  const metrics = useMemo(() => {
    const actionRequired = orders.filter((o) => o.status === 'VENDOR_ASSIGNED').length;
    const acceptedStaged = orders.filter((o) => ['PET_ASSIGNED', 'VENDOR_ACCEPTED'].includes(o.status)).length;
    const dispatched = orders.filter((o) => ['PICKUP_ASSIGNED', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(o.status)).length;
    return { actionRequired, acceptedStaged, dispatched };
  }, [orders]);

  // Matching pets for current accepting order
  const matchingPetsForAccept = useMemo(() => {
    if (!acceptingOrder) return [];
    return availablePets.filter((p) => {
      // Must match breed
      if (p.breedId !== acceptingOrder.breedId && p.breed?.id !== acceptingOrder.breedId) {
        return false;
      }
      // If vendor persona, must belong to this vendor
      if (currentUser?.role === 'VENDOR' && p.vendorId && p.vendorId !== currentUser.id) {
        return false;
      }
      return true;
    });
  }, [acceptingOrder, availablePets, currentUser]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingOrder || !selectedPetId) {
      alert('Please select a matching pet from your kennel inventory');
      return;
    }

    setIsSubmittingAccept(true);
    try {
      const res = await fetch(`/api/orders/${acceptingOrder.id}/vendor-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT',
          petId: selectedPetId,
          vaccinationCardUrl,
          dewormingRecordUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept order');

      setAcceptingOrder(null);
      setSelectedPetId('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder || !rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    setIsSubmittingReject(true);
    try {
      const res = await fetch(`/api/orders/${rejectingOrder.id}/vendor-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline order');

      setRejectingOrder(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config: Record<string, { dot: string; text: string; bg: string; label: string }> = {
      VENDOR_ASSIGNED: {
        dot: 'bg-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50/70 border-purple-200',
        label: 'VENDOR ASSIGNED',
      },
      VENDOR_ACCEPTED: {
        dot: 'bg-indigo-500',
        text: 'text-indigo-700',
        bg: 'bg-indigo-50/70 border-indigo-200',
        label: 'VENDOR ACCEPTED',
      },
      VENDOR_REJECTED: {
        dot: 'bg-rose-500',
        text: 'text-rose-700',
        bg: 'bg-rose-50/70 border-rose-200',
        label: 'VENDOR REJECTED',
      },
      PET_ASSIGNED: {
        dot: 'bg-teal-500',
        text: 'text-teal-700',
        bg: 'bg-teal-50/70 border-teal-200',
        label: 'PET ASSIGNED',
      },
      PICKUP_ASSIGNED: {
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50/70 border-amber-200',
        label: 'PICKUP ASSIGNED',
      },
      READY_FOR_DELIVERY: {
        dot: 'bg-sky-500',
        text: 'text-sky-700',
        bg: 'bg-sky-50/70 border-sky-200',
        label: 'READY FOR DELIVERY',
      },
      DELIVERY_COMPLETED: {
        dot: 'bg-emerald-600',
        text: 'text-emerald-800',
        bg: 'bg-emerald-50/70 border-emerald-200',
        label: 'DELIVERED',
      },
      INSPECTION_FAILED: {
        dot: 'bg-rose-500',
        text: 'text-rose-700',
        bg: 'bg-rose-50/70 border-rose-200',
        label: 'INSPECTION FAILED',
      },
      ORDER_RECEIVED: {
        dot: 'bg-blue-500',
        text: 'text-blue-700',
        bg: 'bg-blue-50/70 border-blue-200',
        label: 'ORDER RECEIVED',
      },
      CANCELLED_REFUNDED: {
        dot: 'bg-slate-400',
        text: 'text-slate-600',
        bg: 'bg-slate-50 border-slate-200',
        label: 'CANCELLED',
      },
    };

    const cfg = config[status] || {
      dot: 'bg-slate-400',
      text: 'text-slate-700',
      bg: 'bg-slate-50 border-slate-200',
      label: status.replace(/_/g, ' '),
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} whitespace-nowrap`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`}></span>
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Persona Guard: allow Vendor and Admin
  if (currentUser && currentUser.role !== 'VENDOR' && currentUser.role !== 'ADMIN') {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Vendor Portal (Breeder Kennels)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current persona is <strong>{currentUser.name}</strong> ({currentUser.role}). Order
            fulfillment and allocation require Vendor or Admin authentication.
          </p>
        </div>
        <button
          onClick={() => switchToRoleName('VENDOR')}
          className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition shadow-soft cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Switch to Pet World Breeders (Vendor)
        </button>
      </div>
    );
  }

  // Vendor Onboarding Compliance Gate
  if (currentUser?.role === 'VENDOR' && currentUser?.onboardingStatus && currentUser.onboardingStatus !== 'APPROVED') {
    const isPending = currentUser.onboardingStatus === 'PENDING';
    const isChangesRequested = currentUser.onboardingStatus === 'CHANGES_REQUESTED';
    const isRejected = currentUser.onboardingStatus === 'REJECTED';

    return (
      <div className="card-clean p-8 max-w-xl mx-auto mt-12 text-center space-y-5">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            isPending
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : isChangesRequested
              ? 'bg-orange-50 text-orange-600 border border-orange-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}
        >
          {isPending ? (
            <Clock className="w-7 h-7 animate-pulse" />
          ) : isChangesRequested ? (
            <AlertCircle className="w-7 h-7" />
          ) : (
            <XCircle className="w-7 h-7" />
          )}
        </div>

        <div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
              isPending
                ? 'bg-amber-100 text-amber-800'
                : isChangesRequested
                ? 'bg-orange-100 text-orange-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isPending
              ? 'Verification Under Review'
              : isChangesRequested
              ? 'Action Required: Re-submission'
              : 'Application Not Approved'}
          </span>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isPending
              ? 'Breeder Partner Account Pending Review'
              : isChangesRequested
              ? 'Document Re-submission Requested'
              : 'Application Not Approved'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Facility: <strong>{currentUser.name}</strong> • KCI / AWBI Reg:{' '}
            <span className="font-mono">{currentUser.kennelRegNumber || 'Under Review'}</span>
          </p>
        </div>

        {isChangesRequested && currentUser.onboardingNotes && (
          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-left text-xs text-orange-950 space-y-1">
            <span className="font-bold text-orange-800 block">Furora Admin Correction Notes:</span>
            <p className="italic">"{currentUser.onboardingNotes}"</p>
          </div>
        )}

        {isPending && (
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Our compliance team is verifying your 5 compliance documents (Kennel Registration, Breeder Govt ID, Municipal
            Trade License, Vet MoU, and Bank Proof). Once approved, you can accept puppy orders and register inventory
            here.
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/partner/onboard?email=${encodeURIComponent(currentUser.email)}&tab=track`}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{isChangesRequested ? 'Update & Re-submit Documents' : 'Track Status on Partner Portal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => switchToRoleName('ADMIN')}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Switch to Admin
          </button>
        </div>
      </div>
    );
  }

  const isSimulatingAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="w-full pb-16 space-y-4 animate-fadeIn">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Vendor Orders & Fulfillment
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Breeder Kennels
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Accept orders, allocate registered pets, and prepare handovers for ops agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/vendor/pets"
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition active:scale-95"
          >
            Manage Kennel Pets &rarr;
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'ACTION_REQUIRED' ? 'ALL' : 'ACTION_REQUIRED')}
          className={`card-clean p-4 rounded-2xl cursor-pointer transition border ${
            statusFilter === 'ACTION_REQUIRED'
              ? 'border-purple-500 bg-purple-50/30'
              : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Action Required</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.actionRequired}</div>
          <div className="text-[10px] text-purple-600 font-bold mt-1">Pending Vendor Response</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'PET_ASSIGNED' ? 'ALL' : 'PET_ASSIGNED')}
          className={`card-clean p-4 rounded-2xl cursor-pointer transition border ${
            statusFilter === 'PET_ASSIGNED'
              ? 'border-teal-500 bg-teal-50/30'
              : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Accepted & Staged</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.acceptedStaged}</div>
          <div className="text-[10px] text-teal-600 font-bold mt-1">Pet Allocated to Order</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'IN_TRANSIT' ? 'ALL' : 'IN_TRANSIT')}
          className={`card-clean p-4 rounded-2xl cursor-pointer transition border ${
            statusFilter === 'IN_TRANSIT'
              ? 'border-amber-500 bg-amber-50/30'
              : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Dispatched / Active</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.dispatched}</div>
          <div className="text-[10px] text-amber-600 font-bold mt-1">Agent Pickup & Delivery</div>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Available In Stock</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{availablePets.length}</div>
          <div className="text-[10px] text-blue-600 font-bold mt-1">Ready for Allocation</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-clean p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-soft">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, breed, or pet ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Admin Vendor Filter */}
          {isSimulatingAdmin && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="ALL">All Breeder Facilities</option>
                <option value="usr_vendor_1">Pet World Breeders</option>
                <option value="usr_vendor_2">Furry Friends Kennel</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTION_REQUIRED">⚡ Action Required (VENDOR_ASSIGNED)</option>
              <option value="PET_ASSIGNED">✓ Accepted & Staged</option>
              <option value="IN_TRANSIT">🚚 Dispatched / Ready</option>
              <option value="INSPECTION_FAILED">✕ Inspection Failed</option>
              <option value="VENDOR_REJECTED">✕ Declined</option>
              <option value="DELIVERY_COMPLETED">✓ Delivered</option>
            </select>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap pl-1">
            Showing {displayedOrders.length} of {filteredOrders.length}
          </span>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="card-clean overflow-hidden rounded-2xl shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Order ID</th>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Requested Breed</th>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Customer & Package</th>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Allocated Pet</th>
                <th className="px-6 py-3.5 text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-3.5 text-right whitespace-nowrap">Vendor Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'No orders found matching your filters.'
                      : 'No orders currently assigned to your facility.'}
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    {/* Order ID */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {o.orderId}
                    </td>

                    {/* Requested Breed */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{o.breed?.name}</div>
                      <div className="text-[11px] text-slate-400">{o.category?.name}</div>
                    </td>

                    {/* Customer & Package */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{o.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{o.productOrPackage}</div>
                    </td>

                    {/* Allocated Pet */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {o.pet ? (
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/categories?q=${o.pet.petId}`}
                            className="inline-flex items-center font-mono font-bold text-blue-700 bg-blue-50/90 border border-blue-200/80 px-2.5 py-0.5 rounded-full text-xs hover:bg-blue-100 transition shadow-2xs"
                            title="Click to view pet in Category & Pet Inventory"
                          >
                            <Layers className="w-3 h-3 mr-1 text-blue-500" />
                            {o.pet.petId}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {o.pet.colour} • {o.pet.sex}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Pet Allocation
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getOrderStatusBadge(o.status)}
                    </td>

                    {/* Vendor Response Action */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {o.status === 'VENDOR_ASSIGNED' ? (
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => {
                              setAcceptingOrder(o);
                              setSelectedPetId('');
                            }}
                            className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Accept Order
                          </button>
                          <button
                            onClick={() => {
                              setRejectingOrder(o);
                              setRejectionReason('');
                            }}
                            className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                          </button>
                        </div>
                      ) : o.status === 'PET_ASSIGNED' || o.status === 'VENDOR_ACCEPTED' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/70">
                          <Check className="w-3 h-3 mr-1" /> Accepted & Staged
                        </span>
                      ) : o.status === 'PICKUP_ASSIGNED' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70">
                          <Truck className="w-3 h-3 mr-1" /> Agent Dispatched
                        </span>
                      ) : o.status === 'READY_FOR_DELIVERY' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/70">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Inspection Passed
                        </span>
                      ) : o.status === 'INSPECTION_FAILED' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/70">
                          <XCircle className="w-3 h-3 mr-1" /> Inspection Failed
                        </span>
                      ) : o.status === 'VENDOR_REJECTED' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                          Declined by Kennel
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold">Fulfillment Locked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Sentinel */}
        {displayedOrders.length < filteredOrders.length && (
          <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400 border-t border-slate-50 flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
            Loading more orders...
          </div>
        )}
      </div>

      {/* Accept & Allocate Pet Modal */}
      {acceptingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Accept Order & Allocate Pet</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a matching <strong className="text-slate-800">{acceptingOrder.breed?.name}</strong> from your kennel inventory.
                </p>
              </div>
              <button
                onClick={() => setAcceptingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Brief */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{acceptingOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Customer:</span>
                <span className="font-bold text-slate-800">{acceptingOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Breed & Package:</span>
                <span className="text-slate-700">{acceptingOrder.breed?.name} • {acceptingOrder.productOrPackage}</span>
              </div>
            </div>

            <form onSubmit={handleAccept} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select In-Stock Pet ({matchingPetsForAccept.length} available)
                </label>
                {matchingPetsForAccept.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-800 space-y-2">
                    <p>
                      You currently have no available <strong>{acceptingOrder.breed?.name}</strong> in your kennel inventory.
                    </p>
                    <div className="pt-1 flex gap-2">
                      <Link
                        href="/vendor/pets"
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition"
                      >
                        Add Pet to Inventory &rarr;
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          const o = acceptingOrder;
                          setAcceptingOrder(null);
                          setRejectingOrder(o);
                          setRejectionReason('Breed currently out of stock at facility');
                        }}
                        className="px-3 py-1.5 border border-amber-300 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100/60 transition"
                      >
                        Decline Order
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Matching In-Stock Pet --</option>
                    {matchingPetsForAccept.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.petId} — {p.sex} • {p.colour} (Age: {p.age || 'Puppy'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Breeder Kennel Origin Documents */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" /> Attach Kennel Origin Documents
                </span>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Puppy Vaccination Card URL / Scan *
                  </label>
                  <input
                    type="url"
                    required
                    value={vaccinationCardUrl}
                    onChange={(e) => setVaccinationCardUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Deworming Record & Pedigree Slip URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={dewormingRecordUrl}
                    onChange={(e) => setDewormingRecordUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                <strong className="block mb-0.5">Permanent Order-to-Pet Allocation</strong>
                Once accepted, this pet is permanently locked to order <strong>{acceptingOrder.orderId}</strong> and will be staged for ops agent pickup and medical inspection.
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAcceptingOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={matchingPetsForAccept.length === 0 || !selectedPetId || isSubmittingAccept}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAccept ? 'Locking Pet...' : 'Confirm Allocation & Accept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Order Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="card-clean max-w-md w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Decline Order Assignment</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Order <span className="font-mono font-bold text-slate-800">{rejectingOrder.orderId}</span> will be marked as VENDOR REJECTED.
                </p>
              </div>
              <button
                onClick={() => setRejectingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rejection Reason (Mandatory)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Breed currently out of stock at our kennel"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 mb-2"
                  required
                />

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Breed currently out of stock',
                    'Facility at maximum capacity',
                    'Medical quarantine in effect',
                    'Unable to meet delivery date',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-[11px] text-rose-800">
                Declining this order returns it to the Admin order queue for re-assignment to another partner kennel.
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim() || isSubmittingReject}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSubmittingReject ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <VendorOrdersContent />
    </Suspense>
  );
}
