'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Filter,
  ArrowRightLeft,
  ShieldAlert,
  CheckCircle,
  Clock,
  X,
  Search,
  Eye,
  Edit3,
  Award,
  RefreshCw,
  ExternalLink,
  Calendar,
  Heart,
  ShieldCheck,
  Tag,
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  QrCode,
  Upload,
  Image as ImageIcon,
  FileText,
  Loader2,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { calculateAge } from '@/lib/age-calculator';
import { compressImageClientSide } from '@/lib/client-image-compressor';
import PetMediaUpload from '@/components/media/PetMediaUpload';
import LineageProvenanceUpload from '@/components/media/LineageProvenanceUpload';
import KciDocumentsUpload from '@/components/media/KciDocumentsUpload';

// All 11 statuses defined in PRD §4.3 & System Flow
const ALL_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'ASSIGNED_TO_ORDER',
  'PICKUP_PENDING',
  'IN_TRANSIT',
  'MEDICAL_PENDING',
  'MEDICAL_APPROVED',
  'MEDICAL_FAILED',
  'DELIVERED',
  'RETURNED',
  'UNAVAILABLE',
] as const;

type PetStatusType = (typeof ALL_STATUSES)[number];

// Valid state transitions from state-machine.ts
const VALID_PET_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['RESERVED', 'ASSIGNED_TO_ORDER', 'UNAVAILABLE'],
  RESERVED: ['AVAILABLE', 'ASSIGNED_TO_ORDER', 'UNAVAILABLE'],
  ASSIGNED_TO_ORDER: ['PICKUP_PENDING', 'AVAILABLE'],
  PICKUP_PENDING: ['IN_TRANSIT', 'RETURNED', 'AVAILABLE'],
  IN_TRANSIT: ['MEDICAL_PENDING', 'RETURNED'],
  MEDICAL_PENDING: ['MEDICAL_APPROVED', 'MEDICAL_FAILED'],
  MEDICAL_APPROVED: ['DELIVERED', 'RETURNED'],
  MEDICAL_FAILED: ['RETURNED', 'AVAILABLE', 'UNAVAILABLE'],
  DELIVERED: [],
  RETURNED: ['AVAILABLE', 'UNAVAILABLE'],
  UNAVAILABLE: ['AVAILABLE'],
};

