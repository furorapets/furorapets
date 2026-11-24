'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  Search,
  Plus,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Package,
  CreditCard,
  QrCode,
  Lock,
} from 'lucide-react';
import { useSession } from '@/context/session-context';

function SalesOrdersContent() {
  const { currentUser } = useSession();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Booking Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCatId, setCreateCatId] = useState('');
  const [createBreedId, setCreateBreedId] = useState('');
  const [createCustomerName, setCreateCustomerName] = useState('');
  const [createCustomerContact, setCreateCustomerContact] = useState('');
  const [createDeliveryAddress, setCreateDeliveryAddress] = useState('');
  const [createPackage, setCreatePackage] = useState('Standard Verified Pet Delivery Package');
  const [createPaymentStatus, setCreatePaymentStatus] = useState('PAID');
  const [createPaymentMode, setCreatePaymentMode] = useState('ADVANCE_COD');
  const [createAdvancePaid, setCreateAdvancePaid] = useState('15000');
  const [createOrderSource, setCreateOrderSource] = useState('DIRECT_SALES_ENQUIRY');
  const [createSelectedPetId, setCreateSelectedPetId] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [bookingSuccessToast, setBookingSuccessToast] = useState<string | null>(null);

  // Inspect Modal State
  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, catsRes, petsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/categories'),
        fetch('/api/pets?status=AVAILABLE'),
      ]);

      const ordersData = await ordersRes.json();
      const catsData = await catsRes.json();
      const petsData = await petsRes.json();

      if (ordersData.success) setOrders(ordersData.data || []);
      if (catsData.success) {
        setCategories(catsData.data || []);
        if (catsData.data?.length > 0 && !createCatId) {
          setCreateCatId(catsData.data[0].id);
          if (catsData.data[0].breeds?.length > 0) {
            setCreateBreedId(catsData.data[0].breeds[0].id);
          }
        }
      }
      if (petsData.success) setAvailablePets(petsData.data || []);
    } catch (e) {
      console.error('Failed to load sales orders data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle category change in booking modal
  const handleCategoryChange = (catId: string) => {
    setCreateCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.breeds && cat.breeds.length > 0) {
      setCreateBreedId(cat.breeds[0].id);
    } else {
      setCreateBreedId('');
    }
    setCreateSelectedPetId('');
  };

  // Breeds under selected category
  const activeBreeds = useMemo(() => {
    const cat = categories.find((c) => c.id === createCatId);
    return cat ? cat.breeds || [] : [];
  }, [categories, createCatId]);

  // Pets available for the selected breed
  const petsForSelectedBreed = useMemo(() => {
    if (!createBreedId) return availablePets;
    return availablePets.filter((p) => p.breedId === createBreedId || p.breed?.id === createBreedId);
  }, [availablePets, createBreedId]);

  // Handle Create Booking Submission
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCatId || !createBreedId || !createCustomerName || !createCustomerContact || !createDeliveryAddress) {
      setCreateError('Please fill in Customer Name, Contact Number, Delivery Address, Category, and Breed.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload: any = {
        categoryId: createCatId,
        breedId: createBreedId,
        customerName: createCustomerName.trim(),
        customerContact: createCustomerContact.trim(),
        deliveryAddress: createDeliveryAddress.trim(),
        productOrPackage: createPackage,
        paymentStatus: createPaymentStatus,
        paymentMode: createPaymentMode,
        advancePaid: createAdvancePaid ? Number(createAdvancePaid) : 0,
        orderSource: createOrderSource,
      };

      if (createSelectedPetId) {
        payload.petId = createSelectedPetId;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place booking order.');
      }

      setBookingSuccessToast(`Booking placed successfully: ${data.data.orderId}`);
      setTimeout(() => setBookingSuccessToast(null), 5000);

      // Reset form
      setCreateCustomerName('');
      setCreateCustomerContact('');
      setCreateDeliveryAddress('');
      setCreateSelectedPetId('');
      setIsCreateModalOpen(false);

      // Reload orders list
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        order.orderId?.toLowerCase().includes(q) ||
        order.customerName?.toLowerCase().includes(q) ||
        order.customerContact?.toLowerCase().includes(q) ||
        order.deliveryAddress?.toLowerCase().includes(q) ||
        order.pet?.petId?.toLowerCase().includes(q) ||
        order.breed?.name?.toLowerCase().includes(q) ||
        order.category?.name?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const inTransit = orders.filter((o) =>
      ['PICKUP_CONFIRMED', 'MEDICAL_CHECK_PASSED', 'IN_TRANSIT', 'DISPATCHED'].includes(o.status)
    ).length;
    const delivered = orders.filter((o) => ['DELIVERY_COMPLETED', 'DELIVERED'].includes(o.status)).length;
    const pendingFulfillment = orders.filter((o) =>
      ['ORDER_RECEIVED', 'VENDOR_ASSIGNED', 'PET_ASSIGNED'].includes(o.status)
    ).length;

    return { total, inTransit, delivered, pendingFulfillment };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ORDER_RECEIVED':
        return { label: 'Order Received', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'VENDOR_ASSIGNED':
        return { label: 'Breeder Assigned', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'PET_ASSIGNED':
        return { label: 'Pet Linked & Reserved', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'PICKUP_CONFIRMED':
        return { label: 'Picked Up by Courier', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'MEDICAL_CHECK_PASSED':
        return { label: 'Vet Clearance Passed', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'IN_TRANSIT':
        return { label: 'In Transit to Client', bg: 'bg-cyan-50 text-cyan-800 border-cyan-200 animate-pulse' };
      case 'DELIVERY_COMPLETED':
      case 'DELIVERED':
        return { label: 'Delivered & Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getPetPhoto = (order: any) => {
    if (order.pet?.photos) {
      try {
        const parsed = typeof order.pet.photos === 'string' ? JSON.parse(order.pet.photos) : order.pet.photos;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch {
        if (typeof order.pet.photos === 'string' && order.pet.photos.startsWith('http')) {
          return order.pet.photos;
        }
      }
    }
    return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=400&q=80';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {bookingSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{bookingSuccessToast}</span>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Orders & Bookings</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Sales Desk View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Handle customer pet bookings, manage delivery requests, and track real-time dispatch progress.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition shadow-sm text-xs font-semibold cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateError('');
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-soft transition cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Booking</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white shadow-soft">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">
            Total Customer Bookings
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Recorded sales pipeline</span>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white shadow-soft">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">
            Fulfillment in Progress
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{metrics.pendingFulfillment}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Breeder assignment & vet prep</span>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white shadow-soft">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">
            Dispatched & In Transit
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-600">{metrics.inTransit}</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Live field tracking active</span>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white shadow-soft">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">
            Successfully Delivered
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{metrics.delivered}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Customer verified handover</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-clean p-3.5 rounded-2xl border border-slate-100 bg-white shadow-soft flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID (FUR-ORD-...), Customer Name, Contact, Pet ID, Breed..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses ({orders.length})</option>
              <option value="ORDER_RECEIVED">Order Received</option>
              <option value="VENDOR_ASSIGNED">Breeder Assigned</option>
              <option value="PET_ASSIGNED">Pet Linked & Reserved</option>
              <option value="PICKUP_CONFIRMED">Picked Up</option>
              <option value="MEDICAL_CHECK_PASSED">Vet Clearance</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERY_COMPLETED">Delivered</option>
            </select>
          </div>

          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Sales Catalog</span>
          </Link>
        </div>
      </div>

      {/* Orders List / Cards */}
      {loading ? (
        <div className="card-clean p-12 text-center rounded-2xl bg-white border border-slate-100">
          <div className="w-7 h-7 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600">Loading Customer Orders & Bookings...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-clean p-12 text-center rounded-2xl bg-white border border-slate-100 space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Orders Match Your Query</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or resetting the status filter.'
              : 'No customer orders have been placed yet. Click "New Customer Booking" to book an available pet.'}
          </p>
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateError('');
            }}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create First Booking
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusBadge(order.status);
            const petImg = getPetPhoto(order);

            return (
              <div
                key={order.id}
                className="card-clean p-5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  {/* Order ID & Status */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                      {order.orderId}
                    </span>
                    <span
                      className={`inline-flex items-center text-[11px] font-extrabold px-3 py-0.5 rounded-full border ${statusInfo.bg}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Booked: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Payment Details */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mode: <strong className="font-bold text-slate-800">{order.paymentMode || 'Prepaid'}</strong></span>
                    </div>
                    {order.advancePaid ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-bold text-[11px] border border-emerald-200">
                        Advance: ₹{order.advancePaid.toLocaleString('en-IN')}
                      </span>
                    ) : null}
                    <span className="text-slate-400 text-[10px] font-mono bg-slate-50 px-2 py-0.5 rounded">
                      {order.orderSource || 'DIRECT'}
                    </span>
                  </div>
                </div>

                {/* Main Content Grid: Pet, Customer, Delivery */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* Column 1: Pet Details */}
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200/80">
                      <img src={petImg} alt={order.breed?.name || 'Pet'} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Assigned Pet
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        {order.breed?.name || 'Standard Breed'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">{order.category?.name || 'Pet'}</p>
                      {order.pet ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {order.pet.petId}
                          </span>
                          {order.pet.microchipNumber && (
                            <span className="font-mono text-[10px] text-emerald-700 truncate max-w-[110px]" title={order.pet.microchipNumber}>
                              Chip: {order.pet.microchipNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                          Allocation Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Customer Information */}
                  <div className="space-y-1.5 border-l border-slate-100 pl-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Customer & Contact
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.customerContact}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Column 3: Package & Fulfillment Status */}
                  <div className="space-y-2 border-l border-slate-100 pl-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Commercial Package
                      </span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5">
                        {order.productOrPackage}
                      </p>
                      {order.agent && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                          <Truck className="w-3 h-3 text-indigo-500" />
                          <span>Delivery Agent: <strong className="font-bold text-slate-800">{order.agent.name}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setInspectingOrder(order)}
                        className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      >
                        Inspect Booking
                      </button>

                      {order.pet?.petId ? (
                        <Link
                          href={`/pets/${order.pet.petId}`}
                          target="_blank"
                          className="inline-flex items-center justify-center text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                          title="Open Customer Provenance Certificate"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1 text-slate-500" /> Provenance
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Progress Step Bar */}
                <div className="mt-4 pt-3 border-t border-slate-50">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>1. Booked</span>
                    <span>2. Breeder Assigned</span>
                    <span>3. Pet Linked</span>
                    <span>4. Vet Checked & Transit</span>
                    <span>5. Delivered</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        order.status === 'DELIVERY_COMPLETED' || order.status === 'DELIVERED'
                          ? 'w-full bg-emerald-500'
                          : order.status === 'IN_TRANSIT'
                          ? 'w-4/5 bg-cyan-500'
                          : order.status === 'MEDICAL_CHECK_PASSED' || order.status === 'PICKUP_CONFIRMED'
                          ? 'w-3/5 bg-indigo-500'
                          : order.status === 'PET_ASSIGNED'
                          ? 'w-2/5 bg-purple-500'
                          : order.status === 'VENDOR_ASSIGNED'
                          ? 'w-1/5 bg-blue-500'
                          : 'w-1/12 bg-amber-500'
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Order Modal */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {inspectingOrder.orderId}
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      getStatusBadge(inspectingOrder.status).bg
                    }`}
                  >
                    {getStatusBadge(inspectingOrder.status).label}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Customer Order Dossier & Tracking
                </h3>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pet Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pet & Breed Verification
                </span>
                <div className="flex items-center gap-3">
                  <img
                    src={getPetPhoto(inspectingOrder)}
                    alt="Pet"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {inspectingOrder.breed?.name} ({inspectingOrder.category?.name})
                    </h4>
                    {inspectingOrder.pet ? (
                      <p className="text-slate-600 font-mono text-xs mt-0.5">
                        Pet ID: <strong>{inspectingOrder.pet.petId}</strong> | Microchip:{' '}
                        <strong>{inspectingOrder.pet.microchipNumber || 'Pending'}</strong>
                      </p>
                    ) : (
                      <p className="text-amber-700 font-semibold text-xs mt-0.5">
                        Specific pet has not been linked to this booking order yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer & Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Information
                  </span>
                  <div className="font-extrabold text-slate-900 text-sm">{inspectingOrder.customerName}</div>
                  <div className="text-slate-600 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{inspectingOrder.customerContact}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Delivery Destination
                  </span>
                  <div className="text-slate-700 font-medium leading-relaxed">
                    {inspectingOrder.deliveryAddress}
                  </div>
                </div>
              </div>

              {/* Commercials & Security Notice */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950">Commercial Terms:</span>
                  <span className="font-bold text-indigo-900">{inspectingOrder.paymentMode}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Advance Received:</span>
                  <span className="font-bold text-emerald-700">₹{inspectingOrder.advancePaid?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-indigo-100/60">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Sensitive Breeder Wholesale Margin
                  </span>
                  <span className="font-mono text-rose-700 font-bold bg-white px-2 py-0.5 rounded border border-rose-200">
                    PROTECTED (Server Redacted)
                  </span>
                </div>
              </div>

              {/* Public Verification Links */}
              {inspectingOrder.pet?.petId && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800">Customer Digital Certificate</span>
                  </div>
                  <Link
                    href={`/pets/${inspectingOrder.pet.petId}`}
                    target="_blank"
                    className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    Open Live Certificate <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setInspectingOrder(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Booking Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create Customer Booking</h3>
                <p className="text-xs text-slate-400">
                  Book a pet directly for an incoming customer enquiry or reservation.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-3.5 text-xs">
              {/* Category & Breed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={createCatId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Breed *
                  </label>
                  <select
                    value={createBreedId}
                    onChange={(e) => {
                      setCreateBreedId(e.target.value);
                      setCreateSelectedPetId('');
                    }}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    {activeBreeds.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional: Link Available Pet */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select Pet from Available Stock (Optional)
                </label>
                <select
                  value={createSelectedPetId}
                  onChange={(e) => setCreateSelectedPetId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Reserve Breed (Assign Specific Pet Later) --</option>
                  {petsForSelectedBreed.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.petId} - {p.breed?.name} ({p.sex}, {p.colour}) [Chip: {p.microchipNumber || 'Pending'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    value={createCustomerName}
                    onChange={(e) => setCreateCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Customer Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={createCustomerContact}
                    onChange={(e) => setCreateCustomerContact(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Customer Delivery Destination Address *
                </label>
                <textarea
                  value={createDeliveryAddress}
                  onChange={(e) => setCreateDeliveryAddress(e.target.value)}
                  placeholder="Street, Landmark, City, State, Pincode"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              {/* Package & Advance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={createPaymentMode}
                    onChange={(e) => setCreatePaymentMode(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ADVANCE_COD">Advance Token + Balance on Handover</option>
                    <option value="FULL_PREPAID">Full Prepaid Online</option>
                    <option value="COD">Full Cash on Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Advance Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={createAdvancePaid}
                    onChange={(e) => setCreateAdvancePaid(e.target.value)}
                    placeholder="15000"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Package Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Product / Package Title
                </label>
                <input
                  type="text"
                  value={createPackage}
                  onChange={(e) => setCreatePackage(e.target.value)}
                  placeholder="e.g. Purebred Bengal Cat + Full Health Clearance Package"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-soft flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Submitting Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Customer Booking</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Loading Customer Orders & Bookings...
        </div>
      }
    >
      <SalesOrdersContent />
    </Suspense>
  );
}
