'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Truck,
  Store,
  X,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Plus,
  Search,
  Filter,
  RefreshCw,
  PackageCheck,
  User,
  Phone,
  MapPin,
  Clock,
  ArrowUpDown,
  Layers,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  Info,
  QrCode,
  Stethoscope,
  AlertCircle,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import PetPicker from '@/components/PetPicker';
import VendorPicker from '@/components/VendorPicker';
import AgentPicker from '@/components/AgentPicker';
import { useBodyScrollLock } from '@/hooks/use-scroll-lock';

function OrdersContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const vendorParam = searchParams.get('vendor') || '';
  const agentParam = searchParams.get('agent') || '';

  const { currentUser, switchToRoleName } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(queryParam || agentParam);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState(vendorParam || 'ALL');

  // Infinite Scroll Loading State
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Assign Vendor Modal
  const [assigningVendorOrder, setAssigningVendorOrder] = useState<any | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('usr_vendor_1');
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);

  // Assign Agent Modal
  const [assigningAgentOrder, setAssigningAgentOrder] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('usr_agent_1');
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

  // Allocate Pet Modal (Direct End-to-End Link)
  const [allocatingOrder, setAllocatingOrder] = useState<any | null>(null);
  const [availablePetsForAllocation, setAvailablePetsForAllocation] = useState<any[]>([]);
  const [selectedPetToAllocate, setSelectedPetToAllocate] = useState('');
  const [loadingAvailablePets, setLoadingAvailablePets] = useState(false);
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);
  const [allocateError, setAllocateError] = useState('');

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCatId, setCreateCatId] = useState('');
  const [createBreedId, setCreateBreedId] = useState('');
  const [availableBreeds, setAvailableBreeds] = useState<any[]>([]);
  const [createAvailablePets, setCreateAvailablePets] = useState<any[]>([]);
  const [createSelectedPetId, setCreateSelectedPetId] = useState('');
  const [createCustomerName, setCreateCustomerName] = useState('');
  const [createCustomerContact, setCreateCustomerContact] = useState('');
  const [createDeliveryAddress, setCreateDeliveryAddress] = useState('');
  const [createPackage, setCreatePackage] = useState('Standard Pet Delivery Package');
  const [createPaymentStatus, setCreatePaymentStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Lock background scrolling whenever any modal popup is open
  useBodyScrollLock(Boolean(allocatingOrder || isCreateModalOpen || assigningVendorOrder || assigningAgentOrder));

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, catRes, agentsRes, vendorsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/categories'),
        fetch('/api/users?role=DELIVERY_AGENT'),
        fetch('/api/users?role=VENDOR'),
      ]);

      const ordersData = await ordersRes.json();
      const catData = await catRes.json();
      const agentsData = await agentsRes.json();
      const vendorsData = await vendorsRes.json();

      if (ordersData.success) {
        setOrders(ordersData.data);
      }

      if (agentsData.success && agentsData.data) {
        setAvailableAgents(agentsData.data);
        if (agentsData.data.length > 0) {
          setSelectedAgentId(agentsData.data[0].id);
        }
      }

      if (vendorsData.success && vendorsData.data) {
        setAvailableVendors(vendorsData.data);
        if (vendorsData.data.length > 0) {
          setSelectedVendorId(vendorsData.data[0].id);
        }
      }

      if (catData.success && catData.data) {
        setCategories(catData.data);
        if (catData.data.length > 0 && !createCatId) {
          const firstCat = catData.data[0];
          setCreateCatId(firstCat.id);
          const activeB = firstCat.breeds?.filter((b: any) => b.active) || [];
          setAvailableBreeds(activeB);
          if (activeB.length > 0) {
            setCreateBreedId(activeB[0].id);
            fetchAvailablePetsForCreate(activeB[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh orders every 10 seconds so delivery agent updates show live in real-time
    const timer = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Update filters if URL parameters change
  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
    if (agentParam) setSearchQuery(agentParam);
    if (vendorParam) setVendorFilter(vendorParam);
  }, [queryParam, agentParam, vendorParam]);

  const fetchAvailablePetsForCreate = async (breedId: string) => {
    if (!breedId) {
      setCreateAvailablePets([]);
      setCreateSelectedPetId('');
      return;
    }
    try {
      const res = await fetch(`/api/pets?breedId=${breedId}&status=AVAILABLE`);
      const data = await res.json();
      if (data.success) {
        setCreateAvailablePets(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategorySelectChange = (catId: string) => {
    setCreateCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    const activeB = cat?.breeds?.filter((b: any) => b.active) || [];
    setAvailableBreeds(activeB);
    if (activeB.length > 0) {
      setCreateBreedId(activeB[0].id);
      fetchAvailablePetsForCreate(activeB[0].id);
    } else {
      setCreateBreedId('');
      setCreateAvailablePets([]);
      setCreateSelectedPetId('');
    }
  };

  const handleBreedSelectChange = (breedId: string) => {
    setCreateBreedId(breedId);
    setCreateSelectedPetId('');
    fetchAvailablePetsForCreate(breedId);
  };

  const openCreateModal = () => {
    if (categories.length > 0) {
      const firstCat = categories[0];
      setCreateCatId(firstCat.id);
      const activeB = firstCat.breeds?.filter((b: any) => b.active) || [];
      setAvailableBreeds(activeB);
      if (activeB.length > 0) {
        setCreateBreedId(activeB[0].id);
        fetchAvailablePetsForCreate(activeB[0].id);
      } else {
        setCreateBreedId('');
        setCreateAvailablePets([]);
      }
    }
    setCreateSelectedPetId('');
    setCreateCustomerName('Ananya Sharma');
    setCreateCustomerContact('+91 9876543216');
    setCreateDeliveryAddress('Flat 402, Sunshine Heights, Indiranagar, Bangalore');
    setCreatePackage('Furora Certified Kennel Delivery Package');
    setCreatePaymentStatus('PAID');
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCatId || !createBreedId || !createCustomerName || !createCustomerContact || !createDeliveryAddress) {
      setCreateError('Please fill in all mandatory fields.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload: any = {
        categoryId: createCatId,
        breedId: createBreedId,
        customerName: createCustomerName,
        customerContact: createCustomerContact,
        deliveryAddress: createDeliveryAddress,
        productOrPackage: createPackage,
        paymentStatus: createPaymentStatus,
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
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openAllocateModal = async (order: any) => {
    setAllocatingOrder(order);
    setSelectedPetToAllocate('');
    setAllocateError('');
    setLoadingAvailablePets(true);

    try {
      const res = await fetch(`/api/pets?breedId=${order.breedId}&status=AVAILABLE`);
      const data = await res.json();
      if (data.success) {
        setAvailablePetsForAllocation(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedPetToAllocate(data.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setAllocateError('Failed to load available pets for this breed.');
    } finally {
      setLoadingAvailablePets(false);
    }
  };

  const handleAllocatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingOrder || !selectedPetToAllocate) return;

    setAllocateSubmitting(true);
    setAllocateError('');

    try {
      const res = await fetch(`/api/orders/${allocatingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: selectedPetToAllocate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate pet to order');

      setAllocatingOrder(null);
      await loadData();
    } catch (err: any) {
      setAllocateError(err.message);
    } finally {
      setAllocateSubmitting(false);
    }
  };

  const handleAssignVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningVendorOrder) return;

    try {
      const res = await fetch(`/api/orders/${assigningVendorOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssigningVendorOrder(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAgentOrder) return;

    try {
      const res = await fetch(`/api/orders/${assigningAgentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssigningAgentOrder(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config: Record<string, { dot: string; text: string; bg: string; label?: string }> = {
      DELIVERY_COMPLETED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      INSPECTION_PASSED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      MEDICAL_APPROVED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      CANCELLED_REFUNDED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
      INSPECTION_FAILED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
      MEDICAL_FAILED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
      VENDOR_REJECTED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
      ORDER_RECEIVED: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      PICKUP_ASSIGNED: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      PICKUP_INSPECTION: { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
      PICKUP_ACCEPTED: { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
      PICKUP_INSPECTION_PENDING: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      MEDICAL_PENDING: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      MEDICAL_CHECK: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      CHANGES_REQUESTED: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      PET_ASSIGNED: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      IN_TRANSIT: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      READY_FOR_DELIVERY: { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
      VENDOR_ASSIGNED: { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
      VENDOR_ACCEPTED: { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    };

    const cfg = config[status] || { dot: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-xs ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${cfg.dot}`}></span>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (vendorFilter === 'UNASSIGNED' && o.vendorId) return false;
      if (vendorFilter !== 'ALL' && vendorFilter !== 'UNASSIGNED' && o.vendorId !== vendorFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = o.orderId?.toLowerCase().includes(q);
        const matchCustomer = o.customerName?.toLowerCase().includes(q) || o.customerContact?.includes(q);
        const matchBreed = o.breed?.name?.toLowerCase().includes(q);
        const matchCategory = o.category?.name?.toLowerCase().includes(q);
        const matchVendor = o.vendor?.name?.toLowerCase().includes(q) || o.vendorId?.toLowerCase().includes(q);
        const matchPet = o.pet?.petId?.toLowerCase().includes(q);
        const matchAgent = o.agent?.name?.toLowerCase().includes(q) || o.agentId?.toLowerCase().includes(q);
        return matchId || matchCustomer || matchBreed || matchCategory || matchVendor || matchPet || matchAgent;
      }

      return true;
    });
  }, [orders, statusFilter, vendorFilter, searchQuery]);

  // Reset visibleCount on filter or search changes
  useEffect(() => {
    setVisibleCount(25);
  }, [statusFilter, vendorFilter, searchQuery]);

  // Slice orders for infinite scrolling
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  // IntersectionObserver for Infinite Load
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && visibleCount < filteredOrders.length && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 25, filteredOrders.length));
            setIsLoadingMore(false);
          }, 200);
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredOrders.length, isLoadingMore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Admin Only Access</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current persona is <strong>{currentUser.name}</strong> ({currentUser.role}).
            Only Administrators can assign vendor kennels and dispatch ops agents.
          </p>
        </div>
        <button
          onClick={() => switchToRoleName('ADMIN')}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-soft"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Switch to Furora Admin
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Orders & Dispatch
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              {orders.length} Total Orders
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Dispatch orders, allocate inventory pets, and assign ops agents for pickup & delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Create Order
          </button>
        </div>
      </div>

      {/* Clean Filter Toolbar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Order ID, customer, breed, vendor, or pet ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="ORDER_RECEIVED">ORDER RECEIVED</option>
              <option value="VENDOR_ASSIGNED">VENDOR ASSIGNED</option>
              <option value="VENDOR_ACCEPTED">VENDOR ACCEPTED</option>
              <option value="VENDOR_REJECTED">VENDOR REJECTED</option>
              <option value="PET_ASSIGNED">PET ASSIGNED</option>
              <option value="PICKUP_ASSIGNED">PICKUP ASSIGNED</option>
              <option value="PICKUP_INSPECTION">PICKUP INSPECTION (AT KENNEL)</option>
              <option value="PICKUP_INSPECTION_PENDING">PICKUP INSPECTION PENDING</option>
              <option value="INSPECTION_PASSED">INSPECTION PASSED</option>
              <option value="INSPECTION_FAILED">INSPECTION FAILED</option>
              <option value="MEDICAL_CHECK">MEDICAL CHECK (AT CLINIC)</option>
              <option value="MEDICAL_PENDING">MEDICAL PENDING</option>
              <option value="MEDICAL_APPROVED">MEDICAL APPROVED</option>
              <option value="MEDICAL_FAILED">MEDICAL FAILED</option>
              <option value="READY_FOR_DELIVERY">READY FOR DELIVERY</option>
              <option value="DELIVERY_COMPLETED">DELIVERY COMPLETED</option>
              <option value="CANCELLED_REFUNDED">CANCELLED REFUNDED</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor:</span>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Vendors</option>
              <option value="usr_vendor_1">Pet World Breeders (Pune)</option>
              <option value="usr_vendor_2">Furry Friends Kennel (Bangalore)</option>
              <option value="UNASSIGNED">Unassigned Only</option>
            </select>
          </div>

          {(statusFilter !== 'ALL' || vendorFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setVendorFilter('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline px-1"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Count indicator with Infinite Scroll status */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span>
            Loaded <strong className="text-slate-800">{Math.min(visibleCount, filteredOrders.length)}</strong> of <strong className="text-slate-800">{filteredOrders.length}</strong> orders
          </span>
          {visibleCount < filteredOrders.length && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
              Infinite Scroll Active
            </span>
          )}
        </div>
      </div>

      {/* Spacious, Beautifully Aligned Orders Table */}
      <div className="card-clean overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4 whitespace-nowrap w-[130px]">Order ID</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Customer</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Requested Breed</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Assigned Vendor</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Linked Pet (Inventory)</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Ops Agent</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[150px] text-center">Document Journey</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[140px] text-center">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right min-w-[210px]">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150 h-[56px]"
                  >
                    {/* Order ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 tracking-tight text-xs bg-slate-100/70 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {o.orderId}
                      </span>
                    </td>

                    {/* Customer - Link to Customers Tab */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/customers?q=${encodeURIComponent(o.customerName)}`}
                        className="font-semibold text-slate-900 leading-tight hover:underline flex items-center gap-1 group w-fit"
                        title="View customer profile & order history in Customers tab"
                      >
                        <span>{o.customerName}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">
                        {o.customerContact}
                      </div>
                    </td>

                    {/* Requested Breed - Link to Category & Inventory */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/categories?q=${encodeURIComponent(o.breed?.name || '')}`}
                        className="font-semibold text-slate-800 leading-tight hover:underline block w-fit"
                        title="View breed details in Category & Pet Inventory"
                      >
                        {o.breed?.name || '—'}
                      </Link>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {o.category?.name}
                      </div>
                    </td>

                    {/* Assigned Vendor - Link to Vendors Tab */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {o.vendor ? (
                        <Link
                          href={`/admin/vendors?q=${encodeURIComponent(o.vendor.name)}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs transition group"
                          title="View vendor kennel details in Vendors tab"
                        >
                          <Store className="w-3 h-3 mr-1 text-slate-500 group-hover:text-slate-800 flex-shrink-0" />
                          <span>{o.vendor.name}</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Linked Pet - Seamless Clickable Bridge to Inventory */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {o.pet ? (
                        <Link
                          href={`/admin/categories?q=${o.pet.petId}`}
                          className="font-mono font-bold text-slate-900 hover:text-slate-700 text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-md shadow-xs inline-flex items-center gap-1.5 transition group"
                          title="Click to view full pet profile in Inventory"
                        >
                          <Layers className="w-3 h-3 text-slate-500 group-hover:scale-110 transition-transform" />
                          <span>{o.pet.petId}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          Not Allocated
                        </span>
                      )}
                    </td>

                    {/* Ops Agent - Link to Staff & Accounts */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {o.agent ? (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(o.agent.name)}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs transition group"
                          title="View delivery agent credentials in Staff & Accounts"
                        >
                          <Truck className="w-3 h-3 mr-1 text-slate-500 group-hover:text-slate-800 flex-shrink-0" />
                          <span>{o.agent.name}</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Document Journey (3 Physical Locations) */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold">
                        {/* 1. Kennel Origin Docs */}
                        <span
                          title={o.petId || o.documents?.some((d: any) => d.type?.startsWith('KENNEL')) ? 'Breeder Kennel Origin Docs' : 'Kennel Docs Pending'}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] ${
                            (o.petId && o.status !== 'ORDER_RECEIVED') || o.documents?.some((d: any) => d.type?.startsWith('KENNEL'))
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span>🏠</span>
                          <span>Kennel</span>
                        </span>

                        {/* 2. Vet Medical Clearance */}
                        <span
                          title={o.medicalRecords?.some((m: any) => m.result === 'APPROVED') || ['MEDICAL_APPROVED', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(o.status) ? 'Vet Medical Clearance Approved' : 'Vet Check Pending'}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] ${
                            o.medicalRecords?.some((m: any) => m.result === 'APPROVED') || ['MEDICAL_APPROVED', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(o.status)
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span>🏥</span>
                          <span>Vet</span>
                        </span>

                        {/* 3. Doorstep POD Handover */}
                        <span
                          title={o.deliveryRecord || o.status === 'DELIVERY_COMPLETED' ? 'Customer Handover POD Verified' : 'Delivery Handover Pending'}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] ${
                            o.deliveryRecord || o.status === 'DELIVERY_COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span>📸</span>
                          <span>POD</span>
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {getOrderStatusBadge(o.status)}
                    </td>

                    {/* Dispatch Action - State-Aware Clean Buttons */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {/* 1. ORDER_RECEIVED: Sourcing Choice */}
                        {o.status === 'ORDER_RECEIVED' && !o.petId && (
                          <>
                            <button
                              onClick={() => setAssigningVendorOrder(o)}
                              className="inline-flex items-center text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-xs"
                              title="Assign order to an approved Breeder Kennel partner"
                            >
                              <Store className="w-3 h-3 mr-1 text-slate-500" /> Assign Kennel
                            </button>
                            <button
                              onClick={() => openAllocateModal(o)}
                              className="inline-flex items-center text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95 shadow-xs"
                              title="Directly allocate an in-stock puppy from Inventory"
                            >
                              <Layers className="w-3 h-3 mr-1" /> Allocate In-Stock
                            </button>
                          </>
                        )}

                        {/* 2. VENDOR_ASSIGNED: Awaiting Kennel Confirmation */}
                        {o.status === 'VENDOR_ASSIGNED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
                            Awaiting Kennel
                          </span>
                        )}

                        {/* 3. VENDOR_REJECTED: Reassign Kennel */}
                        {o.status === 'VENDOR_REJECTED' && (
                          <button
                            onClick={() => setAssigningVendorOrder(o)}
                            className="inline-flex items-center text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 transition shadow-xs"
                          >
                            <Store className="w-3 h-3 mr-1" /> Reassign Kennel
                          </button>
                        )}

                        {/* 4. PET_ASSIGNED / VENDOR_ACCEPTED: Assign Ops Delivery Agent */}
                        {((o.status === 'PET_ASSIGNED' || o.status === 'VENDOR_ACCEPTED') && !o.agentId) && (
                          <button
                            onClick={() => setAssigningAgentOrder(o)}
                            className="inline-flex items-center text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition active:scale-95 shadow-xs"
                          >
                            <Truck className="w-3 h-3 mr-1.5" /> Assign Agent
                          </button>
                        )}

                        {/* 5. In-Transit Stages & Live Tracking Links */}
                        {o.status === 'PET_ASSIGNED' && o.agentId && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition shadow-2xs group"
                            title="Live Tracking: Agent Assigned & Heading to Pickup"
                          >
                            <Truck className="w-3 h-3 mr-1 text-blue-600 animate-pulse" />
                            <span>Agent Assigned</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                          </Link>
                        )}

                        {o.status === 'PICKUP_ASSIGNED' && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition shadow-2xs group"
                            title="Live Swiggy Tracking: Dispatched for Pet Pickup"
                          >
                            <Truck className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />
                            <span>Dispatched</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                          </Link>
                        )}

                        {o.status === 'PICKUP_INSPECTION' && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition shadow-2xs group"
                            title="Live Tracking: Agent at Kennel Collecting Pet & Documents"
                          >
                            <Store className="w-3 h-3 mr-1 text-purple-600 animate-pulse" />
                            <span>At Kennel (Collecting Docs)</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                          </Link>
                        )}

                        {(o.status === 'PICKUP_ACCEPTED' || o.status === 'MEDICAL_CHECK') && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition shadow-2xs group"
                            title="Live Swiggy Tracking: At Veterinary Diagnostics Center"
                          >
                            <Stethoscope className="w-3 h-3 mr-1 text-teal-600 animate-pulse" />
                            <span>At Medical Center</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                          </Link>
                        )}

                        {(o.status === 'MEDICAL_APPROVED' || o.status === 'READY_FOR_DELIVERY') && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition shadow-2xs group"
                            title="Live Swiggy Tracking: Out for Customer Delivery"
                          >
                            <Truck className="w-3 h-3 mr-1 text-indigo-600 animate-pulse" />
                            <span>Out for Delivery</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                          </Link>
                        )}

                        {(o.status === 'INSPECTION_FAILED' || o.status === 'MEDICAL_FAILED') && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3 h-3 mr-1 text-rose-600" /> Failed Checks
                          </span>
                        )}

                        {o.status === 'CANCELLED_REFUNDED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Refunded & Closed
                          </span>
                        )}

                        {/* 6. Complete Marker - Link to Scannable Digital Record */}
                        {o.status === 'DELIVERY_COMPLETED' && (
                          <Link
                            href={`/records/${o.orderId}`}
                            target="_blank"
                            className="text-emerald-700 font-bold text-[11px] inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 transition shadow-2xs group"
                            title="Open Official Verified Customer Digital Certificate & Proof of Delivery Record"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            <span>Delivered</span>
                            <QrCode className="w-3 h-3 ml-1 text-emerald-700 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Infinite Scroll Footer Sentinel */}
        <div ref={sentinelRef} className="py-3.5 border-t border-slate-100 bg-slate-50/50 text-center select-none">
          {visibleCount < filteredOrders.length ? (
            <div className="flex items-center justify-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin inline-block"></span>
              <span className="text-xs font-semibold text-slate-500">
                Loading more orders automatically...
              </span>
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + 25, filteredOrders.length))}
                className="ml-2 px-3 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
              >
                Load next 25 ({filteredOrders.length - visibleCount} more)
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-400">
              ✓ All {filteredOrders.length} orders loaded
            </div>
          )}
        </div>
      </div>

      {/* ALLOCATE PET MODAL (End-to-End Inventory Bridge) */}
      {allocatingOrder && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setAllocatingOrder(null)}
        >
          <div 
            className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain my-auto modal-content-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Allocate In-Stock Pet to Order
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Order <span className="font-mono font-bold text-slate-800">{allocatingOrder.orderId}</span> for{' '}
                  <span className="font-semibold text-slate-800">{allocatingOrder.breed?.name}</span> ({allocatingOrder.category?.name})
                </p>
              </div>
              <button
                onClick={() => setAllocatingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {allocateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {allocateError}
              </div>
            )}

            <form onSubmit={handleAllocatePet} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5 text-purple-900 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-600" /> Permanent Order-to-Pet Allocation
                </div>
                <p className="text-[11px] text-purple-700">
                  Allocating a pet permanently locks this pet to the customer order. The pet will transition to <strong>ASSIGNED TO ORDER</strong> and the order transitions to <strong>PET ASSIGNED</strong>, making it immediately ready for ops agent inspection dispatch.
                </p>
              </div>

              {loadingAvailablePets ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin inline-block"></span>
                  Checking live inventory for {allocatingOrder.breed?.name}...
                </div>
              ) : availablePetsForAllocation.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    No pets currently marked <strong>AVAILABLE</strong> in stock for {allocatingOrder.breed?.name}.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    You can dispatch this order to a certified vendor kennel to source the pet, or add new pets in Category & Pet Inventory.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/admin/categories"
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                    >
                      <Layers className="w-3.5 h-3.5" /> Open Pet Inventory
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Available In-Stock Pet ({availablePetsForAllocation.length} available) *
                  </label>
                  <PetPicker
                    pets={availablePetsForAllocation}
                    selectedPetId={selectedPetToAllocate}
                    onSelectPet={setSelectedPetToAllocate}
                    allowNone={false}
                    breedName={allocatingOrder.breed?.name}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllocatingOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                {availablePetsForAllocation.length > 0 && (
                  <button
                    type="submit"
                    disabled={allocateSubmitting || !selectedPetToAllocate}
                    className="px-5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {allocateSubmitting ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                        Allocating Pet...
                      </>
                    ) : (
                      'Confirm Permanent Allocation'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain my-auto modal-content-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Create New Customer Order</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate official order with sequential <span className="font-mono font-bold text-slate-800">FUR-ORD-######</span>
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              {/* Category & Breed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={createCatId}
                    onChange={(e) => handleCategorySelectChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
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
                    Breed *
                  </label>
                  <select
                    value={createBreedId}
                    onChange={(e) => handleBreedSelectChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    {availableBreeds.length === 0 ? (
                      <option value="">No active breeds available</option>
                    ) : (
                      availableBreeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* End-to-End Direct Pet Allocation Option */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Direct In-Stock Pet Allocation (Optional)
                </label>
                <PetPicker
                  pets={createAvailablePets}
                  selectedPetId={createSelectedPetId}
                  onSelectPet={setCreateSelectedPetId}
                  allowNone={true}
                  noneLabel="No pet linked yet (Assign vendor or allocate later)"
                  noneSubtext="Create order without pet; dispatch to certified vendor kennel or allocate from stock later."
                  breedName={availableBreeds.find((b) => b.id === createBreedId)?.name}
                />
              </div>

              {/* Package & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Service Package
                  </label>
                  <select
                    value={createPackage}
                    onChange={(e) => setCreatePackage(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Standard Pet Delivery Package">Standard Pet Delivery Package</option>
                    <option value="Furora Certified Kennel Delivery Package">Furora Certified Kennel Delivery Package</option>
                    <option value="VIP Health Guaranteed Express Relocation">VIP Health Guaranteed Express Relocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={createPaymentStatus}
                    onChange={(e) => setCreatePaymentStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="PAID">PAID (Pre-authorized / Instant)</option>
                    <option value="PENDING">PENDING (Pay on Delivery / Wire)</option>
                  </select>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      value={createCustomerName}
                      onChange={(e) => setCreateCustomerName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      required
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Contact Phone *
                    </label>
                    <input
                      type="text"
                      value={createCustomerContact}
                      onChange={(e) => setCreateCustomerContact(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      required
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Delivery Address *
                  </label>
                  <textarea
                    value={createDeliveryAddress}
                    onChange={(e) => setCreateDeliveryAddress(e.target.value)}
                    placeholder="Full residential address for final delivery and inspection report..."
                    rows={2}
                    required
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                      Creating Order...
                    </>
                  ) : (
                    'Confirm & Create Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Vendor Modal */}
      {assigningVendorOrder && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setAssigningVendorOrder(null)}
        >
          <div 
            className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain my-auto modal-content-scroll animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Dispatch Order to Vendor Kennel</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Order <span className="font-mono font-bold text-slate-800">{assigningVendorOrder.orderId}</span> for{' '}
                  <span className="font-semibold text-slate-800">{assigningVendorOrder.breed?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setAssigningVendorOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignVendor} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Certified Vendor Kennel
                </label>
                <VendorPicker
                  vendors={availableVendors}
                  selectedVendorId={selectedVendorId}
                  onSelectVendor={(id) => setSelectedVendorId(id)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningVendorOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Dispatch to Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {assigningAgentOrder && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setAssigningAgentOrder(null)}
        >
          <div 
            className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain my-auto modal-content-scroll animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Assign Delivery Agent</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Field pickup and inspection for order <span className="font-mono font-bold text-slate-800">{assigningAgentOrder.orderId}</span>
                </p>
              </div>
              <button
                onClick={() => setAssigningAgentOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignAgent} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Delivery / Field Agent
                </label>
                <AgentPicker
                  agents={availableAgents}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={(id) => setSelectedAgentId(id)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningAgentOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Assign & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
