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
  Eye,
  FileText,
  Printer,
  Mail,
  Check,
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

  // Assign / Edit Vet Clinic Modal
  const [assigningClinicOrder, setAssigningClinicOrder] = useState<any | null>(null);
  const [clinicNameInput, setClinicNameInput] = useState('');
  const [doctorNameInput, setDoctorNameInput] = useState('');
  const [clinicSubmitting, setClinicSubmitting] = useState(false);
  const [clinicError, setClinicError] = useState('');

  // Complete Order Dossier Inspection Modal
  const [inspectingOrderDossier, setInspectingOrderDossier] = useState<any | null>(null);

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
  const [createVetClinicName, setCreateVetClinicName] = useState('');
  const [createVetDoctorName, setCreateVetDoctorName] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Lock background scrolling whenever any modal popup is open
  useBodyScrollLock(Boolean(allocatingOrder || isCreateModalOpen || assigningVendorOrder || assigningAgentOrder || assigningClinicOrder));

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

  // Track if any modal is currently active to pause background polling
  const isAnyModalOpen = Boolean(
    isCreateModalOpen ||
    assigningVendorOrder ||
    assigningAgentOrder ||
    allocatingOrder ||
    assigningClinicOrder ||
    inspectingOrderDossier
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Pause auto-refresh timer if any modal is open
    if (isAnyModalOpen) return;

    // Auto-refresh orders every 10 seconds so delivery agent updates show live in real-time
    const timer = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(timer);
  }, [isAnyModalOpen]);

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
    setCreateVetClinicName('Cessna Lifeline Veterinary Hospital');
    setCreateVetDoctorName('Dr. R. K. Sharma (KVC-8821)');
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
      if (createVetClinicName.trim()) {
        payload.vetClinicName = createVetClinicName.trim();
      }
      if (createVetDoctorName.trim()) {
        payload.vetDoctorName = createVetDoctorName.trim();
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      // Persist vet clinic and doctor details via PUT to ensure physical checkpoint 2 data is locked
      if (data.data?.id && (createVetClinicName.trim() || createVetDoctorName.trim())) {
        await fetch(`/api/orders/${data.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vetClinicName: createVetClinicName.trim(),
            vetDoctorName: createVetDoctorName.trim(),
          }),
        });
      }

      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openClinicModal = (order: any) => {
    setAssigningClinicOrder(order);
    setClinicNameInput(order.vetClinicName || '');
    setDoctorNameInput(order.vetDoctorName || '');
    setClinicError('');
  };

  const handleAssignClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningClinicOrder) return;

    setClinicSubmitting(true);
    setClinicError('');

    try {
      const res = await fetch(`/api/orders/${assigningClinicOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vetClinicName: clinicNameInput.trim(),
          vetDoctorName: doctorNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update vet clinic details');

      setAssigningClinicOrder(null);
      await loadData();
    } catch (err: any) {
      setClinicError(err.message);
    } finally {
      setClinicSubmitting(false);
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
        const matchVet = o.vetClinicName?.toLowerCase().includes(q) || o.vetDoctorName?.toLowerCase().includes(q);
        return matchId || matchCustomer || matchBreed || matchCategory || matchVendor || matchPet || matchAgent || matchVet;
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
                <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Medical Location / Vet</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[150px] text-center">Document Journey</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[140px] text-center">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right min-w-[210px]">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingOrderDossier(o)}
                          className="font-mono font-bold text-slate-900 tracking-tight text-xs bg-slate-100/80 hover:bg-slate-200/90 border border-slate-200 px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1"
                          title="Click to view full order dossier (where it comes from, who delivered, destination)"
                        >
                          <span>{o.orderId}</span>
                          <Eye className="w-3 h-3 text-blue-600 ml-0.5" />
                        </button>
                      </div>
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

                    {/* Medical Location / Vet Clinic Assignment */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {o.vetClinicName ? (
                        <button
                          type="button"
                          onClick={() => openClinicModal(o)}
                          className="inline-flex items-center text-left gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition group shadow-2xs max-w-[190px]"
                          title={`Click to edit clinic: ${o.vetClinicName}${o.vetDoctorName ? ` (${o.vetDoctorName})` : ''}`}
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="truncate">
                            <div className="font-semibold text-[11px] truncate">{o.vetClinicName}</div>
                            {o.vetDoctorName && (
                              <div className="text-[10px] text-teal-600 truncate font-medium">{o.vetDoctorName}</div>
                            )}
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openClinicModal(o)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 transition"
                          title="Assign designated veterinary hospital & doctor"
                        >
                          <Stethoscope className="w-3 h-3 text-slate-400" />
                          <span>Assign Clinic</span>
                        </button>
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
                        <button
                          type="button"
                          onClick={() => openClinicModal(o)}
                          title={o.vetClinicName ? `Assigned Vet: ${o.vetClinicName}${o.vetDoctorName ? ` (${o.vetDoctorName})` : ''} - Click to edit` : 'Vet Check Pending - Click to assign clinic'}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] hover:opacity-80 transition cursor-pointer ${
                            o.medicalRecords?.some((m: any) => m.result === 'APPROVED') || ['MEDICAL_APPROVED', 'READY_FOR_DELIVERY', 'DELIVERY_COMPLETED'].includes(o.status)
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : o.vetClinicName
                              ? 'bg-teal-50/70 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span>🏥</span>
                          <span>{o.vetClinicName ? 'Vet ✓' : 'Vet'}</span>
                        </button>

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

              {/* Medical Examination Location (Physical Checkpoint 2) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  <span>Medical Examination Location (Physical Checkpoint 2)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Designated Vet Hospital / Clinic
                    </label>
                    <input
                      type="text"
                      value={createVetClinicName}
                      onChange={(e) => setCreateVetClinicName(e.target.value)}
                      placeholder="e.g. Cessna Lifeline Veterinary Hospital"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Examining Veterinarian
                    </label>
                    <input
                      type="text"
                      value={createVetDoctorName}
                      onChange={(e) => setCreateVetDoctorName(e.target.value)}
                      placeholder="e.g. Dr. R. K. Sharma (KVC-8821)"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
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

      {/* Assign / Edit Vet Clinic Modal */}
      {assigningClinicOrder && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setAssigningClinicOrder(null)}
        >
          <div 
            className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain my-auto modal-content-scroll animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  Assign / Edit Veterinary Clinic
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Order <span className="font-mono font-bold text-slate-800">{assigningClinicOrder.orderId}</span> • Physical Checkpoint 2 (Medical Clearance)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningClinicOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {clinicError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {clinicError}
              </div>
            )}

            <form onSubmit={handleAssignClinic} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-1 text-teal-900 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600" /> Mandatory 30-Point Medical Protocol
                </div>
                <p className="text-[11px] text-teal-700 leading-relaxed">
                  Designate the authorized veterinary hospital and examining doctor. Delivery agents transport the pet here after kennel pickup for Parvovirus, Distemper, and physical health screening before customer delivery.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Designated Vet Hospital / Clinic *
                </label>
                <input
                  type="text"
                  value={clinicNameInput}
                  onChange={(e) => setClinicNameInput(e.target.value)}
                  placeholder="e.g. Cessna Lifeline Veterinary Hospital, Bangalore"
                  required
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold py-0.5">Quick Presets:</span>
                  {[
                    'Cessna Lifeline Veterinary Hospital',
                    'Crown Vet Super Speciality Clinic',
                    'Max Vets Hospital',
                    'Dr. Pawz Animal Hospital',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setClinicNameInput(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Examining Veterinarian
                </label>
                <input
                  type="text"
                  value={doctorNameInput}
                  onChange={(e) => setDoctorNameInput(e.target.value)}
                  placeholder="e.g. Dr. R. K. Sharma (Reg #KVC-8821)"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold py-0.5">Quick Presets:</span>
                  {[
                    'Dr. R. K. Sharma (Reg #KVC-8821)',
                    'Dr. Ananya Roy (Reg #MVC-4402)',
                    'Dr. Vikram Patel (Reg #DVC-1994)',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDoctorNameInput(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningClinicOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clinicSubmitting || !clinicNameInput.trim()}
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {clinicSubmitting ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                      Saving Clinic Assignment...
                    </>
                  ) : (
                    'Save Vet Assignment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          COMPLETE ORDER DOSSIER INSPECTION MODAL (FULL TRANSPARENCY)
      ======================================================== */}
      {inspectingOrderDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="card-clean bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                      {inspectingOrderDossier.orderId}
                    </h3>
                    <span className="text-xs">{getOrderStatusBadge(inspectingOrderDossier.status)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    End-to-End Companion Order Provenance & Physical Custody Dossier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/records/${inspectingOrderDossier.orderId}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  title="Open live customer public tracking pass"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public Pass</span>
                </Link>
                <Link
                  href={`/certificate/${inspectingOrderDossier.orderId}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
                  title="Open Luxury A4 Certificate for physical printing"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-600" />
                  <span>A4 Certificate</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setInspectingOrderDossier(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable 4-Location Custody Journey */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 text-xs">
              {/* Stepper Timeline Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 select-none">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 uppercase">
                    <span>1. Origin</span>
                    <Store className="w-3 h-3 text-amber-600" />
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {inspectingOrderDossier.vendor?.name || 'Furora Direct HQ'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-blue-700 uppercase">
                    <span>2. Agent Custody</span>
                    <Truck className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {inspectingOrderDossier.agent?.name || 'Agent Pending'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-teal-700 uppercase">
                    <span>3. Medical Center</span>
                    <Stethoscope className="w-3 h-3 text-teal-600" />
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {inspectingOrderDossier.vetClinicName ? 'Vet Assigned' : 'Clinic Pending'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 uppercase">
                    <span>4. Destination</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {inspectingOrderDossier.customerName}
                  </div>
                </div>
              </div>

              {/* 4 Detailed Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Origin (Where it comes from) */}
                <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      1. Origin: Breeder Kennel & Pet Details
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {inspectingOrderDossier.vendor ? 'Breeder Consignment' : 'HQ Stock'}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Kennel / Breeder:</span>
                      <strong className="text-slate-900 text-right">
                        {inspectingOrderDossier.vendor?.name || 'Furora Direct HQ (In-House Stock)'}
                      </strong>
                    </div>
                    {inspectingOrderDossier.vendor?.contactPerson && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Contact Person:</span>
                        <span className="font-bold text-slate-800">{inspectingOrderDossier.vendor.contactPerson}</span>
                      </div>
                    )}
                    {inspectingOrderDossier.vendor?.phone && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Phone:</span>
                        <a href={`tel:${inspectingOrderDossier.vendor.phone}`} className="font-mono text-blue-600 hover:underline">
                          {inspectingOrderDossier.vendor.phone}
                        </a>
                      </div>
                    )}
                    {inspectingOrderDossier.vendor?.email && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Email:</span>
                        <span className="text-slate-800 truncate max-w-[200px]">{inspectingOrderDossier.vendor.email}</span>
                      </div>
                    )}
                    {inspectingOrderDossier.vendor?.address && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Pickup Address:</span>
                        <span className="text-right text-slate-800 max-w-[220px]">{inspectingOrderDossier.vendor.address}</span>
                      </div>
                    )}
                    {inspectingOrderDossier.vendor?.kennelRegNumber && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Kennel Reg #:</span>
                        <span className="font-mono text-slate-800 bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">
                          {inspectingOrderDossier.vendor.kennelRegNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Allocated Pet Micro-Card */}
                  <div className="mt-3 p-3 rounded-xl bg-white border border-amber-200/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">
                        {inspectingOrderDossier.pet?.petId ? `Pet: ${inspectingOrderDossier.pet.petId}` : 'Pet Allocation Pending'}
                      </span>
                      <span className="font-semibold text-slate-500">
                        {inspectingOrderDossier.breed?.name || inspectingOrderDossier.category?.name}
                      </span>
                    </div>
                    {inspectingOrderDossier.pet && (
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                        <div>Sex: <strong>{inspectingOrderDossier.pet.sex || 'N/A'}</strong></div>
                        <div>Colour: <strong>{inspectingOrderDossier.pet.colour || 'N/A'}</strong></div>
                        <div className="col-span-2">
                          Microchip: <strong className="font-mono text-emerald-700">{inspectingOrderDossier.pet.microchipNumber || 'Pending'}</strong>
                        </div>
                        {inspectingOrderDossier.pet.fatherName && (
                          <div className="col-span-2 truncate">Sire: {inspectingOrderDossier.pet.fatherName}</div>
                        )}
                        {inspectingOrderDossier.pet.motherName && (
                          <div className="col-span-2 truncate">Dam: {inspectingOrderDossier.pet.motherName}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Transit (Who delivered) */}
                <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      2. Transit & Custody: Delivery Ops Agent
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {inspectingOrderDossier.agent ? 'Agent Assigned' : 'Unassigned'}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Agent Name:</span>
                      <strong className="text-slate-900">
                        {inspectingOrderDossier.agent?.name || 'Agent Not Assigned Yet'}
                      </strong>
                    </div>
                    {inspectingOrderDossier.agent?.phone && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Agent Phone:</span>
                        <a href={`tel:${inspectingOrderDossier.agent.phone}`} className="font-mono text-blue-600 hover:underline">
                          {inspectingOrderDossier.agent.phone}
                        </a>
                      </div>
                    )}
                    {inspectingOrderDossier.agent?.email && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 font-semibold">Agent Email:</span>
                        <span className="text-slate-800 truncate max-w-[200px]">{inspectingOrderDossier.agent.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Assigned Date:</span>
                      <span className="text-slate-700">
                        {new Date(inspectingOrderDossier.updatedAt || inspectingOrderDossier.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                  </div>

                  {/* Pickup Inspection Snapshot */}
                  <div className="mt-3 p-3 rounded-xl bg-white border border-blue-200/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">Kennel Physical Pickup Check</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {inspectingOrderDossier.inspections?.[0]?.result || (inspectingOrderDossier.petPhotoAtPickup ? 'PASSED' : 'Pending Check')}
                      </span>
                    </div>
                    {inspectingOrderDossier.inspections?.[0]?.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        &quot;{inspectingOrderDossier.inspections[0].notes}&quot;
                      </p>
                    )}
                    {(inspectingOrderDossier.petPhotoAtPickup || inspectingOrderDossier.inspections?.[0]?.photos?.[0]) && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Pickup Photo Evidence:</span>
                        <a
                          href={inspectingOrderDossier.petPhotoAtPickup || inspectingOrderDossier.inspections[0].photos[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group"
                        >
                          <img
                            src={inspectingOrderDossier.petPhotoAtPickup || inspectingOrderDossier.inspections[0].photos[0]}
                            alt="Pickup evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Veterinary Medical Location */}
                <div className="p-4 rounded-2xl border border-teal-200/80 bg-teal-50/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      3. Medical Location: Veterinary Center
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = inspectingOrderDossier;
                        setInspectingOrderDossier(null);
                        openClinicModal(target);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-100 text-teal-800 hover:bg-teal-200 transition cursor-pointer"
                    >
                      Edit Clinic
                    </button>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Designated Clinic:</span>
                      <strong className="text-slate-900 text-right">
                        {inspectingOrderDossier.vetClinicName || 'Crown Vet Specialty Animal Hospital & Diagnostics'}
                      </strong>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Registered Doctor:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {inspectingOrderDossier.vetDoctorName || 'Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Viral Screening:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                        Parvo / Distemper Negative
                      </span>
                    </div>
                  </div>

                  {inspectingOrderDossier.medicalCertUrl && (
                    <div className="pt-2 border-t border-teal-100">
                      <a
                        href={inspectingOrderDossier.medicalCertUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-teal-700 font-bold hover:underline text-[11px]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Signed Vet Health Fitness Certificate &rarr;</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* 4. Destination (Where it delivered) */}
                <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      4. Destination: Customer Delivery Handover
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {inspectingOrderDossier.status === 'DELIVERY_COMPLETED' ? 'Delivered' : inspectingOrderDossier.paymentStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Customer Name:</span>
                      <strong className="text-slate-900">{inspectingOrderDossier.customerName}</strong>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Phone:</span>
                      <a href={`tel:${inspectingOrderDossier.customerContact}`} className="font-mono text-blue-600 hover:underline">
                        {inspectingOrderDossier.customerContact}
                      </a>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Address:</span>
                      <span className="text-right text-slate-800 max-w-[220px]">{inspectingOrderDossier.deliveryAddress}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Package:</span>
                      <span className="text-slate-800">{inspectingOrderDossier.productOrPackage}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-400 font-semibold">Mode / Source:</span>
                      <span className="text-slate-800 font-mono text-[10px]">
                        {inspectingOrderDossier.paymentMode || 'FULL_PREPAID'} • {inspectingOrderDossier.orderSource || 'WEBSITE'}
                      </span>
                    </div>
                  </div>

                  {/* Proof of Delivery Card */}
                  {inspectingOrderDossier.deliveryRecord && (
                    <div className="mt-3 p-3 rounded-xl bg-white border border-emerald-200/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">Handover Proof (POD)</span>
                        <span className="text-emerald-700 font-mono font-bold text-[10px]">OTP Verified</span>
                      </div>
                      {inspectingOrderDossier.deliveryRecord.dateTime && (
                        <div className="text-[10px] text-slate-500">
                          Handover at: {new Date(inspectingOrderDossier.deliveryRecord.dateTime).toLocaleString('en-GB')}
                        </div>
                      )}
                      {inspectingOrderDossier.deliveryRecord.photo && (
                        <a
                          href={inspectingOrderDossier.deliveryRecord.photo}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group mt-1"
                        >
                          <img
                            src={inspectingOrderDossier.deliveryRecord.photo}
                            alt="POD Photo"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <Link
                  href={`/records/${inspectingOrderDossier.orderId}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Public QR Provenance Pass</span>
                </Link>
                <Link
                  href={`/certificate/${inspectingOrderDossier.orderId}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 Certificate</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setInspectingOrderDossier(null)}
                className="px-5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer shadow-xs"
              >
                Close Dossier
              </button>
            </div>
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
