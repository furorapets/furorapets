'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  QrCode,
  ExternalLink,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  Award,
  Calendar,
  Heart,
  FileText,
  Search,
  ArrowRightLeft,
  CheckCircle,
  Filter,
  RefreshCw,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { calculateAge } from '@/lib/age-calculator';
import PetMediaUpload from '@/components/media/PetMediaUpload';
import LineageProvenanceUpload from '@/components/media/LineageProvenanceUpload';
import KciDocumentsUpload from '@/components/media/KciDocumentsUpload';

// All 11 statuses defined in PRD §4.3 & System Flow
const ALL_PET_STATUSES = [
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

const AVAILABLE_VENDORS = [
  { id: 'usr_vendor_1', name: 'Pet World Breeders', location: 'Pune Facility' },
  { id: 'usr_vendor_2', name: 'Furry Friends Kennel', location: 'Bangalore Facility' },
];

const getPetStatusBadge = (status: string) => {
  if (status === 'AVAILABLE' || status === 'DELIVERED' || status === 'MEDICAL_APPROVED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-xs bg-emerald-50 text-emerald-700 border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 flex-shrink-0"></span>
        {status ? status.replace(/_/g, ' ') : 'Available'}
      </span>
    );
  }

  if (status === 'MEDICAL_FAILED' || status === 'RETURNED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap shadow-xs bg-rose-50 text-rose-700 border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 flex-shrink-0"></span>
        {status ? status.replace(/_/g, ' ') : 'Failed'}
      </span>
    );
  }

  if (status === 'RESERVED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap shadow-xs bg-amber-50 text-amber-700 border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 flex-shrink-0"></span>
        Reserved
      </span>
    );
  }

  if (status === 'IN_TRANSIT') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap shadow-xs bg-blue-50 text-blue-700 border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 flex-shrink-0"></span>
        In Transit
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap shadow-xs bg-slate-100 text-slate-700 border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 flex-shrink-0"></span>
      {status ? status.replace(/_/g, ' ') : 'Unavailable'}
    </span>
  );
};

function CategoriesContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const vendorParam = searchParams.get('vendor') || '';

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  // Vendor filter state when navigated from /admin/vendors
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>(vendorParam || '');
  const [vendorFilterName, setVendorFilterName] = useState<string>(queryParam || '');

  // Expanded Breeds (which breeds show their individual pets)
  const [expandedBreedIds, setExpandedBreedIds] = useState<string[]>([]);
  const [petsByBreed, setPetsByBreed] = useState<Record<string, any[]>>({});
  const [loadingPetsBreedId, setLoadingPetsBreedId] = useState<string | null>(null);

  // Modals: Add Category
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Modals: Add Breed
  const [creatingBreed, setCreatingBreed] = useState(false);
  const [newBreedCatId, setNewBreedCatId] = useState('');
  const [newBreedName, setNewBreedName] = useState('');
  const [breedSubmitting, setBreedSubmitting] = useState(false);

  // Modals: Add / Edit Pet Profile
  const [creatingPet, setCreatingPet] = useState(false);
  const [editingPet, setEditingPet] = useState<any | null>(null);
  const [petFormSubmitting, setPetFormSubmitting] = useState(false);
  const [petFormData, setPetFormData] = useState({
    categoryId: '',
    breedId: '',
    dob: '2026-06-01',
    sex: 'Male',
    colour: 'Standard',
    microchipNumber: '',
    otherDetails: '',
    photos: [] as string[],
    videos: [] as string[],
    fatherName: '',
    fatherPhoto: '',
    fatherVideo: '',
    fatherDocs: [] as string[],
    motherName: '',
    motherPhoto: '',
    motherVideo: '',
    motherDocs: [] as string[],
    kciRegistered: false,
    kciDocuments: [] as string[],
    inventoryOwner: 'FURORA',
    vendorId: 'usr_vendor_1',
    status: 'AVAILABLE',
  });

  // Filters for Module C: Inventory Management
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'FURORA' | 'VENDOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [petSearchQuery, setPetSearchQuery] = useState('');

  // Modals: Move Inventory Ownership (Module C)
  const [transferringPet, setTransferringPet] = useState<any | null>(null);
  const [targetOwner, setTargetOwner] = useState<'FURORA' | 'VENDOR'>('FURORA');
  const [targetVendorId, setTargetVendorId] = useState('usr_vendor_1');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Modals: Update Pet Status Lifecycle (Module C)
  const [statusPet, setStatusPet] = useState<any | null>(null);
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>('');
  const [adminStatusOverride, setAdminStatusOverride] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Modals: QR Code Viewer
  const [viewingQrPet, setViewingQrPet] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals: 2-Factor Deletion (Category, Breed, or Pet Profile)
  const [deletingItem, setDeletingItem] = useState<{
    type: 'category' | 'breed' | 'pet';
    id: string;
    name: string;
    breedId?: string;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Inline Breed Editing
  const [editingBreedId, setEditingBreedId] = useState<string | null>(null);
  const [editingBreedName, setEditingBreedName] = useState('');

  // Category Renaming
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryUpdating, setCategoryUpdating] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        const cats = data.data || [];
        setCategories(cats);
        setSelectedCatId((curr) => {
          if (curr && cats.some((c: any) => c.id === curr)) return curr;
          return cats[0]?.id || '';
        });
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function initializeCategories() {
      try {
        setLoading(true);
        const res = await fetch('/api/categories');
        const data = await res.json();
        const cats = data.data || [];
        if (isCancelled) return;
        setCategories(cats);

        let targetCatId = '';
        let targetBreedId = '';

        // Check if filtering by vendor (from /admin/vendors)
        if (vendorParam) {
          setSelectedVendorFilter(vendorParam);
          setOwnerFilter('VENDOR');
          if (queryParam) setVendorFilterName(queryParam);

          try {
            const petRes = await fetch(`/api/pets?vendorId=${encodeURIComponent(vendorParam)}`);
            const petData = await petRes.json();
            if (petData.success && petData.data && petData.data.length > 0) {
              const matchedPet = petData.data[0];
              if (matchedPet.category?.id || matchedPet.categoryId) {
                targetCatId = matchedPet.category?.id || matchedPet.categoryId;
              }
              if (matchedPet.breed?.id || matchedPet.breedId) {
                targetBreedId = matchedPet.breed?.id || matchedPet.breedId;
              }
              if (matchedPet.vendor?.name) {
                setVendorFilterName(matchedPet.vendor.name);
              }
            }
          } catch (e) {
            console.error('Failed to locate vendor pets', e);
          }
        } else if (queryParam) {
          setPetSearchQuery(queryParam);
          try {
            const petRes = await fetch(`/api/pets?q=${encodeURIComponent(queryParam)}`);
            const petData = await petRes.json();
            if (petData.success && petData.data && petData.data.length > 0) {
              const matchedPet = petData.data[0];
              if (matchedPet.category?.id || matchedPet.categoryId) {
                targetCatId = matchedPet.category?.id || matchedPet.categoryId;
              }
              if (matchedPet.breed?.id || matchedPet.breedId) {
                targetBreedId = matchedPet.breed?.id || matchedPet.breedId;
              }
            }
          } catch (e) {
            console.error('Failed to locate query pets', e);
          }
        }

        if (isCancelled) return;

        if (targetCatId) {
          setSelectedCatId(targetCatId);
        } else if (cats.length > 0) {
          setSelectedCatId((curr) => curr || cats[0].id);
        }

        if (targetBreedId) {
          setExpandedBreedIds((prev) => Array.from(new Set([...prev, targetBreedId])));
          fetchPetsForBreed(targetBreedId);
        } else if (typeof window !== 'undefined' && window.location.search.includes('expand=')) {
          const params = new URLSearchParams(window.location.search);
          const expandId = params.get('expand');
          if (expandId) {
            setExpandedBreedIds([expandId]);
            fetchPetsForBreed(expandId);
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    initializeCategories();

    return () => {
      isCancelled = true;
    };
  }, [queryParam, vendorParam]);

  // Escape key listener for all modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreatingCategory(false);
        setCreatingBreed(false);
        setCreatingPet(false);
        setEditingPet(null);
        setViewingQrPet(null);
        setDeletingItem(null);
        setEditingCategory(false);
        setEditingBreedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch pets for a specific breed
  const fetchPetsForBreed = async (breedId: string) => {
    setLoadingPetsBreedId(breedId);
    try {
      const res = await fetch(`/api/pets?breedId=${breedId}`);
      if (res.ok) {
        const data = await res.json();
        setPetsByBreed((prev) => ({
          ...prev,
          [breedId]: data.data || [],
        }));
      }
    } catch (err) {
      console.error('Failed to load pets for breed', err);
    } finally {
      setLoadingPetsBreedId(null);
    }
  };

  // Toggle expanding a breed's pets list
  const toggleExpandBreed = async (breedId: string) => {
    if (expandedBreedIds.includes(breedId)) {
      setExpandedBreedIds((prev) => prev.filter((id) => id !== breedId));
    } else {
      setExpandedBreedIds((prev) => [...prev, breedId]);
      if (!petsByBreed[breedId]) {
        await fetchPetsForBreed(breedId);
      }
    }
  };

  const currentCategory = categories.find((c) => c.id === selectedCatId) || categories[0];

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategorySubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewCategoryName('');
        setCreatingCategory(false);
        await loadData();
        if (data.data?.id) setSelectedCatId(data.data.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create category');
      }
    } catch (err) {
      alert('Error creating category');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleSaveCategoryName = async () => {
    if (!editCategoryName.trim() || !currentCategory) return;
    setCategoryUpdating(true);
    try {
      const res = await fetch(`/api/categories/${currentCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      if (res.ok) {
        setEditingCategory(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update category name');
      }
    } catch (err) {
      alert('Error updating category');
    } finally {
      setCategoryUpdating(false);
    }
  };

  // Breed Actions
  const handleCreateBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreedName.trim() || !newBreedCatId) return;
    setBreedSubmitting(true);
    try {
      const res = await fetch('/api/breeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newBreedCatId,
          name: newBreedName.trim(),
          active: true,
        }),
      });
      if (res.ok) {
        setNewBreedName('');
        setCreatingBreed(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create breed');
      }
    } catch (err) {
      alert('Error creating breed');
    } finally {
      setBreedSubmitting(false);
    }
  };

  const toggleBreedActive = async (breed: any) => {
    try {
      const res = await fetch(`/api/breeds/${breed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !breed.active }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to toggle breed status');
      }
    } catch (err) {
      alert('Error updating breed');
    }
  };

  const handleSaveBreedName = async (breedId: string) => {
    if (!editingBreedName.trim()) return;
    try {
      const res = await fetch(`/api/breeds/${breedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingBreedName.trim() }),
      });
      if (res.ok) {
        setEditingBreedId(null);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update breed name');
      }
    } catch (err) {
      alert('Error updating breed');
    }
  };

  // Pet Profile Actions
  const openAddPetModal = (breedId: string, categoryId: string) => {
    setEditingPet(null);
    setPetFormData({
      categoryId: categoryId || currentCategory?.id || '',
      breedId: breedId || '',
      dob: new Date().toISOString().split('T')[0],
      sex: 'Male',
      colour: 'Standard',
      microchipNumber: '',
      otherDetails: '',
      photos: [],
      videos: [],
      fatherName: '',
      fatherPhoto: '',
      fatherVideo: '',
      fatherDocs: [],
      motherName: '',
      motherPhoto: '',
      motherVideo: '',
      motherDocs: [],
      kciRegistered: false,
      kciDocuments: [],
      inventoryOwner: 'FURORA',
      vendorId: 'usr_vendor_1',
      status: 'AVAILABLE',
    });
    setCreatingPet(true);
  };

  const openEditPetModal = (pet: any) => {
    setEditingPet(pet);
    const safeParse = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return val.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      return [];
    };

    setPetFormData({
      categoryId: pet.categoryId,
      breedId: pet.breedId,
      dob: new Date(pet.dob).toISOString().split('T')[0],
      sex: pet.sex || 'Male',
      colour: pet.colour || '',
      microchipNumber: pet.microchipNumber || '',
      otherDetails: pet.otherDetails || '',
      photos: safeParse(pet.photos),
      videos: safeParse(pet.videos),
      fatherName: pet.fatherName || '',
      fatherPhoto: pet.fatherPhoto || '',
      fatherVideo: pet.fatherVideo || '',
      fatherDocs: safeParse(pet.fatherDocs),
      motherName: pet.motherName || '',
      motherPhoto: pet.motherPhoto || '',
      motherVideo: pet.motherVideo || '',
      motherDocs: safeParse(pet.motherDocs),
      kciRegistered: Boolean(pet.kciRegistered),
      kciDocuments: safeParse(pet.kciDocuments),
      inventoryOwner: pet.inventoryOwner || 'FURORA',
      vendorId: pet.vendorId || 'usr_vendor_1',
      status: pet.status || 'AVAILABLE',
    });
    setCreatingPet(true);
  };

  // Module C: Transfer Inventory Ownership Actions
  const openTransferModal = (pet: any) => {
    setTransferringPet(pet);
    setTargetOwner(pet.inventoryOwner === 'FURORA' ? 'VENDOR' : 'FURORA');
    setTargetVendorId(pet.vendorId || 'usr_vendor_1');
    setTransferReason('');
    setTransferError(null);
  };

  const handleTransferInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPet) return;
    setTransferSubmitting(true);
    setTransferError(null);

    try {
      const res = await fetch(`/api/pets/${transferringPet.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetOwner,
          targetVendorId: targetOwner === 'VENDOR' ? targetVendorId : null,
          reason: transferReason.trim() || 'Admin moved inventory ownership',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchPetsForBreed(transferringPet.breedId);
        await loadData();
        setTransferringPet(null);
      } else {
        setTransferError(data.error || 'Failed to move inventory ownership');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Error transferring inventory');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Module C: Pet Status Transition Actions
  const openStatusModal = (pet: any) => {
    setStatusPet(pet);
    const validNext = VALID_PET_TRANSITIONS[pet.status] || [];
    setSelectedNextStatus(validNext[0] || pet.status);
    setAdminStatusOverride(false);
    setStatusReason('');
    setStatusError(null);
  };

  const handleTransitionStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusPet || !selectedNextStatus) return;
    setStatusSubmitting(true);
    setStatusError(null);

    try {
      const res = await fetch(`/api/pets/${statusPet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedNextStatus,
          reason: statusReason.trim() || 'Admin updated pet status',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchPetsForBreed(statusPet.breedId);
        setStatusPet(null);
      } else {
        setStatusError(data.error || 'Failed to update pet status');
      }
    } catch (err: any) {
      setStatusError(err.message || 'Error updating pet status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const openQrModal = async (p: any) => {
    setViewingQrPet(p);
    setCopiedLink(false);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`/api/pets/${p.id}?baseUrl=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (data.success && data.data?.qrCodeUrl) {
        setQrCodeDataUrl(data.data.qrCodeUrl);
      }
    } catch (e) {
      console.error('Error fetching QR data', e);
    }
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petFormData.categoryId || !petFormData.breedId || !petFormData.dob) {
      alert('Please fill in required fields: Category, Breed, and DOB.');
      return;
    }

    setPetFormSubmitting(true);
    try {
      const payload = {
        categoryId: petFormData.categoryId,
        breedId: petFormData.breedId,
        dob: petFormData.dob,
        sex: petFormData.sex,
        colour: petFormData.colour.trim(),
        microchipNumber: petFormData.microchipNumber.trim().toUpperCase() || null,
        otherDetails: petFormData.otherDetails.trim() || null,
        photos: petFormData.photos,
        videos: petFormData.videos,
        fatherName: petFormData.fatherName.trim() || null,
        fatherPhoto: petFormData.fatherPhoto.trim() || null,
        fatherVideo: petFormData.fatherVideo.trim() || null,
        fatherDocs: petFormData.fatherDocs,
        motherName: petFormData.motherName.trim() || null,
        motherPhoto: petFormData.motherPhoto.trim() || null,
        motherVideo: petFormData.motherVideo.trim() || null,
        motherDocs: petFormData.motherDocs,
        kciRegistered: petFormData.kciRegistered,
        kciDocuments: petFormData.kciDocuments,
        inventoryOwner: petFormData.inventoryOwner,
        vendorId: petFormData.inventoryOwner === 'VENDOR' ? petFormData.vendorId || 'usr_vendor_1' : null,
        status: petFormData.status,
      };

      const isEdit = Boolean(editingPet);
      const url = isEdit ? `/api/pets/${editingPet.id}` : '/api/pets';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatingPet(false);
        setEditingPet(null);
        await loadData();
        await fetchPetsForBreed(petFormData.breedId);
        if (!expandedBreedIds.includes(petFormData.breedId)) {
          setExpandedBreedIds((prev) => [...prev, petFormData.breedId]);
        }
        if (!isEdit && data.data) {
          openQrModal(data.data);
        }
      } else {
        alert(data.error || 'Failed to save pet profile');
      }
    } catch (err) {
      alert('Error saving pet profile');
    } finally {
      setPetFormSubmitting(false);
    }
  };

  // 2-Factor Deletion
  const handleExecuteDelete = async () => {
    if (!deletingItem) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      let endpoint = '';
      if (deletingItem.type === 'category') endpoint = `/api/categories/${deletingItem.id}`;
      else if (deletingItem.type === 'breed') endpoint = `/api/breeds/${deletingItem.id}`;
      else if (deletingItem.type === 'pet') endpoint = `/api/pets/${deletingItem.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        if (deletingItem.type === 'category') {
          const remaining = categories.filter((c) => c.id !== deletingItem.id);
          if (remaining.length > 0) setSelectedCatId(remaining[0].id);
        }
        if (deletingItem.type === 'pet' && deletingItem.breedId) {
          await fetchPetsForBreed(deletingItem.breedId);
        }
        setDeletingItem(null);
        setDeleteConfirmText('');
        await loadData();
      } else {
        setDeleteError(data.error || 'Failed to delete item');
      }
    } catch (err) {
      setDeleteError('An unexpected error occurred while deleting');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeDataUrl || !viewingQrPet) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QR-${viewingQrPet.petId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyCustomerLink = () => {
    if (!viewingQrPet) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://breeder.furora.in';
    const link = `${origin}/pets/${viewingQrPet.petId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Category & Pet Inventory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              {categories.length} Categories
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage categories, breeds, individual pet profiles, and customer verification records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreatingCategory(true)}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewBreedCatId(currentCategory?.id || categories[0]?.id || '');
              setCreatingBreed(true);
            }}
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition gap-1.5 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Breed</span>
          </button>
        </div>
      </div>

      {/* Active Vendor Filter Banner */}
      {selectedVendorFilter && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">
                Viewing Consignment Pets from Vendor: <span className="underline decoration-blue-400 font-extrabold">{vendorFilterName || selectedVendorFilter}</span>
              </p>
              <p className="text-[11px] text-blue-700">
                Displaying matching category and expanded breed inventory for this vendor partner.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedVendorFilter('');
              setOwnerFilter('ALL');
              setVendorFilterName('');
            }}
            className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition shadow-2xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {loading ? (
          <div className="text-xs text-slate-400 py-2">Loading categories...</div>
        ) : (
          categories.map((cat) => {
            const isSelected = cat.id === currentCategory?.id;
            const breedCount = cat.breeds?.length || 0;
            const totalPets = cat.breeds?.reduce((acc: number, b: any) => acc + (b._count?.pets || 0), 0) || 0;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {breedCount} {breedCount === 1 ? 'breed' : 'breeds'}
                  {totalPets > 0 && ` • ${totalPets} ${totalPets === 1 ? 'pet' : 'pets'}`}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Selected Category Card */}
      {currentCategory && (
        <div className="card-clean overflow-hidden">
          {/* Card Header with Category Title & Action */}
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {editingCategory ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategoryName();
                      if (e.key === 'Escape') setEditingCategory(false);
                    }}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={categoryUpdating || !editCategoryName.trim()}
                    onClick={handleSaveCategoryName}
                    className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Save Category Name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {currentCategory.name} Breeds
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({currentCategory.breeds?.length || 0} breeds)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(true);
                      setEditCategoryName(currentCategory.name);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Rename category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Ownership filter */}
              <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px]">
                <span className="text-slate-400 font-medium">Owner:</span>
                <select
                  value={ownerFilter}
                  onChange={(e: any) => setOwnerFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Owners</option>
                  <option value="FURORA">Furora HQ</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px]">
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses (11)</option>
                  {ALL_PET_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Pet Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pets..."
                  value={petSearchQuery}
                  onChange={(e) => setPetSearchQuery(e.target.value)}
                  className="w-28 sm:w-36 pl-6 pr-2 py-1 text-[11px] rounded-xl border border-slate-200 bg-white font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                {petSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPetSearchQuery('')}
                    className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeletingItem({ type: 'category', id: currentCategory.id, name: currentCategory.name });
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title={`Delete ${currentCategory.name} category`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breeds Table */}
          <table className="w-full divide-y divide-slate-100 text-xs table-auto">
            <thead className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Breed Name</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Pets in Stock</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!currentCategory.breeds || currentCategory.breeds.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-xs">
                    No breeds added yet. Click &ldquo;Add Breed&rdquo; above to add one.
                  </td>
                </tr>
              ) : (
                currentCategory.breeds.map((b: any) => {
                  const isEditing = editingBreedId === b.id;
                  const petCount = b._count?.pets || 0;
                  const isExpanded = expandedBreedIds.includes(b.id);
                  const breedPets = petsByBreed[b.id] || [];
                  const isLoadingPets = loadingPetsBreedId === b.id;

                  return (
                    <React.Fragment key={b.id}>
                      {/* Breed Row */}
                      <tr className="hover:bg-slate-50/60 transition group">
                        {/* Breed Name */}
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {isEditing ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={editingBreedName}
                                onChange={(e) => setEditingBreedName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveBreedName(b.id);
                                  if (e.key === 'Escape') setEditingBreedId(null);
                                }}
                                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveBreedName(b.id)}
                                className="p-1 text-emerald-600 hover:text-emerald-700 rounded-lg transition"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBreedId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleExpandBreed(b.id)}
                              className="flex items-center space-x-2 text-left group-hover:text-slate-900 transition"
                            >
                              <span className="text-slate-400 group-hover:text-slate-600 transition">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{b.name}</span>
                            </button>
                          )}
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => toggleBreedActive(b)}
                            title="Click to toggle Active / Inactive"
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                              b.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                                b.active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {b.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Pets Count / View Pets Button */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandBreed(b.id)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition space-x-1.5 ${
                              isExpanded
                                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                                : petCount > 0
                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60 hover:bg-blue-100'
                                : 'text-slate-400 bg-slate-100 font-medium hover:bg-slate-200'
                            }`}
                          >
                            <span>
                              {petCount} {petCount === 1 ? 'Pet' : 'Pets'}
                            </span>
                            <span className="text-[10px]">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </button>
                        </td>

                        {/* Breed Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => openAddPetModal(b.id, currentCategory.id)}
                              className="text-xs font-bold text-slate-900 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition flex items-center space-x-1"
                              title="Add individual pet profile to this breed"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Pet</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingBreedId(b.id);
                                setEditingBreedName(b.name);
                              }}
                              className="text-slate-600 hover:text-slate-900 font-semibold text-xs transition px-1 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleBreedActive(b)}
                              className={`text-xs font-semibold transition px-1 py-1 ${
                                b.active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                              }`}
                            >
                              {b.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingItem({ type: 'breed', id: b.id, name: b.name });
                                setDeleteConfirmText('');
                                setDeleteError(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Delete ${b.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-TABLE: Individual Pets belonging to this Breed */}
                      {isExpanded && (() => {
                        const allBreedPets = petsByBreed[b.id] || [];
                        const displayedPets = allBreedPets.filter((pet) => {
                          if (selectedVendorFilter && pet.vendorId !== selectedVendorFilter) return false;
                          if (ownerFilter !== 'ALL' && pet.inventoryOwner !== ownerFilter) return false;
                          if (statusFilter !== 'ALL' && pet.status !== statusFilter) return false;
                          if (petSearchQuery.trim()) {
                            const q = petSearchQuery.toLowerCase();
                            const matchId =
                              pet.petId?.toLowerCase().includes(q) ||
                              pet.microchipNumber?.toLowerCase().includes(q);
                            const matchColour = pet.colour?.toLowerCase().includes(q);
                            const matchSire = pet.fatherName?.toLowerCase().includes(q);
                            const matchDam = pet.motherName?.toLowerCase().includes(q);
                            const matchVendor = pet.vendor?.name?.toLowerCase().includes(q);
                            if (!matchId && !matchColour && !matchSire && !matchDam && !matchVendor) return false;
                          }
                          return true;
                        });

                        return (
                        <tr className="bg-slate-50/40">
                          <td colSpan={4} className="p-4 sm:p-5 border-y border-slate-100">
                            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs space-y-3">
                              {/* Sub-header */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                  <h3 className="text-xs font-bold text-slate-900">
                                    {b.name} Inventory ({displayedPets.length}
                                    {displayedPets.length !== allBreedPets.length
                                      ? ` matching of ${allBreedPets.length}`
                                      : ' individual'}{' '}
                                    pets)
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openAddPetModal(b.id, currentCategory.id)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-2xs space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add {b.name} Pet</span>
                                </button>
                              </div>

                              {/* Pets List */}
                              {isLoadingPets ? (
                                <div className="text-center py-6 text-xs text-slate-400">
                                  Loading individual pets...
                                </div>
                              ) : allBreedPets.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400 space-y-2">
                                  <p>No pets registered under {b.name} yet.</p>
                                  <button
                                    type="button"
                                    onClick={() => openAddPetModal(b.id, currentCategory.id)}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                  >
                                    Click here to register the first {b.name} pet profile & generate QR code &rarr;
                                  </button>
                                </div>
                              ) : displayedPets.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400 space-y-1">
                                  <p>No pets match the current owner or status filter.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOwnerFilter('ALL');
                                      setStatusFilter('ALL');
                                      setPetSearchQuery('');
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                  >
                                    Reset Filters &rarr;
                                  </button>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-slate-100">
                                        <th className="py-2 text-left">Pet ID</th>
                                        <th className="py-2 text-left">Dynamic Age & DOB</th>
                                        <th className="py-2 text-left">Sex & Colour</th>
                                        <th className="py-2 text-left">Lineage / KCI</th>
                                        <th className="py-2 text-left">Ownership</th>
                                        <th className="py-2 text-left">Status</th>
                                        <th className="py-2 text-center">Customer QR</th>
                                        <th className="py-2 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {displayedPets.map((pet) => {
                                        const ageInfo = calculateAge(pet.dob);
                                        return (
                                          <tr key={pet.id} className="hover:bg-slate-50/70 transition">
                                            {/* Pet ID */}
                                            <td className="py-2.5">
                                              <span className="font-mono font-bold text-slate-900 block leading-tight">
                                                {pet.petId}
                                              </span>
                                              {pet.microchipNumber && (
                                                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5" title="RFID Microchip">
                                                  <QrCode className="w-2.5 h-2.5 text-slate-400" />
                                                  <span>{pet.microchipNumber}</span>
                                                </span>
                                              )}
                                            </td>

                                            {/* Age & DOB */}
                                            <td className="py-2.5">
                                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                                                {ageInfo.formatted}
                                              </span>
                                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                                DOB: {new Date(pet.dob).toLocaleDateString()}
                                              </span>
                                            </td>

                                            {/* Sex & Colour */}
                                            <td className="py-2.5 text-slate-700">
                                              <span>{pet.sex}</span>
                                              <span className="text-slate-400"> • </span>
                                              <span>{pet.colour}</span>
                                            </td>

                                            {/* Lineage / KCI */}
                                            <td className="py-2.5">
                                              <span className="text-[10px] text-slate-600 block">
                                                {pet.fatherName ? `S: ${pet.fatherName}` : 'S: Unrecorded'}
                                              </span>
                                              {pet.kciRegistered && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  KCI Certified
                                                </span>
                                              )}
                                            </td>

                                            {/* Ownership (Module C) */}
                                            <td className="py-2.5">
                                              <div className="flex items-center space-x-1.5">
                                                {pet.inventoryOwner === 'FURORA' ? (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    <span>Furora HQ</span>
                                                  </span>
                                                ) : (
                                                  <Link
                                                    href={`/admin/vendors?q=${encodeURIComponent(pet.vendor?.name || '')}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition max-w-[160px]"
                                                    title={`Breeder Facility: ${pet.vendor?.name || 'Vendor Kennel'}`}
                                                  >
                                                    <Store className="w-3 h-3 text-indigo-500 shrink-0" />
                                                    <span className="truncate">{pet.vendor?.name || 'Vendor Kennel'}</span>
                                                  </Link>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => openTransferModal(pet)}
                                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                                  title="Move pet between Furora and Vendor inventory"
                                                >
                                                  <ArrowRightLeft className="w-2.5 h-2.5 text-slate-500" />
                                                  <span>Move</span>
                                                </button>
                                              </div>
                                            </td>

                                            {/* Pet Lifecycle Status (Module C) & Linked Order */}
                                            <td className="py-2.5">
                                              <div className="flex flex-col space-y-1">
                                                <button
                                                  type="button"
                                                  onClick={() => openStatusModal(pet)}
                                                  className="cursor-pointer group flex items-center space-x-1 text-left"
                                                  title="Click to transition pet status"
                                                >
                                                  {getPetStatusBadge(pet.status)}
                                                  <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                                                </button>

                                                {pet.order?.orderId && (
                                                  <Link
                                                    href={`/admin/orders?q=${pet.order.orderId}`}
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 w-fit transition shadow-2xs"
                                                    title="Click to inspect linked order in Orders & Dispatch"
                                                  >
                                                    <ShoppingBag className="w-2.5 h-2.5 text-purple-500" />
                                                    <span>{pet.order.orderId}</span>
                                                  </Link>
                                                )}
                                              </div>
                                            </td>

                                            {/* Customer QR */}
                                            <td className="py-2.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => openQrModal(pet)}
                                                className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition space-x-1"
                                                title="View customer QR code"
                                              >
                                                <QrCode className="w-3.5 h-3.5 text-slate-900" />
                                                <span className="font-bold text-[10px]">QR</span>
                                              </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 text-right">
                                              <div className="flex items-center justify-end space-x-1">
                                                {pet.status === 'AVAILABLE' && (
                                                  <Link
                                                    href={`/admin/orders?q=${pet.petId}`}
                                                    className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition"
                                                    title="Book / Create Order for this Pet"
                                                  >
                                                    <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                                                  </Link>
                                                )}
                                                <Link
                                                  href={`/pets/${pet.petId}`}
                                                  target="_blank"
                                                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                                                  title="Open public customer page"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                                <button
                                                  type="button"
                                                  onClick={() => openEditPetModal(pet)}
                                                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                                                  title="Edit pet profile & QR details"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setDeletingItem({
                                                      type: 'pet',
                                                      id: pet.id,
                                                      name: pet.petId,
                                                      breedId: b.id,
                                                    });
                                                    setDeleteConfirmText('');
                                                    setDeleteError(null);
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                  title="Delete pet profile"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State when no categories */}
      {!loading && categories.length === 0 && (
        <div className="card-clean p-12 text-center space-y-3">
          <p className="text-slate-700 text-sm font-bold">No categories configured yet</p>
          <p className="text-slate-400 text-xs">
            Click &ldquo;+ Add Category&rdquo; above to create your first category (such as Dogs, Cats, Birds).
          </p>
        </div>
      )}

      {/* MODAL: Add Category */}
      {creatingCategory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Category</h3>
              <button
                onClick={() => setCreatingCategory(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dogs, Cats, Birds, Fish"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingCategory(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting || !newCategoryName.trim()}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {categorySubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Breed */}
      {creatingBreed && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Breed</h3>
              <button
                onClick={() => setCreatingBreed(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBreed} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Category *
                </label>
                <select
                  value={newBreedCatId}
                  onChange={(e) => setNewBreedCatId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Breed Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. French Bulldog, Cockapoo"
                  value={newBreedName}
                  onChange={(e) => setNewBreedName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingBreed(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={breedSubmitting || !newBreedName.trim() || !newBreedCatId}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {breedSubmitting ? 'Creating...' : 'Save Breed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Pet Profile */}
      {creatingPet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPet ? `Edit Pet Profile (${editingPet.petId})` : 'Register New Pet Profile'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingPet
                    ? 'Modify pet details, photos, parentage, and update information hosted in customer QR.'
                    : 'Auto-generates sequential Pet ID (FUR-PET-######) and instant customer QR code.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatingPet(false);
                  setEditingPet(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePet} className="space-y-4">
              {/* SECTION: Basic Information */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  1. Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Category *
                    </label>
                    <select
                      value={petFormData.categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        const cat = categories.find((c) => c.id === newCatId);
                        const firstBreed = cat?.breeds?.find((b: any) => b.active)?.id || '';
                        setPetFormData({
                          ...petFormData,
                          categoryId: newCatId,
                          breedId: firstBreed,
                        });
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Breed * (Active Breeds)
                    </label>
                    <select
                      value={petFormData.breedId}
                      onChange={(e) => setPetFormData({ ...petFormData, breedId: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      {categories
                        .find((c) => c.id === petFormData.categoryId)
                        ?.breeds?.filter((b: any) => b.active)
                        .map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Date of Birth (DOB) *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        required
                        value={petFormData.dob}
                        onChange={(e) => setPetFormData({ ...petFormData, dob: e.target.value })}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] font-bold px-2.5 py-2 rounded-xl bg-blue-50 text-blue-700 whitespace-nowrap">
                        {calculateAge(petFormData.dob).formatted}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Sex *
                    </label>
                    <select
                      value={petFormData.sex}
                      onChange={(e) => setPetFormData({ ...petFormData, sex: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Colour *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Golden, Fawn, Blue, White"
                      value={petFormData.colour}
                      onChange={(e) => setPetFormData({ ...petFormData, colour: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Inventory Ownership
                    </label>
                    <select
                      value={petFormData.inventoryOwner}
                      onChange={(e) => setPetFormData({ ...petFormData, inventoryOwner: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="FURORA">Furora HQ</option>
                      <option value="VENDOR">Vendor Consignment</option>
                    </select>
                  </div>

                  {petFormData.inventoryOwner === 'VENDOR' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Select Vendor Kennel *
                      </label>
                      <select
                        value={petFormData.vendorId || 'usr_vendor_1'}
                        onChange={(e) => setPetFormData({ ...petFormData, vendorId: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        {AVAILABLE_VENDORS.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.location})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editingPet && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Lifecycle Status
                      </label>
                      <select
                        value={petFormData.status}
                        onChange={(e) => setPetFormData({ ...petFormData, status: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        {ALL_PET_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-slate-500" />
                      <span>Microchip Number / RFID Tag</span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">15-digit ISO or Tag</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 953010002134567"
                    value={petFormData.microchipNumber}
                    onChange={(e) => setPetFormData({ ...petFormData, microchipNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono font-medium text-slate-800 placeholder:font-sans focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Distinguishing Markings & Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Coat markings, eye color variations, physical traits, temperament..."
                    value={petFormData.otherDetails}
                    onChange={(e) => setPetFormData({ ...petFormData, otherDetails: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION: Photos & Videos */}
              <div className="pt-2 border-t border-slate-100">
                <PetMediaUpload
                  photos={petFormData.photos}
                  videos={petFormData.videos}
                  onPhotosChange={(photos) => setPetFormData((prev) => ({ ...prev, photos }))}
                  onVideosChange={(videos) => setPetFormData((prev) => ({ ...prev, videos }))}
                  folder="pets"
                />
              </div>

              {/* SECTION: Parentage (Sire & Dam) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  3. Lineage Provenance (Sire & Dam)
                </h4>
                <LineageProvenanceUpload
                  fatherName={petFormData.fatherName}
                  fatherPhoto={petFormData.fatherPhoto}
                  fatherDocs={petFormData.fatherDocs}
                  motherName={petFormData.motherName}
                  motherPhoto={petFormData.motherPhoto}
                  motherDocs={petFormData.motherDocs}
                  onChange={(updates) => setPetFormData((prev) => ({ ...prev, ...updates }))}
                />
              </div>

              {/* SECTION: KCI Registration */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="kciCheckbox"
                    checked={petFormData.kciRegistered}
                    onChange={(e) => setPetFormData({ ...petFormData, kciRegistered: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="kciCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Kennel Club of India (KCI) Registered
                  </label>
                </div>

                {petFormData.kciRegistered && (
                  <KciDocumentsUpload
                    documents={petFormData.kciDocuments}
                    onChange={(docs) => setPetFormData((prev) => ({ ...prev, kciDocuments: docs }))}
                  />
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingPet(false);
                    setEditingPet(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={petFormSubmitting || !petFormData.categoryId || !petFormData.breedId}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-2xs disabled:opacity-50"
                >
                  {petFormSubmitting
                    ? 'Saving...'
                    : editingPet
                    ? 'Update Profile & QR'
                    : 'Create Pet Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Customer QR Code Viewer */}
      {viewingQrPet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {viewingQrPet.petId}
              </span>
              <button
                type="button"
                onClick={() => setViewingQrPet(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Customer Provenance QR Code
              </h3>
              <p className="text-xs text-slate-500">
                Customers scan this to view verified age, breed, sire & dam lineage, and KCI certificates.
              </p>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mx-auto inline-block">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR for ${viewingQrPet.petId}`}
                  className="w-56 h-56 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadQrCode}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download QR</span>
                </button>
                <button
                  type="button"
                  onClick={copyCustomerLink}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <Link
                href={`/pets/${viewingQrPet.petId}`}
                target="_blank"
                className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center justify-center space-x-1.5 shadow-2xs block"
              >
                <span>Open Public Customer Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2-FACTOR DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeletingItem(null);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Delete {deletingItem.type === 'category' ? 'Category' : deletingItem.type === 'breed' ? 'Breed' : 'Pet Profile'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">&ldquo;{deletingItem.name}&rdquo;</strong>?
                This action cannot be undone.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">⚠️ Two-Factor Safety Verification</p>
              <p>
                To avoid mistaken deletion, please type{' '}
                <span className="font-bold underline text-amber-950">{deletingItem.name}</span> or{' '}
                <span className="font-bold underline text-amber-950">DELETE</span> in the box below to unlock confirmation:
              </p>
            </div>

            <div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  const verified =
                    deleteConfirmText.trim().toLowerCase() === deletingItem.name.toLowerCase() ||
                    deleteConfirmText.trim().toUpperCase() === 'DELETE';
                  if (e.key === 'Enter' && verified && !deleteSubmitting) {
                    handleExecuteDelete();
                  }
                }}
                placeholder={`Type "${deletingItem.name}" or "DELETE"`}
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingItem(null);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteSubmitting ||
                  (deleteConfirmText.trim().toLowerCase() !== deletingItem.name.toLowerCase() &&
                    deleteConfirmText.trim().toUpperCase() !== 'DELETE')
                }
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl transition shadow-2xs flex items-center space-x-1.5 disabled:opacity-35 disabled:cursor-not-allowed bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteSubmitting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Move Inventory Ownership (Module C) */}
      {transferringPet && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Move Inventory Ownership</h3>
                  <p className="text-[10px] text-slate-400">Transfer pet between Furora HQ and Vendor Kennel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferringPet(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Pet ID:</span>
                <span className="font-mono font-bold text-slate-900">{transferringPet.petId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Ownership:</span>
                <span className="font-bold text-slate-800">
                  {transferringPet.inventoryOwner === 'FURORA'
                    ? 'Furora HQ (In-house)'
                    : `Vendor: ${transferringPet.vendor?.name || 'Vendor Kennel Facility'}`}
                </span>
              </div>
            </div>

            <form onSubmit={handleTransferInventory} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Target Inventory Owner *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetOwner('FURORA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      targetOwner === 'FURORA'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Furora HQ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetOwner('VENDOR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      targetOwner === 'VENDOR'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Vendor Kennel</span>
                  </button>
                </div>
              </div>

              {targetOwner === 'VENDOR' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Select Target Vendor Kennel *
                  </label>
                  <select
                    value={targetVendorId}
                    onChange={(e) => setTargetVendorId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    {AVAILABLE_VENDORS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Reason for Transfer (Logged to Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sourced to Furora HQ, Returned to vendor, Inventory rebalancing..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTransferringPet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                >
                  {transferSubmitting ? 'Transferring...' : 'Confirm Ownership Move'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Pet Status Lifecycle (Module C) */}
      {statusPet && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Update Pet Lifecycle Status</h3>
                  <p className="text-[10px] text-slate-400">11-Status State Machine with Audit Logging</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusPet(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Pet ID:</span>
                <span className="font-mono font-bold text-slate-900">{statusPet.petId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <div>{getPetStatusBadge(statusPet.status)}</div>
              </div>
            </div>

            <form onSubmit={handleTransitionStatus} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Target Next Status *
                </label>
                <select
                  value={selectedNextStatus}
                  onChange={(e) => setSelectedNextStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  {(adminStatusOverride
                    ? ALL_PET_STATUSES
                    : (VALID_PET_TRANSITIONS[statusPet.status] || ALL_PET_STATUSES)
                  ).map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {adminStatusOverride
                      ? 'Admin Override Active: All 11 statuses unlocked'
                      : `Permitted transitions: ${(VALID_PET_TRANSITIONS[statusPet.status] || []).join(', ') || 'Terminal'}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adminOverride"
                  checked={adminStatusOverride}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAdminStatusOverride(checked);
                    if (checked) {
                      setSelectedNextStatus(ALL_PET_STATUSES[0]);
                    } else {
                      const validNext = VALID_PET_TRANSITIONS[statusPet.status] || [];
                      setSelectedNextStatus(validNext[0] || statusPet.status);
                    }
                  }}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="adminOverride" className="text-[11px] font-medium text-slate-600 select-none cursor-pointer">
                  Admin Manual Override (unlock all 11 statuses)
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Reason for Transition (Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared medical inspection, Customer returned pet, Reserved for VIP..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStatusPet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting || !selectedNextStatus}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                >
                  {statusSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUnifiedInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
