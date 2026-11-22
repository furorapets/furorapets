'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  User,
  UserPlus,
  Search,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Package,
  Calendar,
  Layers,
  HeartHandshake,
  Eye,
  Truck,
  QrCode,
  Plus,
  Store,
  Stethoscope,
  FileText,
  Camera,
  Printer,
  ShieldCheck,
  Check,
  ChevronRight,
  Upload,
  CreditCard,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PetPicker from '@/components/PetPicker';
import VendorPicker from '@/components/VendorPicker';
import AgentPicker from '@/components/AgentPicker';

function CustomersContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { currentUser, switchRole, switchToRoleName } = useSession();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'WITH_ORDERS' | 'DELIVERED'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEBSITE' | 'AD_CAMPAIGN'>('ALL');

  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
  }, [queryParam]);

  // Customer Details Modal
  const [inspectingCustomer, setInspectingCustomer] = useState<any | null>(null);

  // Register Customer Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Manual Order Creation Modal
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerContact: '',
    deliveryAddress: '',
    categoryId: '',
    breedId: '',
    productOrPackage: 'Companion Animal Standard Package',
    paymentStatus: 'PAID' as 'PAID' | 'PENDING',
    orderSource: 'DIRECT',
    adCampaign: '',
    paymentMode: 'ADVANCE_COD',
    advancePaid: 15000,
    petId: '',
    vendorId: '',
    agentId: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [availableBreeds, setAvailableBreeds] = useState<any[]>([]);
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFormError, setOrderFormError] = useState('');
  const [orderSuccessMessage, setOrderSuccessMessage] = useState('');

  // QR Code Preview / Scan Modal
  const [previewingQrOrder, setPreviewingQrOrder] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Progressive Documents Fulfill Modal (Vendor -> Vet -> Customer)
  const [progressiveOrderModal, setProgressiveOrderModal] = useState<any | null>(null);
  const [progressiveStage, setProgressiveStage] = useState<'INSPECTION' | 'MEDICAL' | 'DELIVERY'>('INSPECTION');
  const [progressiveForm, setProgressiveForm] = useState({
    inspectionCondition: '10/10 Physical criteria passed. Healthy coat, clear eyes, energetic posture.',
    inspectionNotes: 'Breeder kennel verified. Pet verified against digital identity.',
    inspectionPhoto: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    medicalHospital: 'Furora Veterinary Specialty Hospital & Diagnostics',
    medicalDocUrl: 'https://furora-docs.storage/medical/vet-health-clearance-cert.pdf',
    medicalDocName: 'Certified Veterinary Health & Wellness Report.pdf',
    vaccinationDocUrl: 'https://furora-docs.storage/medical/complete-immunization-card.pdf',
    vaccinationDocName: 'Official Immunization & Vaccination Record.pdf',
    deliveryPhoto: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    deliveryCustId: 'GOV-ID-AADHAAR-88992211',
    deliverySignedReport: 'https://furora-docs.storage/delivery/signed-handover-pod.pdf',
    deliveryAck: 'Customer confirms handover receipt of companion animal in optimal condition.',
  });
  const [progressiveSubmitting, setProgressiveSubmitting] = useState(false);
  const [progressiveSuccess, setProgressiveSuccess] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create customer');

      setFormData({ name: '', email: '', phone: '', address: '' });
      setIsCreateModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openManualOrderModal = async (preselectedCustomer?: any) => {
    setOrderFormError('');
    setOrderSuccessMessage('');

    // Pre-fill customer
    const initialCustomer = preselectedCustomer || (customers.length > 0 ? customers[0] : null);

    // Load categories, vendors, agents
    try {
      const [catsRes, vendorsRes, agentsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/users?role=VENDOR'),
        fetch('/api/users?role=DELIVERY_AGENT'),
      ]);

      const [catsData, vendorsData, agentsData] = await Promise.all([
        catsRes.json(),
        vendorsRes.json(),
        agentsRes.json(),
      ]);

      const catsList = catsData.success ? catsData.data : [];
      setCategories(catsList);
      setVendors(vendorsData.success ? vendorsData.data : []);
      setAgents(agentsData.success ? agentsData.data : []);

      const firstCat = catsList.length > 0 ? catsList[0] : null;
      const firstCatBreeds = firstCat?.breeds?.filter((b: any) => b.active) || [];
      setAvailableBreeds(firstCatBreeds);
      const firstBreed = firstCatBreeds.length > 0 ? firstCatBreeds[0] : null;

      setOrderFormData({
        customerId: initialCustomer?.id || '',
        customerName: initialCustomer?.name || '',
        customerEmail: initialCustomer?.email || '',
        customerContact: initialCustomer?.phone || '',
        deliveryAddress: initialCustomer?.address || '',
        categoryId: firstCat?.id || '',
        breedId: firstBreed?.id || '',
        productOrPackage: 'Companion Animal Standard Package',
        paymentStatus: 'PAID',
        orderSource: 'DIRECT',
        adCampaign: '',
        paymentMode: 'ADVANCE_COD',
        advancePaid: 15000,
        petId: '',
        vendorId: vendorsData.data?.[0]?.id || '',
        agentId: agentsData.data?.[0]?.id || '',
      });

      if (firstBreed?.id) {
        fetchAvailablePetsForBreed(firstBreed.id);
      }

      setIsManualOrderModalOpen(true);
    } catch (e: any) {
      console.error(e);
      setOrderFormError('Failed to load catalog resources');
    }
  };

  const fetchAvailablePetsForBreed = async (breedId: string) => {
    try {
      const res = await fetch(`/api/pets?breedId=${breedId}&status=AVAILABLE`);
      const data = await res.json();
      if (data.success) {
        setAvailablePets(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategoryChange = (catId: string) => {
    const selectedCat = categories.find((c) => c.id === catId);
    const catBreeds = selectedCat?.breeds?.filter((b: any) => b.active) || [];
    setAvailableBreeds(catBreeds);
    const firstBreed = catBreeds.length > 0 ? catBreeds[0] : null;

    setOrderFormData((prev) => ({
      ...prev,
      categoryId: catId,
      breedId: firstBreed?.id || '',
      petId: '',
    }));

    if (firstBreed?.id) {
      fetchAvailablePetsForBreed(firstBreed.id);
    } else {
      setAvailablePets([]);
    }
  };

  const handleBreedChange = (breedId: string) => {
    setOrderFormData((prev) => ({
      ...prev,
      breedId,
      petId: '',
    }));
    fetchAvailablePetsForBreed(breedId);
  };

  const handleCustomerSelection = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setOrderFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        customerContact: cust.phone || prev.customerContact,
        deliveryAddress: cust.address || prev.deliveryAddress,
      }));
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);
    setOrderFormError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place manual order');

      setOrderSuccessMessage(`Order created successfully: ${data.data.orderId}`);
      setTimeout(() => {
        setIsManualOrderModalOpen(false);
        setOrderSuccessMessage('');
        loadCustomers();
      }, 1000);
    } catch (err: any) {
      setOrderFormError(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Open QR Scanner / Preview Modal
  const openQrPreview = async (order: any) => {
    setPreviewingQrOrder(order);
    try {
      const res = await fetch(`/api/records/${order.orderId}`);
      const data = await res.json();
      if (data.success && data.data?.certificate?.qrCodeUrl) {
        setQrCodeDataUrl(data.data.certificate.qrCodeUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Progressive Document Upload Modal
  const openProgressiveModal = (order: any) => {
    setProgressiveOrderModal(order);
    setProgressiveSuccess('');
    // Auto-select stage based on current order status
    if (order.status === 'ORDER_RECEIVED' || order.status.includes('PICKUP')) {
      setProgressiveStage('INSPECTION');
    } else if (order.status.includes('MEDICAL')) {
      setProgressiveStage('MEDICAL');
    } else {
      setProgressiveStage('DELIVERY');
    }
  };

  const handleProgressiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressiveOrderModal) return;
    setProgressiveSubmitting(true);
    setProgressiveSuccess('');

    try {
      if (progressiveStage === 'INSPECTION') {
        const res = await fetch('/api/inspection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: progressiveOrderModal.id,
            result: 'ACCEPT',
            physicalCondition: progressiveForm.inspectionCondition,
            notes: progressiveForm.inspectionNotes,
            photos: [progressiveForm.inspectionPhoto],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record pickup inspection');
        setProgressiveSuccess('Location 1 (Breeder Kennel): Pickup inspection accepted and recorded!');
      } else if (progressiveStage === 'MEDICAL') {
        const res = await fetch('/api/medical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: progressiveOrderModal.id,
            result: 'APPROVED',
            documents: [
              {
                type: 'MEDICAL_REPORT',
                fileName: progressiveForm.medicalDocName,
                fileUrl: progressiveForm.medicalDocUrl,
                visibility: 'CUSTOMER_VISIBLE',
              },
              {
                type: 'VACCINATION_RECORD',
                fileName: progressiveForm.vaccinationDocName,
                fileUrl: progressiveForm.vaccinationDocUrl,
                visibility: 'CUSTOMER_VISIBLE',
              },
            ],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record medical clearance');
        setProgressiveSuccess('Location 2 (Vet Center): Health clearance and customer medical documents uploaded!');
      } else {
        const res = await fetch('/api/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: progressiveOrderModal.id,
            photo: progressiveForm.deliveryPhoto,
            customerIdCaptured: progressiveForm.deliveryCustId,
            signedDeliveryReport: progressiveForm.deliverySignedReport,
            customerAcknowledgement: progressiveForm.deliveryAck,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit proof of delivery');
        setProgressiveSuccess('Location 3 (Customer Place): Handover completed, signed report & POD recorded!');
      }

      await loadCustomers();
      setTimeout(() => {
        setProgressiveOrderModal(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProgressiveSubmitting(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const withOrders = customers.filter((c) => (c.customerOrders?.length || 0) > 0).length;
    const totalOrders = customers.reduce((sum, c) => sum + (c.customerOrders?.length || 0), 0);
    const deliveredOrders = customers.reduce(
      (sum, c) =>
        sum + (c.customerOrders?.filter((o: any) => o.status === 'DELIVERY_COMPLETED')?.length || 0),
      0
    );
    return { total, withOrders, totalOrders, deliveredOrders };
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const orderCount = c.customerOrders?.length || 0;
      if (orderFilter === 'WITH_ORDERS' && orderCount === 0) return false;
      if (
        orderFilter === 'DELIVERED' &&
        !c.customerOrders?.some((o: any) => o.status === 'DELIVERY_COMPLETED')
      )
        return false;

      // Filter by Channel / Order Source
      if (sourceFilter === 'WEBSITE') {
        const hasWebOrder = c.customerOrders?.some((o: any) => !o.orderSource || o.orderSource === 'WEBSITE');
        if (!hasWebOrder) return false;
      }
      if (sourceFilter === 'AD_CAMPAIGN') {
        const hasAdOrder = c.customerOrders?.some((o: any) => o.orderSource === 'AD_CAMPAIGN' || o.adCampaign);
        if (!hasAdOrder) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchAddress = c.address?.toLowerCase().includes(q);
        const matchOrder = c.customerOrders?.some((o: any) =>
          o.orderId?.toLowerCase().includes(q)
        );
        return matchName || matchEmail || matchPhone || matchAddress || matchOrder;
      }
      return true;
    });
  }, [customers, orderFilter, sourceFilter, searchQuery]);

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
            Only Furora Administrators can access the master Customer Buyer registry and place manual orders.
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
              Customers
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              {customers.length} Customers
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage customer buyers, place manual orders, and view delivery verification records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openManualOrderModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Manual Order
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-xs active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" /> Register Customer
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customers</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.total}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Buyers</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.withOrders}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orders Placed</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.totalOrders}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivered Orders</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.deliveredOrders}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, or address..."
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

          {/* Activity Filter Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Customers' },
              { id: 'WITH_ORDERS', label: 'With Orders' },
              { id: 'DELIVERED', label: 'Delivered Pets' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOrderFilter(tab.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  orderFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> customers
        </div>
      </div>

      {/* Customers Table */}
      <div className="card-clean overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Customer Name</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Email & Contact</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[220px]">Shipping Destination</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[220px]">Orders & QR Certificates</th>
                <th className="py-3 px-4 whitespace-nowrap text-right min-w-[220px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No customers match your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const orders = c.customerOrders || [];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors h-[64px]">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase border border-slate-200">
                            {c.name?.[0] || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{c.name}</div>
                            <div className="font-mono text-[10px] text-slate-400 tracking-tight">{c.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Shipping Address */}
                      <td className="py-3 px-4">
                        {c.address ? (
                          <div className="flex items-start gap-1.5 text-slate-600 font-medium text-[11px] max-w-[240px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2" title={c.address}>
                              {c.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No address recorded</span>
                        )}
                      </td>

                      {/* Orders & QR Code Preview */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {orders.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No orders yet</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-full font-bold text-[10px]">
                                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {orders.slice(0, 1).map((ord: any) => (
                                <button
                                  key={ord.id}
                                  onClick={() => openQrPreview(ord)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[10px] font-bold hover:bg-slate-200 transition shadow-2xs"
                                  title="Scan & View QR Certificate with all complete documents"
                                >
                                  <QrCode className="w-3 h-3 text-slate-600" />
                                  <span>{ord.orderId}</span>
                                </button>
                              ))}
                              {orders.length > 1 && (
                                <span className="text-[10px] text-slate-400 font-semibold self-center">
                                  +{orders.length - 1} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Quick Add Order for Customer */}
                          <button
                            onClick={() => openManualOrderModal(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-2xs"
                            title={`Create new order for ${c.name}`}
                          >
                            <Plus className="w-3 h-3" />
                            Order
                          </button>

                          {/* Inspect Orders Modal */}
                          <button
                            onClick={() => setInspectingCustomer(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition shadow-2xs"
                            title="Inspect order history & pet details"
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            View Orders
                          </button>

                          {/* Switch persona shortcut */}
                          <button
                            onClick={() => switchRole(c.id)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                            title={`Switch persona to customer ${c.name}`}
                          >
                            Login as
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Customer Orders Modal */}
      {inspectingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-2xl w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-extrabold text-sm flex items-center justify-center border border-purple-200 uppercase">
                  {inspectingCustomer.name?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {inspectingCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {inspectingCustomer.id} &bull; {inspectingCustomer.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingCustomer.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Shipping Address</p>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingCustomer.address || 'Not provided'}</p>
              </div>
            </div>

            {/* Orders Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Customer Orders ({inspectingCustomer.customerOrders?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setInspectingCustomer(null);
                    openManualOrderModal(inspectingCustomer);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900"
                >
                  <Plus className="w-3 h-3" /> Place New Order for {inspectingCustomer.name}
                </button>
              </div>

              {(!inspectingCustomer.customerOrders || inspectingCustomer.customerOrders.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                  This customer has not placed any orders yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inspectingCustomer.customerOrders.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders?q=${ord.orderId}`}
                            className="font-mono text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 transition inline-flex items-center gap-1 group"
                            title="Manage this order in Orders & Dispatch"
                          >
                            <span>{ord.orderId}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-slate-500" />
                          </Link>
                          <span className="text-xs font-semibold text-slate-700">
                            {ord.category?.name} &bull; {ord.breed?.name}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400">Linked Pet:</span>{' '}
                          {ord.pet?.petId ? (
                            <Link
                              href={`/admin/categories?q=${ord.pet.petId}`}
                              className="font-mono text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                              title="View pet profile in Category & Pet Inventory"
                            >
                              <span>{ord.pet.petId}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </Link>
                          ) : (
                            <strong className="text-slate-400 font-mono text-xs">Awaiting Pet</strong>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400">Payment:</span>{' '}
                          <strong className="text-emerald-700 font-bold">{ord.paymentStatus}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Delivery Address:</span>{' '}
                          <span className="text-slate-800 font-medium truncate block" title={ord.deliveryAddress}>
                            {ord.deliveryAddress}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons: Progressive documents + QR Certificate */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openProgressiveModal(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Upload className="w-3 h-3 text-slate-600" />
                          Update Documents (Vendor / Vet / Delivery)
                        </button>

                        <button
                          type="button"
                          onClick={() => openQrPreview(ord)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition shadow-2xs"
                        >
                          <QrCode className="w-3 h-3" />
                          Scan / View QR Certificate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Creation Modal */}
      {isManualOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop">
          <div className="card-clean max-w-2xl w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 max-h-[92vh] overflow-y-auto overscroll-contain modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create Manual / Ad Campaign Order</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record complete order info from ad lead attribution through to kennel sourcing, medical clearance, and QR certificate generation.
                </p>
              </div>
              <button
                onClick={() => setIsManualOrderModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {orderFormError}
              </div>
            )}

            {orderSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {orderSuccessMessage}
              </div>
            )}

            <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs">
              {/* Customer Selection */}
              <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-150 space-y-2.5">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-700" /> Customer Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                      Select Existing Customer
                    </label>
                    <select
                      value={orderFormData.customerId}
                      onChange={(e) => handleCustomerSelection(e.target.value)}
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderFormData.customerName}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customerName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderFormData.customerContact}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customerContact: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderFormData.deliveryAddress}
                      onChange={(e) => setOrderFormData({ ...orderFormData, deliveryAddress: e.target.value })}
                      placeholder="e.g. 104, Palm Grove, Whitefield, Bangalore"
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms & Advance Deposit */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-700" /> Payment Terms & Advance Token
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={orderFormData.paymentMode}
                      onChange={(e) => setOrderFormData({ ...orderFormData, paymentMode: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="ADVANCE_COD">Advance Token + Balance on Handover (COD)</option>
                      <option value="FULL_PREPAID">100% Full Pre-payment Completed</option>
                      <option value="COD">Full Cash on Delivery (COD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Advance Token Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      value={orderFormData.advancePaid || ''}
                      onChange={(e) => setOrderFormData({ ...orderFormData, advancePaid: Number(e.target.value) })}
                      placeholder="e.g. 15000"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Pet & Category Selection */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-700" /> Animal & Package Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Animal Category *
                    </label>
                    <select
                      required
                      value={orderFormData.categoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Breed *
                    </label>
                    <select
                      required
                      value={orderFormData.breedId}
                      onChange={(e) => handleBreedChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {availableBreeds.map((br) => (
                        <option key={br.id} value={br.id}>
                          {br.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Package Selection
                    </label>
                    <select
                      value={orderFormData.productOrPackage}
                      onChange={(e) => setOrderFormData({ ...orderFormData, productOrPackage: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="Companion Animal Standard Package">Companion Animal Standard Package</option>
                      <option value="Show Quality Champion Pedigree Package">Show Quality Champion Pedigree Package</option>
                      <option value="Full Comprehensive Health Certified Package">Full Comprehensive Health Certified Package</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={orderFormData.paymentStatus}
                      onChange={(e) => setOrderFormData({ ...orderFormData, paymentStatus: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                    >
                      <option value="PAID">PAID (Online Gateway / Wire Verified)</option>
                      <option value="PENDING">PENDING (Payment Upon Handover)</option>
                    </select>
                  </div>
                </div>

                {/* Optional Available Pet Allocation */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Allocate Available Pet (Optional - or assign via Vendor)
                  </label>
                  <PetPicker
                    pets={availablePets}
                    selectedPetId={orderFormData.petId}
                    onSelectPet={(id) => setOrderFormData({ ...orderFormData, petId: id })}
                    allowNone={true}
                    noneLabel="Leave for Vendor Allocation (No Pet Linked Yet)"
                    noneSubtext="Order will be created awaiting vendor partner sourcing."
                    breedName={availableBreeds.find((b) => b.id === orderFormData.breedId)?.name}
                  />
                </div>
              </div>

              {/* Assignment Options */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assign Vendor Kennel (Optional)
                  </label>
                  <VendorPicker
                    vendors={vendors}
                    selectedVendorId={orderFormData.vendorId}
                    onSelectVendor={(id) => setOrderFormData({ ...orderFormData, vendorId: id })}
                    allowNone={true}
                    noneLabel="No Vendor Assigned Yet (Source Later)"
                    noneSubtext="Order will be saved awaiting partner kennel assignment."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assign Delivery / Ops Agent (Optional)
                  </label>
                  <AgentPicker
                    agents={agents}
                    selectedAgentId={orderFormData.agentId}
                    onSelectAgent={(id) => setOrderFormData({ ...orderFormData, agentId: id })}
                    allowNone={true}
                    noneLabel="No Agent Assigned Yet"
                    noneSubtext="Field agent can be assigned later during dispatch."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {orderSubmitting ? 'Creating Order...' : 'Create & Link Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Preview & Scan Modal */}
      {previewingQrOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-md w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Official Furora Authenticity Seal
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {previewingQrOrder.orderId}
                </h3>
              </div>
              <button
                onClick={() => setPreviewingQrOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Canvas */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 inline-block mx-auto shadow-inner">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code ${previewingQrOrder.orderId}`}
                  className="w-48 h-48 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-mono font-bold mt-3">
                Scan on mobile to view complete verified documents
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span>Customer:</span>
                <strong className="text-slate-800">{previewingQrOrder.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <strong className="text-emerald-700">{previewingQrOrder.status}</strong>
              </div>
              <div className="flex justify-between">
                <span>Linked Pet:</span>
                <strong className="font-mono text-slate-800">{previewingQrOrder.pet?.petId || 'Assigned in Flow'}</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Link
                href={`/records/${previewingQrOrder.orderId}`}
                target="_blank"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Verified Record
              </Link>
              <Link
                href={`/certificate/${previewingQrOrder.orderId}`}
                target="_blank"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Certificate
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Locations Document Updating Modal */}
      {progressiveOrderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Progressive Chain of Custody
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Update Documents: {progressiveOrderModal.orderId}
                </h3>
              </div>
              <button
                onClick={() => setProgressiveOrderModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {progressiveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{progressiveSuccess}</span>
              </div>
            )}

            {/* Stage Selector Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs">
              <button
                type="button"
                onClick={() => setProgressiveStage('INSPECTION')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  progressiveStage === 'INSPECTION'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Store className="w-3 h-3 text-amber-600" />
                1. Vendor Place
              </button>
              <button
                type="button"
                onClick={() => setProgressiveStage('MEDICAL')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  progressiveStage === 'MEDICAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3 h-3 text-teal-600" />
                2. Vet Center
              </button>
              <button
                type="button"
                onClick={() => setProgressiveStage('DELIVERY')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  progressiveStage === 'DELIVERY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3 h-3 text-purple-600" />
                3. Customer POD
              </button>
            </div>

            <form onSubmit={handleProgressiveSubmit} className="space-y-3.5 text-xs">
              {/* Stage 1: Vendor Place */}
              {progressiveStage === 'INSPECTION' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                    <strong>Location 1: Breeder Kennel Place</strong> &bull; Record physical pickup condition and photo inspection evidence.
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Physical Condition Assessment *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.inspectionCondition}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, inspectionCondition: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Inspection Photo Evidence (URL) *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.inspectionPhoto}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, inspectionPhoto: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Agent Handover Notes
                    </label>
                    <textarea
                      rows={2}
                      value={progressiveForm.inspectionNotes}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, inspectionNotes: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Stage 2: Vet Medical Center */}
              {progressiveStage === 'MEDICAL' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 text-[11px]">
                    <strong>Location 2: Veterinary Medical Center</strong> &bull; Upload certified clinical medical clearance & customer-visible health documents.
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      1. Medical Report / Fitness Certificate URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.medicalDocUrl}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, medicalDocUrl: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      2. Vaccination Record & Immunization Schedule URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.vaccinationDocUrl}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, vaccinationDocUrl: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Veterinary Hospital & Clinic Review
                    </label>
                    <input
                      type="text"
                      value={progressiveForm.medicalHospital}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, medicalHospital: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Stage 3: Customer Residence Delivery */}
              {progressiveStage === 'DELIVERY' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-[11px]">
                    <strong>Location 3: Customer Residence</strong> &bull; Record final proof of delivery (POD), customer ID verification, and signed report.
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Delivery Proof Photo (URL) *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.deliveryPhoto}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, deliveryPhoto: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Customer ID Captured (Aadhaar / Passport #) *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.deliveryCustId}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, deliveryCustId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Signed Delivery Report Doc URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={progressiveForm.deliverySignedReport}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, deliverySignedReport: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Customer Handover Acknowledgment
                    </label>
                    <textarea
                      rows={2}
                      value={progressiveForm.deliveryAck}
                      onChange={(e) => setProgressiveForm({ ...progressiveForm, deliveryAck: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressiveOrderModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progressiveSubmitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
                >
                  {progressiveSubmitting ? 'Recording Updates...' : 'Submit Location Documents'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Customer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-md w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Register Customer Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a buyer profile with shipping address and contact credentials.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFormError('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.verma@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Primary Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Flat 302, Green Valley Apartments, Indiranagar, Bangalore"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <CustomersContent />
    </Suspense>
  );
}
