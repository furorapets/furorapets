'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  PackageCheck,
  X,
  Search,
  Sparkles,
  Lock,
  Layers,
  FileCheck2,
  ChevronDown,
  QrCode,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CustomerOrderContent() {
  const { currentUser, switchToRoleName } = useSession();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [categories, setCategories] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedBreedId, setSelectedBreedId] = useState('');
  const [productPackage, setProductPackage] = useState('Furora Premium Pet Care & Delivery Package');
  const [customerName, setCustomerName] = useState(currentUser?.name || 'Ananya Sharma');
  const [customerContact, setCustomerContact] = useState('+91 9876543216');
  const [deliveryAddress, setDeliveryAddress] = useState('Flat 402, Sunshine Heights, Indiranagar, Bangalore');
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  // Search in orders history
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, ordersRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/orders'),
      ]);

      const catData = await catRes.json();
      const ordersData = await ordersRes.json();

      if (catData.success) {
        setCategories(catData.data);
        if (catData.data.length > 0 && !selectedCatId) {
          setSelectedCatId(catData.data[0].id);
          const activeBreeds = catData.data[0].breeds?.filter((b: any) => b.active) || [];
          setBreeds(activeBreeds);
          if (activeBreeds.length > 0) setSelectedBreedId(activeBreeds[0].id);
        }
      }

      if (ordersData.success) {
        setMyOrders(ordersData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.name) {
      setCustomerName(currentUser.name);
    }
  }, [currentUser]);

  const handleCatChange = (catId: string) => {
    setSelectedCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    const activeBreeds = cat?.breeds?.filter((b: any) => b.active) || [];
    setBreeds(activeBreeds);
    if (activeBreeds.length > 0) setSelectedBreedId(activeBreeds[0].id);
    else setSelectedBreedId('');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !selectedBreedId) {
      alert('Please select category and breed');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCatId,
          breedId: selectedBreedId,
          productOrPackage: productPackage,
          customerName,
          customerContact,
          deliveryAddress,
          paymentStatus: 'PAID',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setPlacedOrder(data.data);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config: Record<string, { dot: string; text: string; bg: string; label: string }> = {
      ORDER_RECEIVED: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/70 border-blue-200', label: 'ORDER RECEIVED' },
      VENDOR_ASSIGNED: { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50/70 border-purple-200', label: 'VENDOR ASSIGNED' },
      VENDOR_ACCEPTED: { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50/70 border-indigo-200', label: 'VENDOR ACCEPTED' },
      VENDOR_REJECTED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/70 border-rose-200', label: 'VENDOR REJECTED' },
      PET_ASSIGNED: { dot: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50/70 border-teal-200', label: 'PET ASSIGNED' },
      PICKUP_ASSIGNED: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/70 border-amber-200', label: 'PICKUP ASSIGNED' },
      READY_FOR_DELIVERY: { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50/70 border-sky-200', label: 'READY FOR DELIVERY' },
      DELIVERY_COMPLETED: { dot: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50/70 border-emerald-200', label: 'DELIVERED' },
      INSPECTION_FAILED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/70 border-rose-200', label: 'INSPECTION FAILED' },
      CANCELLED_REFUNDED: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: 'CANCELLED' },
    };

    const cfg = config[status] || { dot: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', label: status.replace(/_/g, ' ') };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} whitespace-nowrap`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`}></span>
        {cfg.label}
      </span>
    );
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return myOrders;
    const q = searchQuery.toLowerCase().trim();
    return myOrders.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.breed?.name?.toLowerCase().includes(q) ||
        o.category?.name?.toLowerCase().includes(q) ||
        o.pet?.petId?.toLowerCase().includes(q) ||
        o.productOrPackage?.toLowerCase().includes(q)
    );
  }, [myOrders, searchQuery]);

  return (
    <div className="w-full pb-16 space-y-6 animate-fadeIn">
      {/* Header */}
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              My Orders & Tracking
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Customer Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Track pet delivery, view certified health clearances, and access customer records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200">
            Customer: <strong className="ml-1 text-slate-900">{currentUser?.name}</strong>
          </span>
        </div>
      </div>

      {/* Confirmation Banner for Placed Order */}
      {placedOrder && (
        <div className="card-clean p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-soft animate-scaleUp">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950">
                  Order Successfully Placed!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Unique Order ID:{' '}
                  <span className="font-mono font-bold text-emerald-950 bg-emerald-100/90 px-2 py-0.5 rounded text-xs">
                    {placedOrder.orderId}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setPlacedOrder(null)}
              className="w-7 h-7 rounded-full bg-white text-slate-400 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-emerald-900">
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600">Initial Status</span>
              <span className="font-bold">{placedOrder.status}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600">Breed</span>
              <span className="font-bold">{placedOrder.breed?.name}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600">Payment Status</span>
              <span className="font-bold text-emerald-800">{placedOrder.paymentStatus}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600">Order-to-Pet Lock</span>
              <span className="font-semibold text-emerald-700">Awaiting Kennel Allocation</span>
            </div>
          </div>
        </div>
      )}

      {/* Order Placement Form */}
      <div className="card-clean p-6 rounded-2xl shadow-soft">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center">
          <ShoppingBag className="w-4 h-4 text-slate-700 mr-2" /> Place New Customer Order
        </h2>

        <form onSubmit={handlePlaceOrder} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => handleCatChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Breed (Active Breeds Only)
              </label>
              <select
                value={selectedBreedId}
                onChange={(e) => setSelectedBreedId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                {breeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Care & Delivery Package
            </label>
            <select
              value={productPackage}
              onChange={(e) => setProductPackage(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="Furora Premium Pet Care & Delivery Package">
                Furora Premium Pet Care & Delivery Package (Includes Vet Inspection + Digital Certificate)
              </option>
              <option value="Furora Essential Puppy Care Package">
                Furora Essential Puppy Care Package (Health Checked + Home Delivery)
              </option>
              <option value="Furora Purebred Show Package">
                Furora Purebred Show Package (KCI Pedigree + Priority Ops Courier)
              </option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Customer & Delivery Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-100 gap-3">
            <div className="text-[11px] text-slate-400 font-medium flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
              Simulated Instant Payment (Test Mode) Enabled • Auto-Generates Unique FUR-ORD-######
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-soft transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Placing Order...' : 'Confirm Order & Pay'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Customer's Order History & Permanent Link Tracker */}
      <div className="card-clean overflow-hidden rounded-2xl shadow-soft">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Your Active Orders & Permanent Pet Links</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Track lifecycle transitions from Order Received to Delivery Completion.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID or breed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Order ID</th>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Requested Breed</th>
                <th className="px-6 py-3.5 text-left whitespace-nowrap">Linked Pet Profile</th>
                <th className="px-6 py-3.5 text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-3.5 text-center whitespace-nowrap">Payment</th>
                <th className="px-6 py-3.5 text-right whitespace-nowrap">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    {searchQuery ? 'No orders match your search query.' : 'No orders placed yet. Place your first order using the form above!'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    {/* Order ID */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {o.orderId}
                    </td>

                    {/* Breed */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{o.breed?.name}</div>
                      <div className="text-[11px] text-slate-400">{o.category?.name}</div>
                    </td>

                    {/* Linked Pet */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {o.pet ? (
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/pets/${o.pet.petId}`}
                            className="inline-flex items-center font-mono font-bold text-blue-700 bg-blue-50/90 border border-blue-200/80 px-2.5 py-0.5 rounded-full text-xs hover:bg-blue-100 transition shadow-2xs"
                            title="View public digital pet record"
                          >
                            <Layers className="w-3 h-3 mr-1 text-blue-500" />
                            {o.pet.petId}
                          </Link>
                          <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200/60">
                            <Lock className="w-2.5 h-2.5 mr-1" /> Permanent Link
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                          Pending Pet Allocation
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getOrderStatusBadge(o.status)}
                    </td>

                    {/* Payment */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {o.paymentStatus}
                      </span>
                    </td>

                    {/* Certificate & Verified Digital Record Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {o.status === 'READY_FOR_DELIVERY' || o.status === 'DELIVERY_COMPLETED' ? (
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/records/${o.orderId}`}
                            className="inline-flex items-center text-xs font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition shadow-2xs"
                            title="View all complete documents, inspection & delivery proof on scannable QR record"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1 text-slate-600" /> View Record & QR
                          </Link>
                          <Link
                            href={`/certificate/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/80 transition shadow-2xs"
                            title="Print official pet health certificate"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 mr-1" /> Certificate
                          </Link>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Issued upon inspection</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CustomerOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <CustomerOrderContent />
    </Suspense>
  );
}
