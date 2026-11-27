'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Store,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  ExternalLink,
  ShieldCheck,
  Send,
  Building,
  Phone,
  Mail,
  MapPin,
  X,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Eye,
  RefreshCw,
  Layers,
  ClipboardList,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileWarning,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import FileUploadField from '@/components/FileUploadField';

function VendorsContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { currentUser } = useSession();
  const [vendors, setVendors] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
  }, [queryParam]);

  // Modal states
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [reviewingVendor, setReviewingVendor] = useState<any | null>(null);

  // Compliance Documents Inspection Modal & In-App Document Viewer states
  const [inspectingVendorDocs, setInspectingVendorDocs] = useState<any | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ title: string; url: string } | null>(null);
  const [docZoom, setDocZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [docImageLoading, setDocImageLoading] = useState(true);
  const [docImageError, setDocImageError] = useState(false);
  const [viewModeOverride, setViewModeOverride] = useState<'auto' | 'pdf' | 'image'>('auto');

  // Reset viewer state whenever viewingDocument changes
  useEffect(() => {
    if (viewingDocument) {
      setDocZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
      setDocImageLoading(true);
      setDocImageError(false);
      setViewModeOverride('auto');
    }
  }, [viewingDocument]);

  // Handle Escape key to close document viewer or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingDocument) {
          setViewingDocument(null);
        } else if (inspectingVendorDocs) {
          setInspectingVendorDocs(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingDocument, inspectingVendorDocs]);

  const isPdfDocument = (url?: string) => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return clean.endsWith('.pdf') || clean.includes('/pdf') || clean.includes('application/pdf');
  };

  // Vendor Pets Inspect Modal state
  const [inspectingVendorPets, setInspectingVendorPets] = useState<any | null>(null);
  const [vendorPetsList, setVendorPetsList] = useState<any[]>([]);
  const [vendorPetsLoading, setVendorPetsLoading] = useState(false);
  const [vendorPetsError, setVendorPetsError] = useState('');

  const openVendorPetsModal = async (v: any) => {
    setInspectingVendorPets(v);
    setVendorPetsLoading(true);
    setVendorPetsError('');
    try {
      const res = await fetch(`/api/pets?vendorId=${encodeURIComponent(v.id)}`);
      const data = await res.json();
      if (data.success) {
        setVendorPetsList(data.data || []);
      } else {
        setVendorPetsError(data.error || 'Failed to fetch vendor pets');
      }
    } catch (e: any) {
      setVendorPetsError(e.message || 'Error fetching vendor pets');
    } finally {
      setVendorPetsLoading(false);
    }
  };

  // Assign Categories Modal state
  const [assigningVendor, setAssigningVendor] = useState<any | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Review & Feedback action states
  const [feedbackAction, setFeedbackAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [reviewAssignedCategories, setReviewAssignedCategories] = useState<string[]>([]);
  const [docFlags, setDocFlags] = useState<{ [key: string]: { status: 'VERIFIED' | 'NEEDS_UPDATE' | 'NONE'; reason?: string } }>({});
  const [activeFlaggingDoc, setActiveFlaggingDoc] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Direct Onboarding Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    mapUrl: '',
    secondaryAddress: '',
    secondaryMapUrl: '',
    kennelRegNumber: '',
    kennelRegDoc: '',
    govIdDoc: '',
    tradeLicenseDoc: '',
    vetAffiliationDoc: '',
    bankDetailsDoc: '',
    onboardingStatus: 'APPROVED',
    assignedCategories: [] as string[],
  });
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState('');

  const loadVendors = async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/categories?all=true'),
      ]);
      const vData = await vRes.json();
      const cData = await cRes.json();
      if (vData.success) {
        setVendors(vData.data);
      }
      if (cData.success) {
        setAllCategories(cData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = vendors.length;
    const draft = vendors.filter((v) => v.onboardingStatus === 'DRAFT').length;
    const pending = vendors.filter((v) => v.onboardingStatus === 'PENDING').length;
    const changes = vendors.filter((v) => v.onboardingStatus === 'CHANGES_REQUESTED').length;
    const approved = vendors.filter((v) => v.onboardingStatus === 'APPROVED').length;
    const rejected = vendors.filter((v) => v.onboardingStatus === 'REJECTED').length;
    return { total, draft, pending, changes, approved, rejected };
  }, [vendors]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== 'ALL' && v.onboardingStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name?.toLowerCase().includes(q);
        const matchEmail = v.email?.toLowerCase().includes(q);
        const matchPhone = v.phone?.toLowerCase().includes(q);
        const matchAddress = v.address?.toLowerCase().includes(q);
        const matchReg = v.kennelRegNumber?.toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchAddress || matchReg;
      }
      return true;
    });
  }, [vendors, statusFilter, searchQuery]);

  // Direct Onboarding Submit
  const handleDirectOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardSubmitting(true);
    setOnboardError('');

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard vendor');

      setIsOnboardModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        mapUrl: '',
        secondaryAddress: '',
        secondaryMapUrl: '',
        kennelRegNumber: '',
        kennelRegDoc: '',
        govIdDoc: '',
        tradeLicenseDoc: '',
        vetAffiliationDoc: '',
        bankDetailsDoc: '',
        onboardingStatus: 'APPROVED',
        assignedCategories: [],
      });
      loadVendors();
    } catch (err: any) {
      setOnboardError(err.message);
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // Handle Review Action (Approve, Request Changes, Reject)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingVendor) return;

    setReviewSubmitting(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await fetch(`/api/vendors/${reviewingVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: feedbackAction,
          onboardingNotes: feedbackNotes,
          assignedCategories: reviewAssignedCategories,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update vendor status');

      setReviewSuccess(data.message || 'Vendor verification status updated successfully.');
      setTimeout(() => {
        setReviewingVendor(null);
        setReviewSuccess('');
        setFeedbackNotes('');
        loadVendors();
      }, 1000);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const openAssignCategoriesModal = (vendor: any) => {
    setAssigningVendor(vendor);
    let currentAssigned: string[] = [];
    try {
      if (vendor.assignedCategories) {
        currentAssigned = JSON.parse(vendor.assignedCategories);
      }
    } catch (e) {
      currentAssigned = [];
    }
    setSelectedCategories(Array.isArray(currentAssigned) ? currentAssigned : []);
    setAssignError('');
    setAssignSuccess('');
  };

  const handleSaveAssignedCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningVendor) return;

    setAssignSubmitting(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const res = await fetch(`/api/vendors/${assigningVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedCategories: selectedCategories,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update assigned categories');

      setAssignSuccess('Assigned categories saved successfully.');
      setTimeout(() => {
        setAssigningVendor(null);
        setAssignSuccess('');
        loadVendors();
      }, 700);
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleFlagDoc = (docKey: string, docTitle: string, reason: string) => {
    const updated = {
      ...docFlags,
      [docKey]: { status: 'NEEDS_UPDATE' as const, reason },
    };
    setDocFlags(updated);
    setActiveFlaggingDoc(null);
    setFeedbackAction('REQUEST_CHANGES');
    rebuildFeedbackNotes(updated);
  };

  const handleVerifyDoc = (docKey: string) => {
    const updated = {
      ...docFlags,
      [docKey]: { status: 'VERIFIED' as const },
    };
    setDocFlags(updated);
    if (activeFlaggingDoc === docKey) setActiveFlaggingDoc(null);
    rebuildFeedbackNotes(updated);
  };

  const handleClearDocFlag = (docKey: string) => {
    const updated = { ...docFlags };
    delete updated[docKey];
    setDocFlags(updated);
    rebuildFeedbackNotes(updated);
  };

  const rebuildFeedbackNotes = (flags: { [key: string]: { status: 'VERIFIED' | 'NEEDS_UPDATE' | 'NONE'; reason?: string } }) => {
    const docTitles: { [k: string]: string } = {
      kennelRegDoc: 'Kennel Club / AWBI Registration Certificate',
      govIdDoc: 'Breeder Govt Identity Proof (Aadhaar/PAN)',
      tradeLicenseDoc: 'Municipal / AWBI Trade License',
      vetAffiliationDoc: 'Registered Vet Clinic Tie-up / Healthcare MoU',
      bankDetailsDoc: 'Bank Account Proof / Canceled Cheque',
    };

    const flaggedItems = Object.entries(flags).filter(([_, v]) => v.status === 'NEEDS_UPDATE');
    if (flaggedItems.length === 0) {
      setFeedbackNotes('');
      return;
    }

    const lines = flaggedItems.map(([k, v]) => `• ${docTitles[k] || k}: ${v.reason || 'Needs update or re-upload'}`);
    const noteText = `Please update the following flagged documents:\n${lines.join('\n')}\nEnsure documents are clear, current, and officially stamped.`;
    setFeedbackNotes(noteText);
  };

  const openReviewModal = (vendor: any) => {
    setReviewingVendor(vendor);
    setFeedbackAction(vendor.onboardingStatus === 'APPROVED' ? 'APPROVE' : 'REQUEST_CHANGES');
    setFeedbackNotes(vendor.onboardingNotes || '');
    let currentAssigned: string[] = [];
    try {
      if (vendor.assignedCategories) {
        currentAssigned = JSON.parse(vendor.assignedCategories);
      }
    } catch (e) {
      currentAssigned = [];
    }
    setReviewAssignedCategories(Array.isArray(currentAssigned) ? currentAssigned : []);
    setDocFlags({});
    setActiveFlaggingDoc(null);
    setReviewError('');
    setReviewSuccess('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600 shrink-0" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 mr-1 text-amber-600 shrink-0" /> Pending Review
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
            <Sparkles className="w-2.5 h-2.5 mr-1 text-sky-600 shrink-0" /> Registered (Draft)
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-orange-600 shrink-0" /> Changes Requested
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <XCircle className="w-2.5 h-2.5 mr-1 text-rose-600 shrink-0" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
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
              Vendors & Partner Kennels
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              {vendors.length} Partners
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Review breeder partner applications, verify compliance documents, and onboard kennels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/partner/onboard"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Partner Landing Page
          </Link>
          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Kennel
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-slate-300 ${
            statusFilter === 'ALL' ? 'ring-2 ring-slate-900 bg-slate-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Kennels</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.total}</p>
            <span className="text-[9px] text-slate-400 font-medium">All accounts</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Building className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('DRAFT')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-sky-300 ${
            statusFilter === 'DRAFT' ? 'ring-2 ring-sky-600 bg-sky-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">New Registered</p>
            <p className="text-xl font-extrabold text-sky-900 mt-0.5">{metrics.draft}</p>
            <span className="text-[9px] text-sky-600 font-medium">OTP Verified • In Wizard</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-amber-300 ${
            statusFilter === 'PENDING' ? 'ring-2 ring-amber-600 bg-amber-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Review</p>
            <p className="text-xl font-extrabold text-amber-900 mt-0.5">{metrics.pending}</p>
            <span className="text-[9px] text-amber-600 font-medium">Docs Submitted</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('CHANGES_REQUESTED')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-orange-300 ${
            statusFilter === 'CHANGES_REQUESTED' ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Changes Req.</p>
            <p className="text-xl font-extrabold text-orange-900 mt-0.5">{metrics.changes}</p>
            <span className="text-[9px] text-orange-500 font-medium">Action Pending</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-emerald-300 ${
            statusFilter === 'APPROVED' ? 'ring-2 ring-emerald-600 bg-emerald-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Approved</p>
            <p className="text-xl font-extrabold text-emerald-900 mt-0.5">{metrics.approved}</p>
            <span className="text-[9px] text-emerald-600 font-medium">Active Partners</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`card-clean p-3 flex items-center justify-between text-left transition hover:border-rose-300 ${
            statusFilter === 'REJECTED' ? 'ring-2 ring-rose-600 bg-rose-50/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Rejected</p>
            <p className="text-xl font-extrabold text-rose-900 mt-0.5">{metrics.rejected}</p>
            <span className="text-[9px] text-rose-500 font-medium">Not Qualified</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by kennel name, owner, phone, email, or KCI Reg #..."
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

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Kennels', count: metrics.total },
              { id: 'DRAFT', label: 'New Registered', count: metrics.draft, badgeClass: 'bg-sky-100 text-sky-800' },
              { id: 'PENDING', label: 'Pending Review', count: metrics.pending, badgeClass: 'bg-amber-100 text-amber-800' },
              { id: 'CHANGES_REQUESTED', label: 'Changes Requested', count: metrics.changes, badgeClass: 'bg-orange-100 text-orange-800' },
              { id: 'APPROVED', label: 'Approved Active', count: metrics.approved, badgeClass: 'bg-emerald-100 text-emerald-800' },
              { id: 'REJECTED', label: 'Rejected', count: metrics.rejected, badgeClass: 'bg-rose-100 text-rose-800' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id ? 'bg-white/20 text-white' : tab.badgeClass || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Showing <strong className="text-slate-800">{filteredVendors.length}</strong> partners
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card-clean overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-2.5 px-3.5 whitespace-nowrap">Kennel & Proprietor</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">KCI / AWBI Reg #</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Contact & Location</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Assigned Categories</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap text-center">Docs</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap text-center">Stock & Orders</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No vendor partners match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => {
                  const hasAllDocs = Boolean(
                    v.kennelRegDoc && v.govIdDoc && v.tradeLicenseDoc && v.vetAffiliationDoc && v.bankDetailsDoc
                  );
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Kennel Name */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 border ${
                              v.onboardingStatus === 'DRAFT'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 block leading-tight text-xs truncate max-w-[170px]" title={v.name}>{v.name}</span>
                              {v.onboardingStatus === 'DRAFT' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                                  <Sparkles className="w-2.5 h-2.5 text-sky-600" /> New Signup
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                              <span className="font-mono">{v.id}</span>
                              {v.createdAt && (
                                <span>
                                  • {new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reg Number */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {v.kennelRegNumber ? (
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {v.kennelRegNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic">
                            {v.onboardingStatus === 'DRAFT' ? 'Pending Wizard' : 'Under Review'}
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-2.5 px-3.5">
                        <div className="text-[11px]">
                          <div className="flex items-center text-slate-700 font-medium">
                            <Mail className="w-3 h-3 mr-1 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[170px]" title={v.email}>{v.email}</span>
                          </div>
                          {(v.phone || v.address) && (
                            <div className="flex items-center text-slate-500 text-[10px] mt-0.5 gap-1.5 whitespace-nowrap">
                              {v.phone && (
                                <span className="flex items-center">
                                  <Phone className="w-2.5 h-2.5 mr-1 text-slate-400 flex-shrink-0" />
                                  <span>{v.phone}</span>
                                </span>
                              )}
                              {v.phone && v.address && <span className="text-slate-300">•</span>}
                              {v.address && (
                                <span className="flex items-center text-slate-400 truncate max-w-[110px]" title={v.address}>
                                  <MapPin className="w-2.5 h-2.5 mr-0.5 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{v.address}</span>
                                </span>
                              )}
                              {(v.mapUrl || v.address) && (
                                <a
                                  href={v.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address || '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-emerald-600 hover:text-emerald-700 hover:underline font-bold text-[10px]"
                                  title="Open primary facility in Google Maps"
                                >
                                  Maps 📍
                                </a>
                              )}
                              {v.secondaryMapUrl && (
                                <a
                                  href={v.secondaryMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sky-600 hover:text-sky-700 hover:underline font-bold text-[10px]"
                                  title={`Alternative Location: ${v.secondaryAddress || 'Branch'}`}
                                >
                                  Alt Maps 📍
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Categories */}
                      <td className="py-2.5 px-3.5">
                        {(() => {
                          let assignedIds: string[] = [];
                          try {
                            if (v.assignedCategories) {
                              assignedIds = JSON.parse(v.assignedCategories);
                            }
                          } catch (e) {
                            assignedIds = [];
                          }
                          const assignedNames = allCategories
                            .filter((c) => assignedIds.includes(c.id))
                            .map((c) => c.name);

                          return (
                            <div>
                              <div className="flex flex-wrap items-center gap-1 max-w-[170px]">
                                {assignedNames.length > 0 ? (
                                  assignedNames.map((name) => (
                                    <span
                                      key={name}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    >
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    0 assigned
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => openAssignCategoriesModal(v)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-700 hover:text-sky-900 transition mt-0.5 hover:underline"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>Assign ({assignedIds.length})</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {getStatusBadge(v.onboardingStatus)}
                          {v.onboardingNotes && v.onboardingStatus === 'CHANGES_REQUESTED' && (
                            <p className="text-[9px] text-amber-700 line-clamp-1 italic max-w-[130px]">
                              "{v.onboardingNotes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Compliance Docs */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingVendorDocs(v)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${
                            v.onboardingStatus === 'DRAFT'
                              ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                              : hasAllDocs
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                          title={`Click to inspect all 5 compliance documents for ${v.name}`}
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>5 Docs</span>
                          {v.onboardingStatus === 'DRAFT' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" title="In Wizard" />
                          ) : hasAllDocs ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                        </button>
                      </td>

                      {/* Live Stock & Orders */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="text-[11px] leading-tight flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openVendorPetsModal(v)}
                            className="font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`Click to inspect ${v._count?.vendorPets || 0} pets registered by ${v.name}`}
                          >
                            <Layers className="w-3 h-3 text-blue-600" />
                            <span>{v._count?.vendorPets || 0} Pets</span>
                          </button>
                          <span className="text-slate-300">•</span>
                          <Link
                            href={`/admin/orders?vendor=${v.id}&q=${encodeURIComponent(v.name)}`}
                            className="text-slate-400 hover:text-slate-700 hover:underline transition text-[10px]"
                            title={`Inspect ${v._count?.vendorOrders || 0} orders`}
                          >
                            {v._count?.vendorOrders || 0} Orders
                          </Link>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAssignCategoriesModal(v)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                            title="Assign categories"
                          >
                            <Layers className="w-3 h-3 text-slate-500" />
                            <span>Categories</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(v)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shadow-xs ${
                              v.onboardingStatus === 'DRAFT'
                                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{v.onboardingStatus === 'DRAFT' ? 'Inspect' : 'Review'}</span>
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

      {/* Review & Verification Modal */}
      {reviewingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Vendor Compliance Verification
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {reviewingVendor.name} ({reviewingVendor.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingVendor(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {reviewError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  {reviewSuccess}
                </div>
              )}

              {/* Informational Banner for DRAFT applicants */}
              {reviewingVendor.onboardingStatus === 'DRAFT' && (
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-sky-950 text-xs">Landing Page Registration (Draft Mode)</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/80 text-sky-900 border border-sky-300">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-sky-700" /> Email OTP Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-800 leading-relaxed">
                      This partner registered on the public landing page (<code>/partner/onboard</code>) and verified their email with a 6-digit OTP. Their account is securely created in the database and they are currently filling their kennel facility details and uploading compliance documents. Once submitted, their application will automatically move to <strong>Pending Review</strong>.
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-sky-900 border-t border-sky-200/60 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-sky-600" /> {reviewingVendor.email}
                      </span>
                      {reviewingVendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-sky-600" /> {reviewingVendor.phone}
                        </span>
                      )}
                      {reviewingVendor.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-600" /> {reviewingVendor.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Header Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Status</span>
                  <div className="mt-0.5">{getStatusBadge(reviewingVendor.onboardingStatus)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block text-right">KCI / AWBI Reg</span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {reviewingVendor.kennelRegNumber || (reviewingVendor.onboardingStatus === 'DRAFT' ? 'Awaiting Wizard' : 'N/A')}
                  </span>
                </div>
              </div>

              {/* Facility Address & Navigation Links */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-amber-600" /> Primary Kennel Address
                  </span>
                  {(reviewingVendor.mapUrl || reviewingVendor.address) && (
                    <a
                      href={reviewingVendor.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reviewingVendor.address || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" /> Open in Google Maps 📍
                    </a>
                  )}
                </div>
                <div className="font-semibold text-slate-800 text-xs">
                  {reviewingVendor.address || 'Address not registered'}
                </div>

                {reviewingVendor.secondaryAddress && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Alternative Facility Location
                      </span>
                      {reviewingVendor.secondaryMapUrl && (
                        <a
                          href={reviewingVendor.secondaryMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <MapPin className="w-2.5 h-2.5 text-sky-600" /> Alt Maps 📍
                        </a>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px]">{reviewingVendor.secondaryAddress}</div>
                  </div>
                )}
              </div>

              {/* 5 Required Compliance Documents */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Mandatory Compliance Verification Documents
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      title: '1. Kennel Club / AWBI Registration Certificate',
                      url: reviewingVendor.kennelRegDoc,
                      key: 'kennelRegDoc',
                      desc: 'Verifies breeder is officially accredited by Kennel Club of India or Animal Welfare Board of India',
                    },
                    {
                      title: '2. Breeder Govt Identity Proof',
                      url: reviewingVendor.govIdDoc,
                      key: 'govIdDoc',
                      desc: 'Aadhaar Card or PAN Card of the primary facility proprietor',
                    },
                    {
                      title: '3. Municipal / AWBI Trade License',
                      url: reviewingVendor.tradeLicenseDoc,
                      key: 'tradeLicenseDoc',
                      desc: 'Municipal Trade License and pet shop/breeding establishment registration',
                    },
                    {
                      title: '4. Registered Vet Clinic Tie-up / Healthcare MoU',
                      url: reviewingVendor.vetAffiliationDoc,
                      key: 'vetAffiliationDoc',
                      desc: 'Formal healthcare contract guaranteeing regular veterinary checkups and vaccination protocol',
                    },
                    {
                      title: '5. Bank Account Proof / Canceled Cheque',
                      url: reviewingVendor.bankDetailsDoc,
                      key: 'bankDetailsDoc',
                      desc: 'Verified bank payout proof for settlement of completed puppy orders',
                    },
                  ].map((doc, idx) => {
                    const flag = docFlags[doc.key];
                    const isFlaggingThis = activeFlaggingDoc === doc.key;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition text-xs space-y-2 ${
                          flag?.status === 'NEEDS_UPDATE'
                            ? 'border-orange-300 bg-orange-50/30 ring-1 ring-orange-200'
                            : flag?.status === 'VERIFIED'
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <FileText className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <span className="font-bold text-slate-900">{doc.title}</span>
                              {flag?.status === 'NEEDS_UPDATE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                  <AlertTriangle className="w-2.5 h-2.5 text-orange-600" />
                                  Action Required: {flag.reason}
                                </span>
                              ) : flag?.status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Verified OK
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{doc.desc}</p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {doc.url ? (
                              <button
                                type="button"
                                onClick={() => setViewingDocument({ title: doc.title, url: doc.url })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                title="Open in-app document viewer"
                              >
                                <Eye className="w-3 h-3 text-slate-600" /> View Doc
                              </button>
                            ) : reviewingVendor.onboardingStatus === 'DRAFT' ? (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Awaiting Wizard Upload
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Missing
                              </span>
                            )}

                            {/* Verify Button */}
                            <button
                              type="button"
                              onClick={() => handleVerifyDoc(doc.key)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                flag?.status === 'VERIFIED'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title="Mark document verified and compliant"
                            >
                              <Check className="w-3 h-3" /> Verify
                            </button>

                            {/* Flag Issue Button */}
                            <button
                              type="button"
                              onClick={() => setActiveFlaggingDoc(isFlaggingThis ? null : doc.key)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                flag?.status === 'NEEDS_UPDATE' || isFlaggingThis
                                  ? 'bg-orange-600 text-white shadow-2xs'
                                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                              }`}
                              title="Flag issue on this specific document"
                            >
                              <AlertTriangle className="w-3 h-3" /> Flag Issue
                            </button>

                            {flag && (
                              <button
                                type="button"
                                onClick={() => handleClearDocFlag(doc.key)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                                title="Reset status"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Issue Picker when Admin clicks 'Flag Issue' */}
                        {isFlaggingThis && (
                          <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-2 mt-2 shadow-xs animate-in fade-in">
                            <span className="font-extrabold text-[10px] uppercase text-orange-800 tracking-wider block">
                              Select issue with {doc.title}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'Blurry / Unreadable scan',
                                'Expired / Needs 2026 renewal',
                                'Missing municipal seal / official stamp',
                                'Incorrect document uploaded',
                                'Name or address does not match applicant',
                                'Incomplete document (missing pages)',
                              ].map((reason, rIdx) => (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() => handleFlagDoc(doc.key, doc.title, reason)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/80 transition"
                                >
                                  + {reason}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Authorized Categories Section */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Authorized Pet Categories
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setReviewAssignedCategories(allCategories.map((c) => c.id))}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setReviewAssignedCategories([])}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Vendor can only list pets under assigned categories (e.g. assign Dogs & Cats from the available categories).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allCategories.map((cat) => {
                    const isChecked = reviewAssignedCategories.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setReviewAssignedCategories((prev) =>
                            isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                          isChecked
                            ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{cat.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {cat.breeds?.filter((b: any) => b.active).length || 0} breeds
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border text-white text-[10px] ${
                            isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Form */}
              <form onSubmit={handleReviewSubmit} className="pt-3 border-t border-slate-100 space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Admin Verification Action
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedbackAction('APPROVE')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        feedbackAction === 'APPROVE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Vendor
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackAction('REQUEST_CHANGES')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        feedbackAction === 'REQUEST_CHANGES'
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackAction('REJECT')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        feedbackAction === 'REJECT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>

                {/* Feedback Notes (Mandatory for Request Changes & Reject) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {feedbackAction === 'REQUEST_CHANGES'
                      ? 'Re-submission Feedback for Vendor (Mandatory) *'
                      : feedbackAction === 'REJECT'
                      ? 'Rejection Reason *'
                      : 'Approval Remarks (Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    required={feedbackAction === 'REQUEST_CHANGES' || feedbackAction === 'REJECT'}
                    placeholder={
                      feedbackAction === 'REQUEST_CHANGES'
                        ? 'e.g. Govt ID photo is blurry and Vet MoU expired on October 2026. Please upload clear, updated copies through your partner onboarding link.'
                        : 'e.g. All documents verified according to Furora compliance standards.'
                    }
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {feedbackAction === 'REQUEST_CHANGES' && (
                    <p className="text-[10px] text-orange-600 mt-1">
                      This feedback will be presented to the vendor partner when they visit the onboarding landing page or attempt to log in to re-submit their files.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewingVendor(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      feedbackAction === 'APPROVE'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : feedbackAction === 'REQUEST_CHANGES'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {reviewSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm {feedbackAction === 'APPROVE' ? 'Approval' : feedbackAction === 'REQUEST_CHANGES' ? 'Feedback' : 'Rejection'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Categories Modal */}
      {assigningVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Assign Pet Categories
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {assigningVendor.name} ({assigningVendor.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningVendor(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignedCategories} className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {assignError}
                </div>
              )}
              {assignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  {assignSuccess}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select which pet categories this vendor is permitted to list pets under. The vendor will only see and be able to add pets in the selected categories.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Available Categories ({allCategories.length})
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCategories(allCategories.map((c) => c.id))}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Checkboxes List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {allCategories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  const activeBreeds = cat.breeds?.filter((b: any) => b.active) || [];

                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategories((prev) =>
                          isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border text-white text-[10px] ${
                            isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{cat.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {activeBreeds.length} active {activeBreeds.length === 1 ? 'breed' : 'breeds'}
                          </p>
                        </div>
                      </div>

                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Assigned</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Assignment Summary
                </span>
                <p className="text-slate-700 text-[11px]">
                  <strong>{assigningVendor.name}</strong> will be authorized to add pets under{' '}
                  <strong className="text-emerald-700">{selectedCategories.length}</strong> of{' '}
                  <strong>{allCategories.length}</strong> categories
                  {selectedCategories.length > 0 && (
                    <span>
                      : {allCategories.filter((c) => selectedCategories.includes(c.id)).map((c) => c.name).join(', ')}
                    </span>
                  )}
                  .
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningVendor(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {assignSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Assigned Categories</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Onboard Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Direct Vendor Onboarding (Admin)</h3>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDirectOnboard} className="p-5 overflow-y-auto space-y-4">
              {onboardError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {onboardError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Kennel / Breeder Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Paws Kennel & Breeding Facility"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Contact Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. partner@royalpaws.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Facility Location / City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Whitefield, Bangalore"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Google Maps Pin Link (Primary Facility)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=... or https://maps.app.goo.gl/..."
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="col-span-2 text-[10px] font-bold uppercase text-slate-500">
                  Optional Secondary / Alternative Facility Location
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Alt Facility Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Branch 2, Pune"
                    value={formData.secondaryAddress}
                    onChange={(e) => setFormData({ ...formData, secondaryAddress: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Alt Maps Pin Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.secondaryMapUrl}
                    onChange={(e) => setFormData({ ...formData, secondaryMapUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Kennel Club / AWBI Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KCI-KEN-2024-9982"
                  value={formData.kennelRegNumber}
                  onChange={(e) => setFormData({ ...formData, kennelRegNumber: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              {/* 5 Compliance Docs */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 block">5 Compliance Accreditation Documents *</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ⚡ Secure Encrypted Storage
                  </span>
                </div>

                <FileUploadField
                  label="1. Kennel Club / AWBI Registration Certificate"
                  description="Official registration certificate or accreditation paper"
                  value={formData.kennelRegDoc}
                  onChange={(url) => setFormData((prev) => ({ ...prev, kennelRegDoc: url }))}
                  folder="compliance/kennel"
                  required={true}
                  badge="Accreditation"
                />

                <FileUploadField
                  label="2. Breeder Government ID (Aadhaar / PAN)"
                  description="Identity proof of proprietor"
                  value={formData.govIdDoc}
                  onChange={(url) => setFormData((prev) => ({ ...prev, govIdDoc: url }))}
                  folder="compliance/govid"
                  required={true}
                  badge="Identity Proof"
                />

                <FileUploadField
                  label="3. Municipal / AWBI Trade License"
                  description="Valid municipal trade license or local authority permit"
                  value={formData.tradeLicenseDoc}
                  onChange={(url) => setFormData((prev) => ({ ...prev, tradeLicenseDoc: url }))}
                  folder="compliance/license"
                  required={true}
                  badge="Trade Permit"
                />

                <FileUploadField
                  label="4. Registered Vet Clinic Tie-up / MoU"
                  description="Signed medical affiliation letter or retainer MOU with a licensed vet"
                  value={formData.vetAffiliationDoc}
                  onChange={(url) => setFormData((prev) => ({ ...prev, vetAffiliationDoc: url }))}
                  folder="compliance/vet"
                  required={true}
                  badge="Veterinary"
                />

                <FileUploadField
                  label="5. Bank Proof / Canceled Cheque"
                  description="Canceled cheque or bank statement showing account number and IFSC"
                  value={formData.bankDetailsDoc}
                  onChange={(url) => setFormData((prev) => ({ ...prev, bankDetailsDoc: url }))}
                  folder="compliance/bank"
                  required={true}
                  badge="Bank Settlement"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {onboardSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Onboard & Approve Partner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VENDOR PETS INSPECT MODAL */}
      {inspectingVendorPets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Pets Listed by {inspectingVendorPets.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Vendor ID: {inspectingVendorPets.id} • {vendorPetsList.length} Pet{vendorPetsList.length === 1 ? '' : 's'} Registered
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVendorPets(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {vendorPetsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                  <span>Loading vendor pets...</span>
                </div>
              ) : vendorPetsError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {vendorPetsError}
                </div>
              ) : vendorPetsList.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Pets Registered Yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      This vendor partner has not listed any pets yet under their assigned categories.
                    </p>
                  </div>
                </div>
              ) : (
                vendorPetsList.map((pet) => (
                  <div
                    key={pet.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {pet.photos && pet.photos.length > 0 ? (
                          <img
                            src={pet.photos[0]}
                            alt={pet.petId}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <Layers className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {pet.petId}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {pet.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800">
                            {pet.category?.name} • {pet.breed?.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {pet.sex} • {pet.colour} • Age: <strong className="text-slate-800 font-semibold">{pet.age}</strong>
                          </p>
                        </div>
                      </div>

                      {pet.microchipNumber && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Microchip</span>
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {pet.microchipNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {(pet.fatherName || pet.motherName) && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Sire (Father): <strong className="text-slate-800">{pet.fatherName || 'Not recorded'}</strong></span>
                        <span>Dam (Mother): <strong className="text-slate-800">{pet.motherName || 'Not recorded'}</strong></span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Link
                        href={`/pets/${pet.petId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <span>Customer Page</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </Link>
                      <Link
                        href={`/admin/categories?vendor=${inspectingVendorPets.id}&q=${encodeURIComponent(inspectingVendorPets.name)}`}
                        onClick={() => setInspectingVendorPets(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-2xs"
                      >
                        <span>Manage in Category Inventory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Showing pets listed under vendor consignment
              </span>
              <button
                type="button"
                onClick={() => setInspectingVendorPets(null)}
                className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLIANCE DOCUMENTS INSTANT INSPECTION DRAWER / MODAL */}
      {inspectingVendorDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Compliance & Accreditation Documents
                    </h3>
                    {getStatusBadge(inspectingVendorDocs.onboardingStatus)}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Kennel: <strong className="text-slate-800">{inspectingVendorDocs.name}</strong> • ID: {inspectingVendorDocs.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVendorDocs(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Compliance Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Accreditation Status Overview
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-extrabold text-slate-900">
                      {[
                        inspectingVendorDocs.kennelRegDoc,
                        inspectingVendorDocs.govIdDoc,
                        inspectingVendorDocs.tradeLicenseDoc,
                        inspectingVendorDocs.vetAffiliationDoc,
                        inspectingVendorDocs.bankDetailsDoc,
                      ].filter(Boolean).length}{' '}
                      of 5 Documents Uploaded
                    </span>
                    {[
                      inspectingVendorDocs.kennelRegDoc,
                      inspectingVendorDocs.govIdDoc,
                      inspectingVendorDocs.tradeLicenseDoc,
                      inspectingVendorDocs.vetAffiliationDoc,
                      inspectingVendorDocs.bankDetailsDoc,
                    ].every(Boolean) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fully Compliant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Pending Uploads
                      </span>
                    )}
                  </div>
                  {inspectingVendorDocs.kennelRegNumber && (
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      Kennel Registration #: <strong className="text-slate-800">{inspectingVendorDocs.kennelRegNumber}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectingVendorDocs;
                      setInspectingVendorDocs(null);
                      openReviewModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Verification & Review Flow</span>
                  </button>
                </div>
              </div>

              {/* 5 Accreditation Documents List */}
              <div className="space-y-2.5">
                {[
                  {
                    title: '1. Kennel Club / AWBI Registration Certificate',
                    shortTitle: 'Kennel Club / AWBI Certificate',
                    badge: 'Accreditation',
                    url: inspectingVendorDocs.kennelRegDoc,
                    desc: 'Official certification from Kennel Club of India (KCI) or Animal Welfare Board of India (AWBI).',
                    meta: inspectingVendorDocs.kennelRegNumber ? `Reg #${inspectingVendorDocs.kennelRegNumber}` : undefined,
                  },
                  {
                    title: '2. Breeder Govt Identity Proof (Aadhaar / PAN)',
                    shortTitle: 'Breeder Govt Identity Proof',
                    badge: 'Identity Proof',
                    url: inspectingVendorDocs.govIdDoc,
                    desc: 'Official government photo identification of the breeder proprietor for KYC verification.',
                  },
                  {
                    title: '3. Municipal / AWBI Trade License',
                    shortTitle: 'Municipal / AWBI Trade License',
                    badge: 'Trade Permit',
                    url: inspectingVendorDocs.tradeLicenseDoc,
                    desc: 'Municipal establishment license and local authority pet breeding/retail permit.',
                  },
                  {
                    title: '4. Registered Vet Clinic Tie-up / Healthcare MoU',
                    shortTitle: 'Veterinary Hospital Tie-up / MoU',
                    badge: 'Veterinary MoU',
                    url: inspectingVendorDocs.vetAffiliationDoc,
                    desc: 'Formal contract guaranteeing regular veterinary medical checkups and vaccination protocol.',
                  },
                  {
                    title: '5. Bank Account Proof / Canceled Cheque',
                    shortTitle: 'Bank Account Payout Proof',
                    badge: 'Bank Settlement',
                    url: inspectingVendorDocs.bankDetailsDoc,
                    desc: 'Bank account verification or canceled cheque for settlement of order payouts.',
                  },
                ].map((doc, idx) => {
                  const hasDoc = Boolean(doc.url);
                  const isDocPdf = hasDoc && isPdfDocument(doc.url);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        hasDoc
                          ? 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                          : 'border-dashed border-amber-200 bg-amber-50/20'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{doc.title}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {doc.badge}
                          </span>
                          {hasDoc && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                              {isDocPdf ? 'PDF' : 'IMAGE'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{doc.desc}</p>
                        {doc.meta && (
                          <span className="inline-block text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {doc.meta}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                        {hasDoc ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingDocument({ title: doc.title, url: doc.url })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                              title="Inspect document preview in full viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Document</span>
                            </button>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition border border-slate-200"
                              title="Open file in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Not Uploaded Yet</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Admins can inspect breeder compliance documents anytime without modifying onboarding status.
              </span>
              <button
                type="button"
                onClick={() => setInspectingVendorDocs(null)}
                className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DOCUMENT VIEWER MODAL */}
      {viewingDocument && (() => {
        const currentDocIsPdf =
          viewModeOverride === 'pdf'
            ? true
            : viewModeOverride === 'image'
            ? false
            : isPdfDocument(viewingDocument.url);

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-700">
              {/* Viewer Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-100 truncate max-w-sm sm:max-w-md">
                        {viewingDocument.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                        {currentDocIsPdf ? 'PDF Document' : 'Image Preview'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                      {viewingDocument.url || 'No URL provided'}
                    </p>
                  </div>
                </div>

                {/* Header Actions / Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Zoom controls for Image */}
                  {!currentDocIsPdf && viewingDocument.url && !docImageError && (
                    <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700 mr-1">
                      <button
                        type="button"
                        onClick={() => setDocZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                        className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocZoom(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className="px-2 h-7 rounded-lg hover:bg-slate-700 text-[11px] font-mono text-slate-300 hover:text-white flex items-center justify-center transition"
                        title="Reset Zoom (100%)"
                      >
                        {Math.round(docZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocZoom((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))))}
                        className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocZoom(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                        title="Reset Position"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Fallback / View Mode toggle */}
                  {viewingDocument.url && (
                    <button
                      type="button"
                      onClick={() => setViewModeOverride((prev) => (prev === 'pdf' ? 'image' : 'pdf'))}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition hidden sm:inline-block"
                      title="Toggle between PDF iframe and Image viewer"
                    >
                      {currentDocIsPdf ? 'Switch to Image' : 'Switch to PDF'}
                    </button>
                  )}

                  {/* Download button */}
                  {viewingDocument.url && (
                    <a
                      href={viewingDocument.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition"
                      title="Download Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  )}

                  {/* Open external button */}
                  {viewingDocument.url && (
                    <a
                      href={viewingDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setViewingDocument(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 flex items-center justify-center border border-slate-700 hover:border-rose-700 transition"
                    title="Close viewer (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Content Area */}
              <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center">
                {!viewingDocument.url || viewingDocument.url.trim() === '' || viewingDocument.url === '#' ? (
                  /* Safe Fallback: Empty URL */
                  <div className="p-8 text-center max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <FileWarning className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">No Document File Uploaded</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        This compliance document does not have an attached file URL or is waiting for partner submission.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingDocument(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                    >
                      Close Viewer
                    </button>
                  </div>
                ) : currentDocIsPdf ? (
                  /* PDF Viewer via clean full-height iframe */
                  <div className="w-full h-full bg-slate-900 relative">
                    <iframe
                      src={viewingDocument.url}
                      className="w-full h-full border-0 bg-white"
                      title={viewingDocument.title}
                    />
                  </div>
                ) : docImageError ? (
                  /* Safe Fallback: Image failed to render */
                  <div className="p-8 text-center max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <FileWarning className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Preview Cannot Be Rendered as Image</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        The file may be a formatted PDF, private S3 object, or unsupported format. You can try viewing it as a PDF or opening it directly in a new tab.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setViewModeOverride('pdf')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        Switch to PDF View
                      </button>
                      <a
                        href={viewingDocument.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Interactive Image Viewer with Zoom & Pan */
                  <div
                    className={`w-full h-full overflow-hidden flex items-center justify-center select-none ${
                      docZoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                    }`}
                    onMouseDown={(e) => {
                      if (docZoom > 1) {
                        setIsPanning(true);
                        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isPanning && docZoom > 1) {
                        setPanOffset({
                          x: e.clientX - dragStart.x,
                          y: e.clientY - dragStart.y,
                        });
                      }
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                  >
                    {docImageLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs z-10 bg-slate-950/60">
                        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                        <span>Loading document preview...</span>
                      </div>
                    )}
                    <img
                      src={viewingDocument.url}
                      alt={viewingDocument.title}
                      onLoad={() => setDocImageLoading(false)}
                      onError={() => {
                        setDocImageLoading(false);
                        setDocImageError(true);
                      }}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${docZoom})`,
                        transformOrigin: 'center center',
                        transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                      }}
                      className="max-h-[80vh] max-w-full object-contain pointer-events-auto rounded shadow-2xl"
                      draggable={false}
                    />
                  </div>
                )}
              </div>

              {/* Viewer Footer */}
              <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">Esc</kbd> to close viewer
                  {!currentDocIsPdf && docZoom > 1 && ' • Drag to pan zoomed image'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingDocument(null)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <VendorsContent />
    </Suspense>
  );
}
