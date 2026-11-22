'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import {
  ShieldCheck,
  Eye,
  Search,
  AlertCircle,
  X,
  CheckCircle2,
  Sparkles,
  Video,
  Camera,
  ArrowRight,
  ShoppingBag,
  Layers,
  Lock,
  Shield,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SalesCatalogContent() {
  const { currentUser, switchToRoleName } = useSession();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [pets, setPets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [kciFilter, setKciFilter] = useState(false);
  const [sortBy, setSortBy] = useState('DEFAULT');

  // Modal State
  const [selectedPet, setSelectedPet] = useState<any | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'MEDIA' | 'LINEAGE' | 'DETAILS' | 'PRIVACY'>('MEDIA');

  // Infinite Scroll Pagination
  const [visibleCount, setVisibleCount] = useState(24);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Sales view only queries AVAILABLE pets
      const [petsRes, catRes] = await Promise.all([
        fetch('/api/pets?status=AVAILABLE'),
        fetch('/api/categories'),
      ]);

      const petsData = await petsRes.json();
      const catData = await catRes.json();

      if (petsData.success) setPets(petsData.data);
      if (catData.success) setCategories(catData.data);
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
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, categoryFilter, sexFilter, kciFilter, sortBy]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 24);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef]);

  // Filtered & Sorted Pets
  const filteredPets = useMemo(() => {
    return pets
      .filter((p) => {
        // Enforce AVAILABLE inventory only
        if (p.status !== 'AVAILABLE') return false;

        // Category filter
        if (categoryFilter && p.categoryId !== categoryFilter && p.category?.id !== categoryFilter) {
          return false;
        }

        // Sex filter
        if (sexFilter !== 'ALL' && p.sex !== sexFilter) {
          return false;
        }

        // KCI filter
        if (kciFilter && !p.kciRegistered) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = p.petId?.toLowerCase().includes(q);
          const matchBreed = p.breed?.name?.toLowerCase().includes(q);
          const matchCat = p.category?.name?.toLowerCase().includes(q);
          const matchColour = p.colour?.toLowerCase().includes(q);
          const matchFather = p.fatherName?.toLowerCase().includes(q);
          const matchMother = p.motherName?.toLowerCase().includes(q);
          if (!matchId && !matchBreed && !matchCat && !matchColour && !matchFather && !matchMother) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'YOUNGEST') {
          return new Date(b.dob).getTime() - new Date(a.dob).getTime();
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.dob).getTime() - new Date(b.dob).getTime();
        }
        if (sortBy === 'BREED_AZ') {
          return (a.breed?.name || '').localeCompare(b.breed?.name || '');
        }
        return 0;
      });
  }, [pets, categoryFilter, sexFilter, kciFilter, searchQuery, sortBy]);

  const displayedPets = useMemo(() => {
    return filteredPets.slice(0, visibleCount);
  }, [filteredPets, visibleCount]);

  // Fallback breed image if no photo uploaded
  const getPetImage = (pet: any, index = 0) => {
    if (pet.photos && pet.photos.length > index && pet.photos[index]) {
      return pet.photos[index];
    }
    const cat = pet.category?.name?.toLowerCase() || '';
    if (cat.includes('dog')) {
      return 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80';
    }
    if (cat.includes('cat')) {
      return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80';
    }
    if (cat.includes('bird')) {
      return 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?auto=format&fit=crop&w=800&q=80';
    }
    if (cat.includes('fish')) {
      return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
  };

  const getSireImage = (pet: any) => {
    if (pet.fatherPhoto) return pet.fatherPhoto;
    return 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80';
  };

  const getDamImage = (pet: any) => {
    if (pet.motherPhoto) return pet.motherPhoto;
    return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <div className="w-full pb-16 space-y-4 animate-fadeIn">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sales Catalog & Provenance
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Sales Team View
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified customer-ready pets with certified health history and provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200">
            <Lock className="w-3 h-3 mr-1.5 text-slate-500" /> Private Records Protected
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-clean p-4 rounded-2xl border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Available In Stock</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{filteredPets.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Ready for Customer Booking</div>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Categories Represented</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{categories.length}</div>
          <div className="text-[10px] text-blue-600 font-bold mt-1">Dogs, Birds, Cats, Reptiles...</div>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-slate-100 shadow-soft">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>KCI Certified Pedigree</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {pets.filter((p) => p.kciRegistered).length}
          </div>
          <div className="text-[10px] text-indigo-600 font-bold mt-1">Verified Parent Provenance</div>
        </div>

        <div className="card-clean p-4 rounded-2xl border border-purple-100 bg-purple-50/20 shadow-soft">
          <div className="flex items-center justify-between text-xs text-purple-600 font-semibold mb-1">
            <span>RBAC Privacy Guard</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-extrabold text-purple-950 mt-1 leading-snug">Strict Server Redaction</div>
          <div className="text-[10px] text-purple-700 font-medium mt-1">Costs & Medical Data Locked</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-clean p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-soft">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Pet ID, breed, category, colour, or parent..."
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
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sex Filter */}
          <select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* KCI Toggle */}
          <button
            onClick={() => setKciFilter(!kciFilter)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              kciFilter
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            KCI Only
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="DEFAULT">Sort: Default</option>
            <option value="YOUNGEST">Age: Youngest First</option>
            <option value="OLDEST">Age: Oldest First</option>
            <option value="BREED_AZ">Breed: A to Z</option>
          </select>

          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap pl-1">
            Showing {displayedPets.length} of {filteredPets.length}
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="card-clean p-12 text-center text-slate-400 text-xs rounded-2xl shadow-soft">
          No available pets found matching your query. All newly added or vendor-available stock appears here in real time.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedPets.map((pet) => {
            const photosCount = pet.photos?.length || 1;
            const hasVideo = pet.videos && pet.videos.length > 0;

            return (
              <div
                key={pet.id}
                className="card-clean card-clean-hover overflow-hidden rounded-2xl flex flex-col justify-between shadow-soft border border-slate-100 group transition-all"
              >
                {/* Pet Image Header */}
                <div className="relative h-52 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => { setSelectedPet(pet); setActiveMediaIndex(0); setActiveTab('MEDIA'); }}>
                  <img
                    src={getPetImage(pet, 0)}
                    alt={pet.breed?.name || 'Pet'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Monospace Pet ID */}
                  <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    {pet.petId}
                  </div>

                  {/* Available Badge */}
                  <div className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 inline-block"></span>
                    AVAILABLE
                  </div>

                  {/* Media Indicator Pills */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-xs text-white">
                      <Camera className="w-3 h-3 mr-1" /> {photosCount}
                    </span>
                    {hasVideo && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-xs text-white">
                        <Video className="w-3 h-3 mr-1" /> Video
                      </span>
                    )}
                  </div>

                  {pet.kciRegistered && (
                    <div className="absolute bottom-3 right-3 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-xs text-white">
                      <ShieldCheck className="w-3 h-3 mr-1" /> KCI Pedigree
                    </div>
                  )}
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {pet.breed?.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-semibold">{pet.category?.name}</span>
                    </div>

                    {/* Age, DOB, Sex, Colour grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/80 mt-2.5">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          Age
                        </span>
                        <span className="font-extrabold text-slate-800 text-xs">{pet.age}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          DOB
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {new Date(pet.dob).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          Sex
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{pet.sex}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          Colour
                        </span>
                        <span className="font-bold text-slate-800 text-xs truncate block">{pet.colour}</span>
                      </div>
                    </div>

                    {/* Parents Lineage */}
                    <div className="text-[11px] text-slate-600 space-y-1 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Sire (Father):</span>
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">
                          {pet.fatherName || 'Not recorded'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Dam (Mother):</span>
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">
                          {pet.motherName || 'Not recorded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy note */}
                  <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span>Privacy: Costs & Medical Files Redacted</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedPet(pet);
                      setActiveMediaIndex(0);
                      setActiveTab('MEDIA');
                    }}
                    className="flex-1 inline-flex items-center justify-center text-xs font-bold px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-soft transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Media
                  </button>

                  <Link
                    href={`/admin/orders?q=${pet.petId}`}
                    className="inline-flex items-center justify-center text-xs font-bold px-3 py-2 bg-white text-slate-700 border border-slate-200/90 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    title="Book / Allocate this pet to an order"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {displayedPets.length < filteredPets.length && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
          Loading more available pets...
        </div>
      )}

      {/* Pet Profile, Provenance & Media Modal */}
      {selectedPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="card-clean max-w-2xl w-full p-6 shadow-2xl space-y-5 rounded-3xl max-h-[92vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                    {selectedPet.petId}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block"></span>
                    AVAILABLE INVENTORY
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedPet.breed?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedPet.category?.name} • Dynamic Age: <strong>{selectedPet.age}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedPet(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-100 gap-2">
              {[
                { id: 'MEDIA', label: 'Pet Photos & Video', icon: Camera },
                { id: 'LINEAGE', label: 'Parent Media (Sire & Dam)', icon: Layers },
                { id: 'DETAILS', label: 'Breed & Vital Stats', icon: Sparkles },
                { id: 'PRIVACY', label: 'RBAC Privacy Guard', icon: Lock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                      isActive
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Pet Media */}
            {activeTab === 'MEDIA' && (
              <div className="space-y-4">
                {/* Main Preview */}
                <div className="relative h-72 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  <img
                    src={getPetImage(selectedPet, activeMediaIndex)}
                    alt={selectedPet.breed?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    Photo {activeMediaIndex + 1} of {selectedPet.photos?.length || 1}
                  </div>
                </div>

                {/* Thumbnails Strip */}
                {selectedPet.photos && selectedPet.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedPet.photos.map((photo: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveMediaIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition cursor-pointer ${
                          activeMediaIndex === idx ? 'border-slate-900 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={photo} alt="thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Video Player */}
                {selectedPet.videos && selectedPet.videos.length > 0 ? (
                  <div className="card-clean p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-rose-600" /> Verified Pet Activity Video
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">HD Preview</span>
                    </div>
                    <video
                      controls
                      className="w-full rounded-xl max-h-56 bg-black"
                      src={selectedPet.videos[0]}
                      poster={getPetImage(selectedPet, 0)}
                    >
                      Your browser does not support HTML5 video preview.
                    </video>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    No video clip uploaded for this pet profile yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Lineage & Parent Media */}
            {activeTab === 'LINEAGE' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Customer-verified parent media demonstrating lineage and provenance without revealing private vendor documents or breeder procurement contracts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sire (Father) Card */}
                  <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                    <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={getSireImage(selectedPet)}
                        alt="Sire"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Sire (Father)
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {selectedPet.fatherName || 'Registered Sire'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Verified Champion Lineage • Purebred Certificate
                      </p>
                    </div>
                    {selectedPet.fatherVideo && (
                      <a
                        href={selectedPet.fatherVideo}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[11px] font-bold text-rose-600 hover:text-rose-700"
                      >
                        <Play className="w-3 h-3 mr-1" /> Watch Sire Video Clip &rarr;
                      </a>
                    )}
                    <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Private Sire Breeding Contract: <strong className="text-slate-600">Redacted</strong>
                    </div>
                  </div>

                  {/* Dam (Mother) Card */}
                  <div className="card-clean p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                    <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={getDamImage(selectedPet)}
                        alt="Dam"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Dam (Mother)
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {selectedPet.motherName || 'Registered Dam'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Verified Purebred Lineage • Health Screened
                      </p>
                    </div>
                    {selectedPet.motherVideo && (
                      <a
                        href={selectedPet.motherVideo}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[11px] font-bold text-rose-600 hover:text-rose-700"
                      >
                        <Play className="w-3 h-3 mr-1" /> Watch Dam Video Clip &rarr;
                      </a>
                    )}
                    <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Private Dam Health Dossier: <strong className="text-slate-600">Redacted</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Vital Stats & Breed */}
            {activeTab === 'DETAILS' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Calculated Dynamic Age
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedPet.age}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date of Birth (DOB)
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {new Date(selectedPet.dob).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sex & Colour
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedPet.sex} • {selectedPet.colour}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pedigree Status
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedPet.kciRegistered ? 'Verified KCI Pedigree' : 'Standard Purebred'}
                    </span>
                  </div>
                </div>

                <div className="card-clean p-4 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">Customer Public Verification QR</h4>
                  <p className="text-[11px] text-slate-400">
                    Customers can scan the verification QR code upon delivery to inspect digital authenticity and origin certificate.
                  </p>
                  <div className="pt-1">
                    <Link
                      href={`/pets/${selectedPet.petId}`}
                      target="_blank"
                      className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-800"
                    >
                      Open Public Verification Certificate &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: RBAC Privacy Guard */}
            {activeTab === 'PRIVACY' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 text-purple-950 space-y-2">
                  <div className="font-bold text-xs flex items-center">
                    <ShieldCheck className="w-4 h-4 text-purple-700 mr-1.5" />
                    Strict Server-Side Access Controls
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Under Furora security policy, the Sales persona operates with read-only access to customer-facing attributes. Private vendor business records and medical documents are completely redacted by the backend server:
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Vendor Purchase & Procurement Costs</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      REDACTED (Inaccessible)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Private Breeder Contracts & Documents</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      REDACTED (Inaccessible)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Internal Veterinary Clinical Reports</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      REDACTED (Inaccessible)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Customer Order Modification Access</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      BLOCKED (403 Forbidden)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Audit Logs & System History</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      BLOCKED (403 Forbidden)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-mono">
                Status: <strong className="text-emerald-700">{selectedPet.status}</strong>
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedPet(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href={`/admin/orders?q=${selectedPet.petId}`}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-soft"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Book / Allocate to Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <SalesCatalogContent />
    </Suspense>
  );
}
