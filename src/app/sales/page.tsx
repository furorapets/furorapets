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
  Store,
  ClipboardList,
  MapPin,
  Phone,
  User,
  Share2,
  Copy,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SalesCatalogContent() {
  const { currentUser } = useSession();
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
  const [reservedToast, setReservedToast] = useState<string | null>(null);
  const [copiedPetId, setCopiedPetId] = useState<string | null>(null);

  // Copy Client Reservation Link
  const handleCopyReservationLink = (pet: any) => {
    if (!pet || !pet.petId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanUrl = `${origin}/pets/${pet.petId}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanUrl).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = cleanUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    }

    setCopiedPetId(pet.petId);
    setReservedToast(`Copied reservation link for ${pet.petId}: ${cleanUrl}`);
    setTimeout(() => {
      setCopiedPetId(null);
      setReservedToast(null);
    }, 4000);
  };

  // Instant Pet Booking State
  const [bookingPet, setBookingPet] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState('ADVANCE_COD');
  const [advancePaid, setAdvancePaid] = useState('15000');
  const [packageTitle, setPackageTitle] = useState('Standard Verified Pet Delivery Package');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Infinite Scroll Pagination
  const [visibleCount, setVisibleCount] = useState(24);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleInstantBookPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPet) return;
    if (!customerName || !customerContact || !deliveryAddress) {
      setBookingError('Please enter Customer Name, Contact Number, and Delivery Address.');
      return;
    }

    setBookingSubmitting(true);
    setBookingError('');

    try {
      const payload: any = {
        categoryId: bookingPet.categoryId || bookingPet.category?.id,
        breedId: bookingPet.breedId || bookingPet.breed?.id,
        petId: bookingPet.id,
        customerName: customerName.trim(),
        customerContact: customerContact.trim(),
        deliveryAddress: deliveryAddress.trim(),
        productOrPackage: packageTitle,
        paymentStatus: 'PAID',
        paymentMode,
        advancePaid: advancePaid ? Number(advancePaid) : 0,
        orderSource: 'DIRECT_SALES_ENQUIRY',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book pet for customer.');
      }

      setBookingSuccess(`Pet ${bookingPet.petId} booked successfully! Order ID: ${data.data.orderId}`);
      setTimeout(() => setBookingSuccess(null), 6000);

      const targetBookedId = bookingPet.id;
      const targetBookedCode = bookingPet.petId;
      setBookingPet(null);
      if (selectedPet && (selectedPet.id === targetBookedId || selectedPet.petId === targetBookedCode)) {
        setSelectedPet(null);
      }

      // Immediately remove from available pets in state
      setPets((prevPets) =>
        prevPets.filter((p) => p.id !== targetBookedId && p.petId !== targetBookedCode)
      );

      // Re-fetch stock from server to guarantee sync
      await loadData();
    } catch (err: any) {
      setBookingError(err.message || 'An error occurred during booking.');
    } finally {
      setBookingSubmitting(false);
    }
  };

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
        // Enforce AVAILABLE inventory only and no linked order
        if (p.status !== 'AVAILABLE') return false;
        if (p.order) return false;

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
      {/* Success Booking Toast */}
      {bookingSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-bold">{bookingSuccess}</p>
            <Link href="/sales/orders" className="text-[11px] text-emerald-300 underline font-semibold hover:text-white">
              View in Customer Orders &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Copied Reservation Link Toast */}
      {reservedToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold">{reservedToast}</p>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sales Catalog & Stock
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Sales Team View
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified customer-ready pets available for instant client reservation and booking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sales/orders"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-soft cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Customer Orders & Bookings</span>
          </Link>
          <span className="hidden sm:inline-flex items-center text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200">
            <Lock className="w-3 h-3 mr-1.5 text-slate-500" /> Private Costs Protected
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

                  {/* Top Bar: Monospace Pet ID on Left, AVAILABLE Status on Right */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="bg-slate-900/90 backdrop-blur-xs text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      {pet.petId}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 inline-block"></span>
                      AVAILABLE
                    </span>
                  </div>

                  {/* Bottom Bar: Media Pills on Left, KCI Pedigree on Right */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/75 backdrop-blur-xs text-white">
                        <Camera className="w-3 h-3 mr-1" /> {photosCount}
                      </span>
                      {hasVideo && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-xs text-white">
                          <Video className="w-3 h-3 mr-1" /> Video
                        </span>
                      )}
                    </div>

                    {pet.kciRegistered && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-xs text-white shadow-sm">
                        <ShieldCheck className="w-3 h-3 mr-1" /> KCI Pedigree
                      </span>
                    )}
                  </div>
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

                    {/* Breeder / Ownership Origin Tag */}
                    <div className="mt-2">
                      {pet.inventoryOwner === 'VENDOR' && (pet.vendor?.name || pet.vendor) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/90 w-full">
                          <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">
                            Vendor: <strong className="font-extrabold text-indigo-950">{pet.vendor?.name || 'Consignment Partner'}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 w-full">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            Source: <strong className="font-extrabold text-emerald-950">Furora HQ Direct Stock</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Age, DOB, Sex, Colour, Microchip grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/80 mt-2.5">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          Age
                        </span>
                        <span className="font-extrabold text-slate-800 text-xs">{pet.age}</span>
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
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                          Microchip / ID
                        </span>
                        <span className="font-mono font-bold text-emerald-700 text-xs truncate block" title={pet.microchipNumber || 'Pending'}>
                          {pet.microchipNumber || 'Pending'}
                        </span>
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
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedPet(pet);
                        setActiveMediaIndex(0);
                        setActiveTab('MEDIA');
                      }}
                      className="flex-1 inline-flex items-center justify-center text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Media
                    </button>

                    <button
                      onClick={() => {
                        setBookingPet(pet);
                        setCustomerName('');
                        setCustomerContact('');
                        setDeliveryAddress('');
                        setBookingError('');
                      }}
                      className="flex-1 inline-flex items-center justify-center text-xs font-bold px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-soft transition cursor-pointer"
                      title="Book this Pet for Customer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Book Pet
                    </button>
                  </div>

                  {/* Share / Copy Client Reservation Link */}
                  <button
                    type="button"
                    onClick={() => handleCopyReservationLink(pet)}
                    className="w-full inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                    title="Copy Client Reservation Link"
                  >
                    {copiedPetId === pet.petId ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>Copy Client Reservation Link</span>
                      </>
                    )}
                  </button>
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
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Microchip Number
                    </span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {selectedPet.microchipNumber || 'Pending Implantation'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Origin & Breeder Partner
                    </span>
                    <span className="font-bold text-indigo-700 text-xs">
                      {selectedPet.inventoryOwner === 'VENDOR' ? (selectedPet.vendor?.name || 'Partner Breeder Consignment') : 'Furora HQ Direct Stock'}
                    </span>
                  </div>
                </div>

                <div className="card-clean p-4 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">Customer Public Verification QR & Reservation Link</h4>
                  <p className="text-[11px] text-slate-400">
                    Customers can scan the verification QR code upon delivery to inspect digital authenticity and origin certificate.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/pets/${selectedPet.petId}`}
                      target="_blank"
                      className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-800"
                    >
                      Open Public Verification Certificate &rarr;
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyReservationLink(selectedPet)}
                      className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    >
                      {copiedPetId === selectedPet.petId ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          <span>Copy Client Reservation Link</span>
                        </>
                      )}
                    </button>
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
                    <span className="text-slate-600 font-semibold">Customer Booking & Order Creation</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ENABLED (Full Booking Access)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-slate-600 font-semibold">Audit Logs & Admin Infrastructure</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      BLOCKED (Admin Restricted)
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
                  type="button"
                  onClick={() => handleCopyReservationLink(selectedPet)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                  title="Copy Client Reservation Link"
                >
                  {copiedPetId === selectedPet.petId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Share / Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedPet(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
                {currentUser?.role === 'ADMIN' ? (
                  <Link
                    href={`/admin/orders?q=${selectedPet.petId}`}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-soft"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Allocate to Order
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      const targetPet = selectedPet;
                      setSelectedPet(null);
                      setBookingPet(targetPet);
                      setCustomerName('');
                      setCustomerContact('');
                      setDeliveryAddress('');
                      setBookingError('');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-soft"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Book this Pet for Customer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant Pet Booking Modal */}
      {bookingPet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Book Pet for Customer</h3>
                <p className="text-xs text-slate-400">
                  Instant reservation and order creation for this verified pet.
                </p>
              </div>
              <button
                onClick={() => setBookingPet(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Selected Pet Summary Card */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <img
                src={getPetImage(bookingPet, 0)}
                alt={bookingPet.breed?.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs truncate">
                    {bookingPet.breed?.name}
                  </h4>
                  <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                    {bookingPet.petId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {bookingPet.category?.name} • {bookingPet.sex} • {bookingPet.age}
                </p>
                <div className="text-[10px] font-mono text-emerald-700 font-bold truncate">
                  Chip: {bookingPet.microchipNumber || 'Pending'}
                </div>
              </div>
            </div>

            <form onSubmit={handleInstantBookPet} className="space-y-3 text-xs">
              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
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
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street address, City, State, Pincode"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              {/* Payment Mode & Advance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ADVANCE_COD">Advance Token + Balance on Delivery</option>
                    <option value="FULL_PREPAID">Full Prepaid Online</option>
                    <option value="COD">Full Cash on Handover</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Advance Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    placeholder="15000"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Package Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Package / Delivery Plan
                </label>
                <input
                  type="text"
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  placeholder="Standard Verified Pet Delivery Package"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingPet(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-soft flex items-center gap-1.5"
                >
                  {bookingSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Booking Pet...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Book Pet</span>
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
