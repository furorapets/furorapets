'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  QrCode,
  Edit2,
  Trash2,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  AlertTriangle,
  Award,
  Calendar,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { calculateAge } from '@/lib/age-calculator';
import PetMediaUpload from '@/components/media/PetMediaUpload';
import LineageProvenanceUpload from '@/components/media/LineageProvenanceUpload';
import KciDocumentsUpload from '@/components/media/KciDocumentsUpload';

function AdminPetsContent() {
  const searchParams = useSearchParams();
  const editParamId = searchParams.get('edit');

  const [pets, setPets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');

  // Modals
  const [creatingPet, setCreatingPet] = useState(false);
  const [editingPet, setEditingPet] = useState<any | null>(null);
  const [viewingQrPet, setViewingQrPet] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2-Factor Delete Modal
  const [deletingPet, setDeletingPet] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Form State (Shared for Add & Edit)
  const [formData, setFormData] = useState({
    categoryId: '',
    breedId: '',
    dob: '2026-06-01',
    sex: 'Male',
    colour: 'Golden',
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
    vendorId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [petsRes, catsRes] = await Promise.all([
        fetch('/api/pets'),
        fetch('/api/categories'),
      ]);

      if (petsRes.ok) {
        const petsData = await petsRes.json();
        setPets(petsData.data || []);
      }
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(catsData.data || []);
      }
    } catch (err) {
      console.error('Failed to load pets data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle ?edit=[id] query param from customer page
  useEffect(() => {
    if (editParamId && pets.length > 0) {
      const target = pets.find((p) => p.id === editParamId || p.petId === editParamId);
      if (target) {
        openEditModal(target);
      }
    }
  }, [editParamId, pets]);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreatingPet(false);
        setEditingPet(null);
        setViewingQrPet(null);
        setDeletingPet(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered breeds based on selected category in form
  const availableBreeds = useMemo(() => {
    if (!formData.categoryId) return [];
    const cat = categories.find((c) => c.id === formData.categoryId);
    return cat?.breeds?.filter((b: any) => b.active) || [];
  }, [formData.categoryId, categories]);

  // Filtered pets list
  const filteredPets = useMemo(() => {
    return pets.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.petId?.toLowerCase().includes(q) ||
        p.breed?.name?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.colour?.toLowerCase().includes(q) ||
        p.fatherName?.toLowerCase().includes(q) ||
        p.motherName?.toLowerCase().includes(q);

      const matchesCat = !selectedCategory || p.categoryId === selectedCategory;
      const matchesOwner = !selectedOwner || p.inventoryOwner === selectedOwner;

      return matchesSearch && matchesCat && matchesOwner;
    });
  }, [pets, searchQuery, selectedCategory, selectedOwner]);

  const openCreateModal = () => {
    const defaultCat = categories[0]?.id || '';
    const defaultCatObj = categories.find((c) => c.id === defaultCat);
    const defaultBreed = defaultCatObj?.breeds?.find((b: any) => b.active)?.id || '';

    setFormData({
      categoryId: defaultCat,
      breedId: defaultBreed,
      dob: new Date().toISOString().split('T')[0],
      sex: 'Male',
      colour: 'Standard',
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
      vendorId: '',
    });
    setCreatingPet(true);
  };

  const openEditModal = (p: any) => {
    setEditingPet(p);
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

    setFormData({
      categoryId: p.categoryId,
      breedId: p.breedId,
      dob: new Date(p.dob).toISOString().split('T')[0],
      sex: p.sex || 'Male',
      colour: p.colour || '',
      otherDetails: p.otherDetails || '',
      photos: safeParse(p.photos),
      videos: safeParse(p.videos),
      fatherName: p.fatherName || '',
      fatherPhoto: p.fatherPhoto || '',
      fatherVideo: p.fatherVideo || '',
      fatherDocs: safeParse(p.fatherDocs),
      motherName: p.motherName || '',
      motherPhoto: p.motherPhoto || '',
      motherVideo: p.motherVideo || '',
      motherDocs: safeParse(p.motherDocs),
      kciRegistered: Boolean(p.kciRegistered),
      kciDocuments: safeParse(p.kciDocuments),
      inventoryOwner: p.inventoryOwner || 'FURORA',
      vendorId: p.vendorId || '',
    });
  };

  const openQrModal = async (p: any) => {
    setViewingQrPet(p);
    setCopiedLink(false);
    try {
      const res = await fetch(`/api/pets/${p.id}`);
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
    if (!formData.categoryId || !formData.breedId || !formData.dob) {
      alert('Please fill in required fields: Category, Breed, and DOB.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        categoryId: formData.categoryId,
        breedId: formData.breedId,
        dob: formData.dob,
        sex: formData.sex,
        colour: formData.colour.trim(),
        otherDetails: formData.otherDetails.trim() || null,
        photos: formData.photos,
        videos: formData.videos,
        fatherName: formData.fatherName.trim() || null,
        fatherPhoto: formData.fatherPhoto.trim() || null,
        fatherVideo: formData.fatherVideo.trim() || null,
        fatherDocs: formData.fatherDocs,
        motherName: formData.motherName.trim() || null,
        motherPhoto: formData.motherPhoto.trim() || null,
        motherVideo: formData.motherVideo.trim() || null,
        motherDocs: formData.motherDocs,
        kciRegistered: formData.kciRegistered,
        kciDocuments: formData.kciDocuments,
        inventoryOwner: formData.inventoryOwner,
        vendorId: formData.inventoryOwner === 'VENDOR' ? formData.vendorId || null : null,
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
        if (!isEdit && data.data) {
          // Immediately show the new pet's QR code modal!
          openQrModal(data.data);
        }
      } else {
        alert(data.error || 'Failed to save pet profile');
      }
    } catch (err) {
      alert('Error saving pet profile');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deletingPet) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/pets/${deletingPet.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setDeletingPet(null);
        setDeleteConfirmText('');
        await loadData();
      } else {
        setDeleteError(data.error || 'Failed to delete pet profile');
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/pets/${viewingQrPet.petId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pet ID & Pet Profile Management
          </h1>
          <p className="text-xs text-slate-500">
            Generate unique Pet IDs (`FUR-PET-######`), dynamic age calculation, lineage provenance, and customer QR codes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pet Profile</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Pet ID, Breed, Colour, Sire, Dam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Ownership</option>
            <option value="FURORA">Furora HQ</option>
            <option value="VENDOR">Vendor</option>
          </select>

          <span className="text-[11px] font-bold text-slate-400 px-2">
            {filteredPets.length} {filteredPets.length === 1 ? 'Pet' : 'Pets'}
          </span>
        </div>
      </div>

      {/* Pets Table */}
      <div className="card-clean overflow-hidden">
        <table className="w-full divide-y divide-slate-100 text-xs table-auto">
          <thead className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Pet ID</th>
              <th className="px-4 py-3 text-left">Category & Breed</th>
              <th className="px-4 py-3 text-left">Dynamic Age & DOB</th>
              <th className="px-4 py-3 text-left">Sex & Colour</th>
              <th className="px-4 py-3 text-left">Lineage / KCI</th>
              <th className="px-4 py-3 text-left">Ownership</th>
              <th className="px-4 py-3 text-center">Customer QR</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs">
                  Loading pet profiles...
                </td>
              </tr>
            ) : filteredPets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs">
                  No pet profiles found. Click &ldquo;+ Add Pet Profile&rdquo; to create one.
                </td>
              </tr>
            ) : (
              filteredPets.map((pet) => {
                const ageInfo = calculateAge(pet.dob);
                return (
                  <tr key={pet.id} className="hover:bg-slate-50/60 transition">
                    {/* Pet ID */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-900">
                        <span>{pet.petId}</span>
                      </div>
                    </td>

                    {/* Category & Breed */}
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {pet.breed?.name || 'Unknown Breed'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {pet.category?.name || 'Category'}
                        </span>
                      </div>
                    </td>

                    {/* Age & DOB */}
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700">
                          {ageInfo.formatted}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          DOB: {new Date(pet.dob).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Sex & Colour */}
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      <div>
                        <span>{pet.sex}</span>
                        <span className="text-slate-400"> • </span>
                        <span>{pet.colour}</span>
                      </div>
                    </td>

                    {/* Lineage / KCI */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-600 block truncate max-w-[140px]">
                          {pet.fatherName ? `S: ${pet.fatherName}` : 'S: Unrecorded'}
                        </span>
                        <div className="flex items-center space-x-1">
                          {pet.kciRegistered ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              KCI Certified
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium">
                              Standard Pedigree
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ownership */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pet.inventoryOwner === 'FURORA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {pet.inventoryOwner === 'FURORA' ? 'Furora HQ' : 'Vendor'}
                      </span>
                    </td>

                    {/* QR Code */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => openQrModal(pet)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition space-x-1 shadow-2xs"
                        title="View customer QR code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-800" />
                        <span className="font-bold">QR</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          href={`/pets/${pet.petId}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                          title="View public customer page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(pet)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                          title="Edit pet profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingPet(pet);
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add / Edit Pet Profile */}
      {(creatingPet || editingPet) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPet ? `Edit Pet Profile (${editingPet.petId})` : 'Add New Pet Profile'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingPet
                    ? 'Modify pet details, upload photos, and update information hosted in customer QR.'
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
                      value={formData.categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        const cat = categories.find((c) => c.id === newCatId);
                        const firstBreed = cat?.breeds?.find((b: any) => b.active)?.id || '';
                        setFormData({
                          ...formData,
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
                      Breed * (Active Breeds Only)
                    </label>
                    <select
                      value={formData.breedId}
                      onChange={(e) => setFormData({ ...formData, breedId: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      {availableBreeds.length === 0 ? (
                        <option value="">No active breeds in category</option>
                      ) : (
                        availableBreeds.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))
                      )}
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
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] font-bold px-2.5 py-2 rounded-xl bg-blue-50 text-blue-700 whitespace-nowrap">
                        {calculateAge(formData.dob).formatted}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Sex *
                    </label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
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
                      placeholder="e.g. Golden, Fawn, Black & White"
                      value={formData.colour}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Inventory Ownership
                    </label>
                    <select
                      value={formData.inventoryOwner}
                      onChange={(e) => setFormData({ ...formData, inventoryOwner: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="FURORA">Furora HQ</option>
                      <option value="VENDOR">Vendor Consignment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Identification Details & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Distinguishing markings, microchip notes, personality..."
                    value={formData.otherDetails}
                    onChange={(e) => setFormData({ ...formData, otherDetails: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION: Photos & Videos (Cloudflare R2 Direct Upload) */}
              <div className="pt-2 border-t border-slate-100">
                <PetMediaUpload
                  photos={formData.photos}
                  videos={formData.videos}
                  onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
                  onVideosChange={(videos) => setFormData((prev) => ({ ...prev, videos }))}
                  folder="pets"
                />
              </div>

              {/* SECTION: Parentage (Sire & Dam) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  3. Lineage Provenance (Sire & Dam)
                </h4>
                <LineageProvenanceUpload
                  fatherName={formData.fatherName}
                  fatherPhoto={formData.fatherPhoto}
                  fatherDocs={formData.fatherDocs}
                  motherName={formData.motherName}
                  motherPhoto={formData.motherPhoto}
                  motherDocs={formData.motherDocs}
                  onChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
                />
              </div>

              {/* SECTION: KCI Registration */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="kciCheckbox"
                    checked={formData.kciRegistered}
                    onChange={(e) => setFormData({ ...formData, kciRegistered: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="kciCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Kennel Club of India (KCI) Registered
                  </label>
                </div>

                {formData.kciRegistered && (
                  <KciDocumentsUpload
                    documents={formData.kciDocuments}
                    onChange={(docs) => setFormData((prev) => ({ ...prev, kciDocuments: docs }))}
                  />
                )}
              </div>

              {/* Buttons */}
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
                  disabled={formSubmitting || !formData.categoryId || !formData.breedId}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
                >
                  {formSubmitting
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
                className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center justify-center space-x-1.5 shadow-xs block"
              >
                <span>Open Public Customer Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2-FACTOR DELETE CONFIRMATION MODAL */}
      {deletingPet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeletingPet(null);
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
                Delete Pet Profile
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete pet profile{' '}
                <strong className="text-slate-900 font-bold">&ldquo;{deletingPet.petId}&rdquo;</strong> ({deletingPet.breed?.name})?
                This action cannot be undone.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">⚠️ Two-Factor Safety Verification</p>
              <p>
                To avoid mistaken deletion, please type{' '}
                <span className="font-bold underline text-amber-950">{deletingPet.petId}</span> or{' '}
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
                    deleteConfirmText.trim().toLowerCase() === deletingPet.petId.toLowerCase() ||
                    deleteConfirmText.trim().toUpperCase() === 'DELETE';
                  if (e.key === 'Enter' && verified && !deleteSubmitting) {
                    handleExecuteDelete();
                  }
                }}
                placeholder={`Type "${deletingPet.petId}" or "DELETE"`}
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
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
                  setDeletingPet(null);
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
                  (deleteConfirmText.trim().toLowerCase() !== deletingPet.petId.toLowerCase() &&
                    deleteConfirmText.trim().toUpperCase() !== 'DELETE')
                }
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 disabled:opacity-35 disabled:cursor-not-allowed bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteSubmitting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPetsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading inventory...</div>}>
      <AdminPetsContent />
    </React.Suspense>
  );
}