export default function AdminInventoryPage() {
  const { currentUser } = useSession();
  const [pets, setPets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'AVAILABLE' | 'ORDERS' | 'MEDICAL' | 'DELIVERED' | 'RETURNED'>('ALL');

  // Modals state
  const [viewingPet, setViewingPet] = useState<any | null>(null);
  const [transitioningPet, setTransitioningPet] = useState<any | null>(null);
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>('');
  const [adminOverride, setAdminOverride] = useState(false);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);

  const [editingPet, setEditingPet] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    colour: '',
    microchipNumber: '',
    sex: 'Male',
    dob: '2026-01-01',
    otherDetails: '',
    photoUrl: '',
    fatherName: '',
    fatherPhoto: '',
    motherName: '',
    motherPhoto: '',
    kciRegistered: false,
    kciDocUrl: '',
    categoryId: '',
    breedId: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  // Edit Pet modal direct Cloudflare R2 upload state
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const [editPhotoProgress, setEditPhotoProgress] = useState('');
  const [editPhotoError, setEditPhotoError] = useState('');
  const editPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingEditKci, setIsUploadingEditKci] = useState(false);
  const [editKciProgress, setEditKciProgress] = useState('');
  const [editKciError, setEditKciError] = useState('');
  const editKciInputRef = useRef<HTMLInputElement | null>(null);

  const [transferringPet, setTransferringPet] = useState<any | null>(null);
  const [targetOwner, setTargetOwner] = useState<'FURORA' | 'VENDOR'>('FURORA');
  const [targetVendorId, setTargetVendorId] = useState('usr_vendor_1');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const [creatingPet, setCreatingPet] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newBreedId, setNewBreedId] = useState('');
  const [newDob, setNewDob] = useState('2026-06-15');
  const [newSex, setNewSex] = useState('Male');
  const [newColour, setNewColour] = useState('Golden');
  const [newMicrochipNumber, setNewMicrochipNumber] = useState('');
  const [newOtherDetails, setNewOtherDetails] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [newVideos, setNewVideos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newOwner, setNewOwner] = useState<'FURORA' | 'VENDOR'>('FURORA');
  const [newVendorId, setNewVendorId] = useState('usr_vendor_1');
  const [newFatherName, setNewFatherName] = useState('');
  const [newFatherPhoto, setNewFatherPhoto] = useState('');
  const [newFatherDocs, setNewFatherDocs] = useState<string[]>([]);
  const [newMotherName, setNewMotherName] = useState('');
  const [newMotherPhoto, setNewMotherPhoto] = useState('');
  const [newMotherDocs, setNewMotherDocs] = useState<string[]>([]);
  const [newKci, setNewKci] = useState(false);
  const [newKciDocs, setNewKciDocs] = useState<string[]>([]);
  const [newKciDocUrl, setNewKciDocUrl] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Check URL query parameters for category and breed filter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      const breedParam = params.get('breed');
      if (catParam) setCategoryFilter(catParam);
      if (breedParam) setBreedFilter(breedParam);
    }
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let url = '/api/pets?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (ownerFilter) url += `inventoryOwner=${encodeURIComponent(ownerFilter)}&`;
      if (categoryFilter) url += `categoryId=${encodeURIComponent(categoryFilter)}&`;
      if (breedFilter) url += `breedId=${encodeURIComponent(breedFilter)}&`;

      const [petsRes, catRes] = await Promise.all([
        fetch(url),
        fetch('/api/categories'),
      ]);

      const petsData = await petsRes.json();
      const catData = await catRes.json();

      if (petsData.success) {
        setPets(petsData.data);
      }
      if (catData.success) {
        setCategories(catData.data);
        if (catData.data.length > 0) {
          if (!newCatId) {
            setNewCatId(catData.data[0].id);
            const firstBreeds = catData.data[0].breeds?.filter((b: any) => b.active) || [];
            if (firstBreeds.length > 0) {
              setNewBreedId(firstBreeds[0].id);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, ownerFilter, categoryFilter, breedFilter]);

  // Derived available breeds for the active filter category
  const breedsForCategoryFilter = useMemo(() => {
    if (!categoryFilter) {
      return categories.flatMap((c) => c.breeds || []);
    }
    const cat = categories.find((c) => c.id === categoryFilter);
    return cat?.breeds || [];
  }, [categories, categoryFilter]);

  // Derived breeds for creating a pet
  const breedsForNewPet = useMemo(() => {
    const cat = categories.find((c) => c.id === newCatId);
    return (cat?.breeds || []).filter((b: any) => b.active);
  }, [categories, newCatId]);

  // Derived breeds for editing a pet
  const breedsForEditPet = useMemo(() => {
    const cat = categories.find((c) => c.id === editForm.categoryId);
    return cat?.breeds || [];
  }, [categories, editForm.categoryId]);

  const handleCatChange = (catId: string) => {
    setNewCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    const activeBreeds = (cat?.breeds || []).filter((b: any) => b.active);
    if (activeBreeds.length > 0) {
      setNewBreedId(activeBreeds[0].id);
    } else {
      setNewBreedId('');
    }
  };

  const openAddPetModal = () => {
    // If a category tab is actively selected, default to that category
    const targetCatId = categoryFilter || (categories[0]?.id || '');
    if (targetCatId) {
      setNewCatId(targetCatId);
      const cat = categories.find((c) => c.id === targetCatId);
      const activeBreeds = (cat?.breeds || []).filter((b: any) => b.active);
      if (activeBreeds.length > 0) {
        setNewBreedId(activeBreeds[0].id);
      }
    }
    setCreatingPet(true);
  };

  // Filtered Pets matching Client-Side Search & Quick Filter
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      // Quick filter tabs
      if (quickFilter === 'AVAILABLE' && pet.status !== 'AVAILABLE') return false;
      if (quickFilter === 'ORDERS' && !['RESERVED', 'ASSIGNED_TO_ORDER', 'PICKUP_PENDING', 'IN_TRANSIT'].includes(pet.status)) return false;
      if (quickFilter === 'MEDICAL' && !['MEDICAL_PENDING', 'MEDICAL_APPROVED', 'MEDICAL_FAILED'].includes(pet.status)) return false;
      if (quickFilter === 'DELIVERED' && pet.status !== 'DELIVERED') return false;
      if (quickFilter === 'RETURNED' && !['RETURNED', 'UNAVAILABLE'].includes(pet.status)) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = pet.petId?.toLowerCase().includes(q);
        const matchesBreed = pet.breed?.name?.toLowerCase().includes(q);
        const matchesCategory = pet.category?.name?.toLowerCase().includes(q);
        const matchesColour = pet.colour?.toLowerCase().includes(q);
        const matchesFather = pet.fatherName?.toLowerCase().includes(q);
        const matchesMother = pet.motherName?.toLowerCase().includes(q);
        const matchesOrder = pet.order?.orderId?.toLowerCase().includes(q);
        const matchesVendor = pet.vendor?.name?.toLowerCase().includes(q);
        if (!matchesId && !matchesBreed && !matchesCategory && !matchesColour && !matchesFather && !matchesMother && !matchesOrder && !matchesVendor) {
          return false;
        }
      }
      return true;
    });
  }, [pets, quickFilter, searchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = pets.length;
    const available = pets.filter((p) => p.status === 'AVAILABLE').length;
    const inWorkflow = pets.filter((p) =>
      ['RESERVED', 'ASSIGNED_TO_ORDER', 'PICKUP_PENDING', 'IN_TRANSIT'].includes(p.status)
    ).length;
    const medical = pets.filter((p) =>
      ['MEDICAL_PENDING', 'MEDICAL_APPROVED', 'MEDICAL_FAILED'].includes(p.status)
    ).length;
    const delivered = pets.filter((p) => p.status === 'DELIVERED').length;
    return { total, available, inWorkflow, medical, delivered };
  }, [pets]);

  // Open State Machine Modal
  const openTransitionModal = (pet: any) => {
    setTransitioningPet(pet);
    const validNext = VALID_PET_TRANSITIONS[pet.status] || [];
    setSelectedNextStatus(validNext[0] || (pet.status === 'DELIVERED' ? 'AVAILABLE' : 'AVAILABLE'));
    setAdminOverride(false);
    setTransitionReason('');
  };

  // Execute State Machine Transition
  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitioningPet || !selectedNextStatus) return;
    if (!transitionReason.trim()) {
      alert('Please provide an operational audit reason for this status change.');
      return;
    }

    setTransitionSubmitting(true);
    try {
      const res = await fetch(`/api/pets/${transitioningPet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedNextStatus,
          reason: transitionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transition pet status');

      setTransitioningPet(null);
      if (viewingPet && viewingPet.id === transitioningPet.id) {
        setViewingPet({ ...viewingPet, status: selectedNextStatus });
      }
      await loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitionSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (pet: any) => {
    setEditingPet(pet);
    setEditPhotoError('');
    setEditPhotoProgress('');
    setEditKciError('');
    setEditKciProgress('');
    const dobString = pet.dob ? new Date(pet.dob).toISOString().split('T')[0] : '2026-01-01';
    let photoUrl = '';
    if (Array.isArray(pet.photos) && pet.photos.length > 0) {
      photoUrl = pet.photos[0];
    }
    let kciDoc = '';
    if (Array.isArray(pet.kciDocuments) && pet.kciDocuments.length > 0) {
      kciDoc = pet.kciDocuments[0];
    }

    setEditForm({
      colour: pet.colour || '',
      microchipNumber: pet.microchipNumber || '',
      sex: pet.sex || 'Male',
      dob: dobString,
      otherDetails: pet.otherDetails || '',
      photoUrl,
      fatherName: pet.fatherName || '',
      fatherPhoto: pet.fatherPhoto || '',
      motherName: pet.motherName || '',
      motherPhoto: pet.motherPhoto || '',
      kciRegistered: Boolean(pet.kciRegistered),
      kciDocUrl: kciDoc,
      categoryId: pet.categoryId || (pet.category?.id || ''),
      breedId: pet.breedId || (pet.breed?.id || ''),
    });
  };

  // Direct file uploads for Edit Pet modal streaming to Cloudflare R2 (/api/upload)
  const handleEditPhotoUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingEditPhoto(true);
    setEditPhotoError('');
    setEditPhotoProgress('Compressing image...');

    try {
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          uploadFile = await compressImageClientSide(file, 1600, 1600, 0.82);
        } catch (compErr) {
          console.warn('Client-side compression fallback:', compErr);
        }
      }

      setEditPhotoProgress('Uploading to Cloudflare R2...');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', 'pets');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo to Cloudflare R2');
      }

      setEditForm((prev) => ({ ...prev, photoUrl: data.url }));
    } catch (err: any) {
      console.error('Edit photo upload error:', err);
      setEditPhotoError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingEditPhoto(false);
      setEditPhotoProgress('');
      if (editPhotoInputRef.current) {
        editPhotoInputRef.current.value = '';
      }
    }
  };

  const handleEditKciUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingEditKci(true);
    setEditKciError('');
    setEditKciProgress('Uploading certificate to R2...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'pets/kci');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document to Cloudflare R2');
      }

      setEditForm((prev) => ({ ...prev, kciDocUrl: data.url }));
    } catch (err: any) {
      console.error('Edit KCI document upload error:', err);
      setEditKciError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingEditKci(false);
      setEditKciProgress('');
      if (editKciInputRef.current) {
        editKciInputRef.current.value = '';
      }
    }
  };

  // Submit Edit Modal
  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    setEditSubmitting(true);
    try {
      const photosArray = editForm.photoUrl
        ? [
            editForm.photoUrl,
            ...(Array.isArray(editingPet?.photos)
              ? editingPet.photos.filter((p: string) => p && p !== editForm.photoUrl && p !== editingPet.photos[0])
              : []),
          ]
        : [];
      const kciDocsArray = editForm.kciDocUrl
        ? [
            editForm.kciDocUrl,
            ...(Array.isArray(editingPet?.kciDocuments)
              ? editingPet.kciDocuments.filter((d: string) => d && d !== editForm.kciDocUrl && d !== editingPet.kciDocuments[0])
              : []),
          ]
        : [];

      const res = await fetch(`/api/pets/${editingPet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colour: editForm.colour,
          microchipNumber: editForm.microchipNumber.trim().toUpperCase() || null,
          sex: editForm.sex,
          dob: editForm.dob,
          otherDetails: editForm.otherDetails,
          photos: photosArray,
          fatherName: editForm.fatherName,
          fatherPhoto: editForm.fatherPhoto,
          motherName: editForm.motherName,
          motherPhoto: editForm.motherPhoto,
          kciRegistered: editForm.kciRegistered,
          kciDocuments: kciDocsArray,
          categoryId: editForm.categoryId,
          breedId: editForm.breedId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pet profile');

      setEditingPet(null);
      if (viewingPet && viewingPet.id === editingPet.id) {
        setViewingPet({
          ...viewingPet,
          ...data.data,
          photos: photosArray,
        });
      }
      await loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit Create Pet
  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId || !newBreedId) {
      alert('Please select category and breed');
      return;
    }

    setCreateSubmitting(true);
    try {
      const photosArray = newPhotos.length > 0 ? newPhotos : (newPhotoUrl ? [newPhotoUrl] : []);
      const kciDocsArray = newKciDocs.length > 0 ? newKciDocs : (newKci && newKciDocUrl ? [newKciDocUrl] : []);

      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newCatId,
          breedId: newBreedId,
          dob: newDob,
          sex: newSex,
          colour: newColour,
          microchipNumber: newMicrochipNumber.trim().toUpperCase() || null,
          otherDetails: newOtherDetails || undefined,
          inventoryOwner: newOwner,
          vendorId: newOwner === 'VENDOR' ? newVendorId : null,
          fatherName: newFatherName || null,
          fatherPhoto: newFatherPhoto || null,
          fatherDocs: newFatherDocs,
          motherName: newMotherName || null,
          motherPhoto: newMotherPhoto || null,
          motherDocs: newMotherDocs,
          kciRegistered: newKci,
          kciDocuments: kciDocsArray,
          photos: photosArray,
          videos: newVideos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pet');

      setCreatingPet(false);
      await loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Submit Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPet) return;
    if (!transferReason.trim()) {
      alert('Please provide a reason for the ownership transfer.');
      return;
    }

    setTransferSubmitting(true);
    try {
      const res = await fetch(`/api/pets/${transferringPet.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetOwner,
          targetVendorId: targetOwner === 'VENDOR' ? targetVendorId : null,
          reason: transferReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer pet');

      setTransferringPet(null);
      setTransferReason('');
      if (viewingPet && viewingPet.id === transferringPet.id) {
        setViewingPet({
          ...viewingPet,
          inventoryOwner: targetOwner,
          vendorId: targetOwner === 'VENDOR' ? targetVendorId : null,
        });
      }
      await loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Access check
  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Access Restricted (Admin Only)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Managing root pet inventory and state machines requires Admin privileges.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-soft"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Status Badge UI component
  const getStatusBadge = (status: string) => {
    const config: Record<string, { dot: string; text: string; bg: string }> = {
      AVAILABLE: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      RESERVED: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      ASSIGNED_TO_ORDER: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      PICKUP_PENDING: { dot: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
      IN_TRANSIT: { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
      MEDICAL_PENDING: { dot: 'bg-amber-400', text: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
      MEDICAL_APPROVED: { dot: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
      MEDICAL_FAILED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
      DELIVERED: { dot: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300' },
      RETURNED: { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
      UNAVAILABLE: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100 border-slate-300' },
    };

    const cfg = config[status] || { dot: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`}></span>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getPetAgeDisplay = (dob: string | Date) => {
    if (!dob) return '—';
    try {
      const age = calculateAge(dob);
      return age.formatted;
    } catch {
      return '—';
    }
  };

  const activeFilterCount = [categoryFilter, breedFilter, statusFilter, ownerFilter, searchQuery].filter(Boolean).length;
  const selectedCategory = categories.find((c) => c.id === categoryFilter);

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-8">
      {/* Compact Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Title & Module Tag */}
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Pet Inventory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pet inventory management, ownership allocation, and lifecycle tracking.
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={openAddPetModal}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{selectedCategory ? `+ Add Pet to ${selectedCategory.name}` : '+ Add Pet Profile'}</span>
          </button>
        </div>
      </div>

      {/* Primary Category Filter Bar — Prominent Species Tabs */}
      <div className="card-clean p-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setCategoryFilter('');
            setBreedFilter('');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            !categoryFilter
              ? 'bg-slate-900 text-white shadow-soft font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>All Pets</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              !categoryFilter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {pets.length}
          </span>
        </button>

        {categories.map((cat) => {
          const isSelected = categoryFilter === cat.id;
          const catPetCount = pets.filter((p) => p.categoryId === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                setBreedFilter('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-soft font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {catPetCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Filter: Breeds under Selected Category (1-click filtering) */}
      {selectedCategory && breedsForCategoryFilter.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
            {selectedCategory.name} Breeds:
          </span>
          <button
            onClick={() => setBreedFilter('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              !breedFilter
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All {selectedCategory.name} ({pets.filter((p) => p.categoryId === selectedCategory.id).length})
          </button>
          {breedsForCategoryFilter.map((b: any) => {
            const count = pets.filter((p) => p.breedId === b.id).length;
            const isSelected = breedFilter === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBreedFilter(b.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{b.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact Single-Card Filter & Search Toolbar */}
      <div className="card-clean p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Quick Status Filter Pills */}
        <div className="flex items-center flex-wrap gap-1 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All', count: stats.total },
            { id: 'AVAILABLE', label: 'Available', count: stats.available },
            { id: 'ORDERS', label: 'In Orders', count: stats.inWorkflow },
            { id: 'MEDICAL', label: 'Medical', count: stats.medical },
            { id: 'DELIVERED', label: 'Delivered', count: stats.delivered },
            { id: 'RETURNED', label: 'Returned', count: pets.filter(p => ['RETURNED', 'UNAVAILABLE'].includes(p.status)).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-full text-xs transition flex items-center space-x-1.5 ${
                quickFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                quickFilter === tab.id ? 'bg-slate-700 text-slate-100' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Dropdowns & Search */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search pets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900/10 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="">All Ownerships</option>
            <option value="FURORA">Furora HQ</option>
            <option value="VENDOR">Vendor</option>
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setBreedFilter('');
                setStatusFilter('');
                setOwnerFilter('');
                setQuickFilter('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 px-1.5 py-1 rounded-lg hover:bg-rose-50 transition"
              title="Reset all filters"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Pet Inventory & State Machine Table — 100% Width, Zero Horizontal Scroll */}
      <div className="card-clean overflow-hidden">
        <table className="w-full divide-y divide-slate-100 text-xs table-auto">
          <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Pet ID</th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap">Breed</th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap">Details</th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap">Ownership</th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap">Lineage</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading pet inventory...
                </td>
              </tr>
            ) : filteredPets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No pets found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredPets.map((pet) => {
                const ageDisplay = getPetAgeDisplay(pet.dob);
                const hasKci = Boolean(pet.kciRegistered);
                const hasSire = Boolean(pet.fatherName);
                const hasDam = Boolean(pet.motherName);

                return (
                  <tr key={pet.id} className="hover:bg-slate-50/70 transition group">
                    {/* Pet ID */}
                    <td className="px-3.5 py-2 whitespace-nowrap font-medium">
                      <div className="flex items-center space-x-2">
                        {pet.photos && pet.photos.length > 0 ? (
                          <img
                            src={pet.photos[0]}
                            alt={pet.petId}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            🐾
                          </div>
                        )}
                        <div>
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition block text-xs">
                            {pet.petId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Breed & Category */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-xs">
                        {pet.breed?.name || 'Standard'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {pet.category?.name}
                      </span>
                    </td>

                    {/* Details: Sex, Age, Colour */}
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          pet.sex === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {pet.sex === 'Male' ? '♂ M' : '♀ F'}
                        </span>
                        <span className="text-xs">{ageDisplay}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {pet.colour}
                      </div>
                    </td>

                    {/* Ownership */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {pet.inventoryOwner === 'FURORA' ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                          Furora HQ
                        </span>
                      ) : (
                        <div className="max-w-[150px] truncate" title={pet.vendor?.name || 'Vendor Kennel'}>
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 truncate">
                            {pet.vendor?.name || 'Vendor Kennel'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status with Color Dot */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(pet.status)}
                    </td>

                    {/* Lineage & KCI */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {hasKci ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200" title="KCI Registered">
                            KCI
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Non-KCI</span>
                        )}
                        {(hasSire || hasDam) && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600" title={`Sire: ${pet.fatherName || '—'}, Dam: ${pet.motherName || '—'}`}>
                            P
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* State Transition Button */}
                        <button
                          onClick={() => openTransitionModal(pet)}
                          className="px-2 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-bold text-[11px] flex items-center space-x-1 shadow-xs"
                          title="Execute State Machine Lifecycle Transition"
                        >
                          <span>Update</span>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setViewingPet(pet)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => openEditModal(pet)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Transfer Ownership */}
                        <button
                          onClick={() => {
                            setTransferringPet(pet);
                            setTargetOwner(pet.inventoryOwner === 'FURORA' ? 'VENDOR' : 'FURORA');
                          }}
                          className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                          title="Move Ownership"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
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

      {/* ========================================================= */}
      {/* MODAL 1: State Machine Transition & Admin Override Modal */}
      {/* ========================================================= */}
      {transitioningPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h3 className="text-base font-extrabold text-slate-900">Lifecycle State Machine</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pet <span className="font-mono font-bold text-slate-800">{transitioningPet.petId}</span> ({transitioningPet.breed?.name})
                </p>
              </div>
              <button
                onClick={() => setTransitioningPet(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current State Indicator */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                <div className="mt-1">{getStatusBadge(transitioningPet.status)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ownership</span>
                <span className="text-xs font-bold text-slate-700 mt-1 block">
                  {transitioningPet.inventoryOwner === 'FURORA' ? 'Furora HQ' : 'Vendor Facility'}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteTransition} className="space-y-4 text-xs">
              {/* Permitted Transitions / Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700">Target State Transition</label>
                  {/* Admin Override Toggle */}
                  <label className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminOverride}
                      onChange={(e) => setAdminOverride(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Admin Override</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(adminOverride
                    ? ALL_STATUSES.filter((s) => s !== transitioningPet.status)
                    : VALID_PET_TRANSITIONS[transitioningPet.status] || []
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedNextStatus(st)}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                        selectedNextStatus === st
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{st.replace(/_/g, ' ')}</span>
                      {selectedNextStatus === st && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>

                {!adminOverride && (VALID_PET_TRANSITIONS[transitioningPet.status]?.length || 0) === 0 && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    No normal state transitions available from {transitioningPet.status}. Enable Admin Override if manual intervention is needed.
                  </p>
                )}
              </div>

              {/* Operational Audit Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Operational Audit Reason * (Logged permanently)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared quarantine medical check; or Assigned to live customer order"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransitioningPet(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitionSubmitting || !selectedNextStatus}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
                >
                  {transitionSubmitting ? 'Transitioning...' : 'Execute Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: View Pet Profile Details                         */}
      {/* ========================================================= */}
      {viewingPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-lg text-slate-900">{viewingPet.petId}</span>
                  {getStatusBadge(viewingPet.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingPet.category?.name} • {viewingPet.breed?.name}
                </p>
              </div>
              <button
                onClick={() => setViewingPet(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos gallery */}
            {viewingPet.photos && viewingPet.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {viewingPet.photos.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`${viewingPet.petId}-${idx}`}
                    className="w-full h-40 rounded-2xl object-cover border border-slate-100"
                  />
                ))}
              </div>
            )}

            {/* Core specs */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Sex</span>
                <span className="font-bold text-slate-800">{viewingPet.sex}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Age / DOB</span>
                <span className="font-bold text-slate-800">{getPetAgeDisplay(viewingPet.dob)}</span>
                <span className="text-[10px] text-slate-400 block">{new Date(viewingPet.dob).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Colour</span>
                <span className="font-bold text-slate-800">{viewingPet.colour}</span>
              </div>
            </div>

            {/* Ownership */}
            <div className="text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Inventory Ownership</span>
                <span className="font-bold text-slate-800">
                  {viewingPet.inventoryOwner === 'FURORA'
                    ? 'Furora HQ (Central Kennel Facility)'
                    : `Vendor: ${viewingPet.vendor?.name || 'Vendor Kennel'}`}
                </span>
              </div>
              <button
                onClick={() => {
                  const pet = viewingPet;
                  setViewingPet(null);
                  setTransferringPet(pet);
                  setTargetOwner(pet.inventoryOwner === 'FURORA' ? 'VENDOR' : 'FURORA');
                }}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
              >
                Transfer →
              </button>
            </div>

            {/* Lineage */}
            <div className="text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Lineage & Pedigree</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Sire (Father):</span>
                  <p className="font-bold text-slate-800">{viewingPet.fatherName || 'Not recorded'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Dam (Mother):</span>
                  <p className="font-bold text-slate-800">{viewingPet.motherName || 'Not recorded'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="font-semibold text-slate-700">KCI Registered:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  viewingPet.kciRegistered ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {viewingPet.kciRegistered ? 'YES (Certified)' : 'NO'}
                </span>
              </div>
              {viewingPet.microchipNumber && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Microchip ID:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                    {viewingPet.microchipNumber}
                  </span>
                </div>
              )}
            </div>

            {viewingPet.otherDetails && (
              <div className="text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Additional Notes</span>
                <p className="text-slate-700 font-medium">{viewingPet.otherDetails}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingPet(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = viewingPet;
                  setViewingPet(null);
                  openEditModal(p);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Edit Pet Details Modal                           */}
      {/* ========================================================= */}
      {editingPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Pet Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono font-bold">{editingPet.petId}</p>
              </div>
              <button
                onClick={() => setEditingPet(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => {
                      const newCId = e.target.value;
                      const cat = categories.find((c) => c.id === newCId);
                      const bList = cat?.breeds || [];
                      setEditForm({
                        ...editForm,
                        categoryId: newCId,
                        breedId: bList[0]?.id || '',
                      });
                    }}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Breed</label>
                  <select
                    value={editForm.breedId}
                    onChange={(e) => setEditForm({ ...editForm, breedId: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                  >
                    {breedsForEditPet.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DOB</label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sex</label>
                  <select
                    value={editForm.sex}
                    onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Colour</label>
                  <input
                    type="text"
                    value={editForm.colour}
                    onChange={(e) => setEditForm({ ...editForm, colour: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Pet Photo Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pet Photo</span>
                  </label>
                  {editForm.photoUrl && (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> Direct R2 Hosted
                    </span>
                  )}
                </div>

                <input
                  ref={editPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleEditPhotoUpload(file);
                  }}
                />

                {editForm.photoUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editForm.photoUrl}
                        alt="Pet Preview"
                        className="w-full h-full object-cover"
                      />
                      {isUploadingEditPhoto && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {editForm.photoUrl.split('/').pop() || 'photo.webp'}
                      </p>
                      <a
                        href={editForm.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                      >
                        <span>View full photo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {isUploadingEditPhoto && (
                        <p className="text-[10px] text-blue-600 font-semibold animate-pulse mt-0.5">
                          {editPhotoProgress || 'Uploading to Cloudflare R2...'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isUploadingEditPhoto}
                        onClick={() => editPhotoInputRef.current?.click()}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition shadow-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingEditPhoto}
                        onClick={() => setEditForm((prev) => ({ ...prev, photoUrl: '' }))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploadingEditPhoto && editPhotoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleEditPhotoUpload(file);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                      isUploadingEditPhoto
                        ? 'border-blue-300 bg-blue-50/50 cursor-wait'
                        : 'border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30'
                    }`}
                  >
                    {isUploadingEditPhoto ? (
                      <div className="flex flex-col items-center justify-center py-2 space-y-2">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <p className="text-xs font-bold text-blue-600">
                          {editPhotoProgress || 'Uploading to Cloudflare R2...'}
                        </p>
                        <div className="w-36 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 py-1">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Click to upload photo or drag & drop
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Streams directly to Cloudflare R2 (/pets) • Auto-compressed
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {editPhotoError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{editPhotoError}</span>
                  </p>
                )}
              </div>

              {/* Parents */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Parent Details (Sire & Dam)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Father Name (Sire)</label>
                    <input
                      type="text"
                      value={editForm.fatherName}
                      onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                      className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mother Name (Dam)</label>
                    <input
                      type="text"
                      value={editForm.motherName}
                      onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                      className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* KCI Pedigree */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.kciRegistered}
                    onChange={(e) => setEditForm({ ...editForm, kciRegistered: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>KCI Registered Pedigree Certification</span>
                </label>

                <input
                  ref={editKciInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleEditKciUpload(file);
                  }}
                />

                {editForm.kciRegistered && (
                  <div className="pt-1">
                    {editForm.kciDocUrl ? (
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {editForm.kciDocUrl.split('/').pop() || 'kci-certificate'}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                Cloudflare R2
                              </span>
                            </div>
                            <a
                              href={editForm.kciDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                            >
                              <span>View Certificate Document</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0 ml-2">
                          <button
                            type="button"
                            disabled={isUploadingEditKci}
                            onClick={() => editKciInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700 transition disabled:opacity-50"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            disabled={isUploadingEditKci}
                            onClick={() => setEditForm((prev) => ({ ...prev, kciDocUrl: '' }))}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                            title="Remove document"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          disabled={isUploadingEditKci}
                          onClick={() => editKciInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 transition disabled:opacity-50 cursor-pointer"
                        >
                          {isUploadingEditKci ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span>{editKciProgress || 'Uploading certificate to R2...'}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-blue-600" />
                              <span>Upload KCI Certificate (PDF / Image)</span>
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">
                          Streams document directly to Cloudflare R2 (/pets/kci)
                        </p>
                      </div>
                    )}

                    {editKciError && (
                      <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{editKciError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Microchip Number / RFID Tag</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">15-digit ISO or Tag</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 953010002134567"
                  value={editForm.microchipNumber}
                  onChange={(e) => setEditForm({ ...editForm, microchipNumber: e.target.value.toUpperCase() })}
                  className="w-full border rounded-xl p-2 bg-slate-50 font-mono text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Distinguishing Markings & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Markings, traits, temperament, notes..."
                  value={editForm.otherDetails}
                  onChange={(e) => setEditForm({ ...editForm, otherDetails: e.target.value })}
                  className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Transfer Ownership Modal                         */}
      {/* ========================================================= */}
      {transferringPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Move Inventory Ownership</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pet <span className="font-mono font-bold text-blue-600">{transferringPet.petId}</span> will be updated with audit logging.
                </p>
              </div>
              <button
                onClick={() => setTransferringPet(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Facility</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {transferringPet.inventoryOwner === 'FURORA'
                  ? 'Furora HQ Central Kennel'
                  : `${transferringPet.vendor?.name || 'Vendor Kennel Facility'}`}
              </p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Owner</label>
                <select
                  value={targetOwner}
                  onChange={(e) => setTargetOwner(e.target.value as any)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium focus:bg-white"
                >
                  <option value="FURORA">Furora HQ Owned</option>
                  <option value="VENDOR">Vendor Kennel Owned</option>
                </select>
              </div>

              {targetOwner === 'VENDOR' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Vendor Facility</label>
                  <select
                    value={targetVendorId}
                    onChange={(e) => setTargetVendorId(e.target.value)}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium focus:bg-white"
                  >
                    <option value="usr_vendor_1">Pet World Breeders (Pune Facility)</option>
                    <option value="usr_vendor_2">Furry Friends Kennel (Bangalore Facility)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Move (Audit Log) *</label>
                <input
                  type="text"
                  placeholder="e.g. Contract buyout to Furora HQ or consignee kennel return"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferringPet(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  {transferSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: Create Pet Profile Modal (Module B Compliance)   */}
      {/* ========================================================= */}
      {creatingPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {categoryFilter && selectedCategory ? `Add Pet to ${selectedCategory.name}` : 'Add New Pet Profile'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sequential ID (`FUR-PET-######`) will be auto-generated with initial status `AVAILABLE`.
                </p>
              </div>
              <button
                onClick={() => setCreatingPet(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category (Species) *</label>
                  <select
                    value={newCatId}
                    onChange={(e) => handleCatChange(e.target.value)}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Breed (Active Only) *</label>
                  <select
                    value={newBreedId}
                    onChange={(e) => setNewBreedId(e.target.value)}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {breedsForNewPet.length === 0 ? (
                      <option value="">No active breeds available</option>
                    ) : (
                      breedsForNewPet.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DOB *</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    required
                  />
                  <span className="text-[10px] text-blue-600 font-semibold block mt-1">
                    Age: {getPetAgeDisplay(newDob)}
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sex *</label>
                  <select
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value)}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Colour *</label>
                  <input
                    type="text"
                    value={newColour}
                    onChange={(e) => setNewColour(e.target.value)}
                    className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Media Upload */}
              <div className="pt-2 border-t border-slate-100">
                <PetMediaUpload
                  photos={newPhotos.length > 0 ? newPhotos : (newPhotoUrl ? [newPhotoUrl] : [])}
                  videos={newVideos}
                  onPhotosChange={setNewPhotos}
                  onVideosChange={setNewVideos}
                  folder="pets"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Inventory Owner</label>
                  <select
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value as any)}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium"
                  >
                    <option value="FURORA">Furora HQ Owned</option>
                    <option value="VENDOR">Vendor Kennel Owned</option>
                  </select>
                </div>
                {newOwner === 'VENDOR' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vendor Facility</label>
                    <select
                      value={newVendorId}
                      onChange={(e) => setNewVendorId(e.target.value)}
                      className="w-full border rounded-xl p-2.5 bg-slate-50 font-medium"
                    >
                      <option value="usr_vendor_1">Pet World Breeders (Pune)</option>
                      <option value="usr_vendor_2">Furry Friends Kennel (Bangalore)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Lineage */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Parent Details (Sire & Dam)
                </span>
                <LineageProvenanceUpload
                  fatherName={newFatherName}
                  fatherPhoto={newFatherPhoto}
                  fatherDocs={newFatherDocs}
                  motherName={newMotherName}
                  motherPhoto={newMotherPhoto}
                  motherDocs={newMotherDocs}
                  onChange={(updates) => {
                    if (updates.fatherName !== undefined) setNewFatherName(updates.fatherName);
                    if (updates.fatherPhoto !== undefined) setNewFatherPhoto(updates.fatherPhoto);
                    if (updates.fatherDocs !== undefined) setNewFatherDocs(Array.isArray(updates.fatherDocs) ? updates.fatherDocs : []);
                    if (updates.motherName !== undefined) setNewMotherName(updates.motherName);
                    if (updates.motherPhoto !== undefined) setNewMotherPhoto(updates.motherPhoto);
                    if (updates.motherDocs !== undefined) setNewMotherDocs(Array.isArray(updates.motherDocs) ? updates.motherDocs : []);
                  }}
                />
              </div>

              {/* KCI Pedigree */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newKci}
                    onChange={(e) => setNewKci(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>KCI Registered Pedigree</span>
                </label>
                {newKci && (
                  <KciDocumentsUpload
                    documents={newKciDocs}
                    onChange={setNewKciDocs}
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Microchip Number / RFID Tag</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">15-digit ISO or Tag</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 953010002134567"
                  value={newMicrochipNumber}
                  onChange={(e) => setNewMicrochipNumber(e.target.value.toUpperCase())}
                  className="w-full border rounded-xl p-2 bg-slate-50 font-mono text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Distinguishing Markings & Special Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. First dose Parvovirus vaccination administered, distinct white chest patch."
                  value={newOtherDetails}
                  onChange={(e) => setNewOtherDetails(e.target.value)}
                  className="w-full border rounded-xl p-2 bg-slate-50 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingPet(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-xs"
                >
                  {createSubmitting ? 'Creating...' : 'Create Pet Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
