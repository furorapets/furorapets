'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Calendar,
  FileText,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  HeartHandshake,
  Download,
  QrCode,
  Store,
  Stethoscope,
  Truck,
  MapPin,
  ExternalLink,
  Camera,
  Check,
  User,
  Phone,
  Printer,
  Sparkles,
  Navigation,
  Clock,
  Star,
} from 'lucide-react';
import Link from 'next/link';

interface LightboxModalProps {
  isOpen: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

function ImageLightboxModal({
  isOpen,
  photos,
  initialIndex = 0,
  onClose,
  title,
}: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, photos.length, onClose]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery lightbox"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md p-4 sm:p-6 transition-all"
      onClick={onClose}
    >
      {/* Top Header Bar: Title, Counter & Dismiss Button */}
      <div
        className="w-full max-w-6xl flex items-center justify-between text-white z-10 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3">
          {title && (
            <span className="text-sm font-bold text-white/90 hidden sm:inline-block">
              {title}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wide">
            Photo {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <button
          onClick={onClose}
          type="button"
          aria-label="Close lightbox"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main High-Resolution Image Stage with Previous / Next Controls */}
      <div
        className="relative flex-1 w-full max-w-6xl flex items-center justify-center my-auto min-h-0 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            type="button"
            aria-label="Previous photo"
            className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20 backdrop-blur-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 group cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        <div className="relative max-w-full max-h-[72vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
          <img
            src={currentPhoto}
            alt={`Image ${currentIndex + 1} of ${photos.length}`}
            className="max-h-[72vh] max-w-[90vw] object-contain select-none transition-all duration-300"
          />
        </div>

        {photos.length > 1 && (
          <button
            onClick={handleNext}
            type="button"
            aria-label="Next photo"
            className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20 backdrop-blur-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 group cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Preview Strip */}
      {photos.length > 1 && (
        <div
          className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((thumb, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                idx === currentIndex
                  ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105 opacity-100'
                  : 'border-white/20 opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={thumb}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VerifiedCustomerRecordPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState<string | undefined>(undefined);

  const openLightbox = (photos: string[], index = 0, title?: string) => {
    if (!photos || photos.length === 0) return;
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/records/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setRecord(data.data);
        } else {
          setError(data.error || 'Verified customer record not found');
        }
      } catch (e: any) {
        setError(e.message || 'Error fetching record');
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchRecord();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 rounded-full border-3 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="card-clean p-12 text-center max-w-lg mx-auto mt-16 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">Record Not Yet Available</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'This pet record is being processed through certified partner pickup and veterinary medical clearance.'}
        </p>
        <Link href="/" className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition">
          Return to Furora Dashboard &rarr;
        </Link>
      </div>
    );
  }

  const { pet, certificate, latestInspection, deliveryRecord, vendor, agent } = record;

  const kennelDocs = (record.verifiedDocuments || []).filter(
    (d: any) =>
      d.type?.startsWith('KENNEL') ||
      d.type?.includes('REGISTRATION') ||
      d.type?.includes('PEDIGREE') ||
      d.type?.includes('DEWORM') ||
      d.type?.includes('VACCIN') ||
      d.type?.includes('PICKUP') ||
      d.fileName?.toLowerCase().includes('vaccin') ||
      d.fileName?.toLowerCase().includes('deworm') ||
      d.fileName?.toLowerCase().includes('pedigree') ||
      d.fileName?.toLowerCase().includes('pickup')
  );
  const vetDocs = (record.verifiedDocuments || []).filter(
    (d: any) =>
      d.type?.startsWith('VET') ||
      d.type?.includes('MEDICAL') ||
      d.type?.includes('TEST') ||
      d.fileName?.toLowerCase().includes('vet') ||
      d.fileName?.toLowerCase().includes('clearance')
  );
  const deliveryDocs = (record.verifiedDocuments || []).filter(
    (d: any) =>
      d.type?.startsWith('DELIVERY') ||
      d.type?.includes('HANDOVER') ||
      d.type?.includes('SIGNED')
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 py-6 px-4 select-none">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <Link
          href={`/admin/orders?q=${record.orderId}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-semibold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Orders & Dispatch</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/customers?q=${encodeURIComponent(record.customerName)}`}
            className="text-slate-500 hover:text-slate-900 font-semibold transition text-[11px]"
          >
            Buyer: <strong>{record.customerName}</strong> &rarr;
          </Link>
        </div>
      </div>

      {/* Official Top Hero Banner with Scannable QR Code */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-floating flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-3 text-center md:text-left relative z-10 flex-1">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
            <Link href="/" className="inline-block group shrink-0">
              <img
                src="/logo-white.png"
                alt="Furora"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Pet Health & Provenance Record</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {pet.breed}
            </h1>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Order: <span className="font-mono font-bold text-white">{record.orderId}</span> &bull; Pet ID: <span className="font-mono font-bold text-emerald-400">{pet.petId}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs text-slate-300">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white font-semibold">
              Buyer: <strong>{record.customerName}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Status: <strong>{record.status.replace(/_/g, ' ')}</strong>
            </span>
          </div>
        </div>

        {/* Live Scannable QR Code Card */}
        {certificate && (
          <div className="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center text-center relative z-10 border border-slate-100 flex-shrink-0">
            <div className="w-36 h-36 bg-slate-50 rounded-xl overflow-hidden p-1 flex items-center justify-center">
              <img
                src={certificate.qrCodeUrl}
                alt={`QR Code for Order ${record.orderId}`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono font-bold text-slate-800 block">
                {certificate.certificateId}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block">
                Scan on mobile to verify
              </span>
            </div>
            <Link
              href={`/certificate/${record.orderId}`}
              className="mt-2 w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition shadow-xs"
            >
              <Printer className="w-3 h-3" /> Print Certificate
            </Link>
          </div>
        )}
      </div>

      {/* SWIGGY / ZOMATO STYLE LIVE DELIVERY TRACKING DASHBOARD */}
      {record.liveTracking && (
        <div className="card-clean p-6 bg-gradient-to-b from-white to-slate-50/70 border border-slate-200/90 rounded-3xl shadow-soft space-y-5">
          {/* Top Status & Live Pulse */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="relative mt-1">
                <span className="flex h-3.5 w-3.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Live Pet Delivery Tracking
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Order #{record.orderId}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {record.liveTracking.statusHeadline}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {record.liveTracking.statusSubtext}
                </p>
              </div>
            </div>

            {/* Estimated Arrival / Status Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Estimated Arrival
              </span>
              <span className="text-sm font-extrabold text-emerald-300">
                {record.liveTracking.etaText}
              </span>
            </div>
          </div>

          {/* Animated Route Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Custody Chain Milestone</span>
              <span className="text-slate-900 font-extrabold">{record.liveTracking.progressPercentage}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-slate-900 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${record.liveTracking.progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Interactive Route Milestones Graphic */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                Live 3-Location Custody Transit Route
              </span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> GPS & Climate Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Point A: Kennel Pickup */}
              <div className={`p-3.5 rounded-2xl border transition ${
                record.liveTracking.currentMilestone >= 1
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Point A &bull; Origin
                  </span>
                  {record.liveTracking.currentMilestone >= 2 ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  {record.liveTracking.checkpoints.kennel.facilityName}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {record.liveTracking.checkpoints.kennel.address}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Pet Collected & Inspected
                </div>
              </div>

              {/* Point B: Medical Center */}
              <div className={`p-3.5 rounded-2xl border transition ${
                record.liveTracking.currentMilestone >= 2
                  ? 'bg-teal-50/50 border-teal-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Point B &bull; Vet Clinic
                  </span>
                  {record.liveTracking.currentMilestone >= 3 ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  {record.liveTracking.checkpoints.medical.clinicName}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {record.liveTracking.checkpoints.medical.doctorName}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-teal-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-teal-600" />
                  Health & Viral Tests Passed
                </div>
              </div>

              {/* Point C: Customer Residence */}
              <div className={`p-3.5 rounded-2xl border transition ${
                record.liveTracking.currentMilestone === 4
                  ? 'bg-emerald-50 border-emerald-300 text-slate-800'
                  : record.liveTracking.currentMilestone === 3
                  ? 'bg-purple-50/60 border-purple-300 text-slate-800 ring-2 ring-purple-400/40'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Point C &bull; Destination
                  </span>
                  {record.liveTracking.currentMilestone === 4 ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  {record.customerName}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {record.deliveryAddress}
                </p>
                <div className="mt-2 text-[10px] font-bold flex items-center gap-1">
                  {record.liveTracking.currentMilestone === 4 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Handover Complete
                    </span>
                  ) : (
                    <span className="text-purple-700 flex items-center gap-1">
                      <Truck className="w-3 h-3 animate-bounce" /> In Transit to You
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Swiggy / Zomato Style Delivery Partner Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={record.liveTracking.deliveryPartner.avatar}
                  alt={record.liveTracking.deliveryPartner.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {record.liveTracking.deliveryPartner.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    {record.liveTracking.deliveryPartner.rating}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {record.liveTracking.deliveryPartner.role} &bull; {record.liveTracking.deliveryPartner.vehicle}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {record.liveTracking.deliveryPartner.safetyBadges.map((badge: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`tel:${record.liveTracking.deliveryPartner.phone}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" /> Call Delivery Partner
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Pet Profile + Progressive Physical Location Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pet Biological Profile */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card-clean p-4 space-y-4">
            {/* Main Pet Image */}
            <div
              onClick={() => {
                if (pet.photos && pet.photos.length > 0) {
                  openLightbox(pet.photos, 0, `${pet.breed || 'Pet'} Verified Photos`);
                }
              }}
              className={`h-64 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center relative shadow-inner group ${
                pet.photos && pet.photos.length > 0 ? 'cursor-pointer' : ''
              }`}
            >
              {pet.photos && pet.photos.length > 0 ? (
                <>
                  <img
                    src={pet.photos[0]}
                    alt={pet.breed}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
                      <Camera className="w-3.5 h-3.5" />
                      <span>View {pet.photos.length > 1 ? `${pet.photos.length} Photos` : 'Photo'}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-semibold">Verified Photo Registered</div>
              )}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs font-mono">
                  {pet.petId}
                </span>
              </div>
            </div>

            {/* Thumbnail row if multiple pet photos */}
            {pet.photos && pet.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pet.photos.map((pUrl: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openLightbox(pet.photos, idx, `${pet.breed || 'Pet'} Photo Gallery`)}
                    className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all flex-shrink-0 cursor-pointer group relative"
                  >
                    <img src={pUrl} alt={`Pet ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition" />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Details Badge Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Age</span>
                <span className="font-bold text-slate-800">{pet.age}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Sex</span>
                <span className="font-bold text-slate-800">{pet.sex}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Colour</span>
                <span className="font-bold text-slate-800">{pet.colour}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Pedigree</span>
                <span className="font-bold text-slate-800">{pet.kciRegistered ? 'Verified KCI' : 'Standard'}</span>
              </div>
            </div>

            {/* Parent Provenance */}
            {(pet.fatherName || pet.motherName) && (
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Parent Provenance</span>
                {pet.fatherName && (
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Sire (Father):</strong> {pet.fatherName}
                  </p>
                )}
                {pet.motherName && (
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Dam (Mother):</strong> {pet.motherName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Progressive Journey at Each Place */}
        <div className="lg:col-span-2 space-y-5">
          {/* Section: Three-Location Progressive Journey */}
          <div className="card-clean p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Progressive Chain of Custody & Documents
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verified updates and documents recorded at each physical fulfillment location.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                End-to-End
              </span>
            </div>

            {/* Place 1: Furora Certified Partner Network Origin */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Location 1: Furora Certified Network</span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Furora Certified Partner Breeding Facility
                    </h4>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Origin Verified
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Furora Companion Care Facility • Rigorous Pre-Transit Health Verification Passed</span>
              </div>

              {latestInspection && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">10-Point Physical Inspection:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      {latestInspection.result}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{latestInspection.physicalCondition}&rdquo;
                  </p>
                  {latestInspection.photos && latestInspection.photos.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {latestInspection.photos.map((pUrl: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openLightbox(latestInspection.photos, idx, '10-Point Physical Inspection')}
                          className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 hover:opacity-90 transition block cursor-pointer group"
                        >
                          <img src={pUrl} alt="Inspection Photo" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Breeder Origin Documents */}
              {kennelDocs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Breeder Kennel Origin Documents ({kennelDocs.length})
                  </span>
                  {kennelDocs.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs hover:bg-slate-100/60 transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{doc.fileName}</p>
                          <p className="text-[10px] text-slate-400">{doc.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 font-bold rounded-lg text-[10px] hover:bg-slate-50 transition shadow-2xs"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Place 2: Veterinary Medical Center */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Location 2: Veterinary Medical Center</span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Furora Certified Clinical Healthcare Screening
                    </h4>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {record.medicalStatus || 'APPROVED'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Comprehensive physical and clinical evaluation by licensed veterinary surgeons. Clearance granted for vaccination status, organ wellness, and transit fitness.
              </p>

              {/* Customer Visible Medical Documents */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Veterinary Medical Certificates & Test Clearances ({vetDocs.length > 0 ? vetDocs.length : record.verifiedDocuments?.length || 0})
                </span>

                {(vetDocs.length > 0 ? vetDocs : record.verifiedDocuments || []).length > 0 ? (
                  (vetDocs.length > 0 ? vetDocs : record.verifiedDocuments || []).map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs hover:bg-slate-100/60 transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{doc.fileName}</p>
                          <p className="text-[10px] text-slate-400">{doc.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 font-bold rounded-lg text-[10px] hover:bg-slate-50 transition shadow-2xs"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center">
                    Verified digital vaccination records and health clearance documents attached to this order.
                  </div>
                )}
              </div>
            </div>

            {/* Place 3: Customer Delivery Residence */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Location 3: Customer Residence</span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Final Handover & Proof of Delivery (POD)
                    </h4>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <HeartHandshake className="w-3 h-3" /> {deliveryRecord ? 'Delivered' : 'In Transit / Ready'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{record.deliveryAddress}</span>
              </div>

              {deliveryRecord ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Delivered on:</span>
                    <strong className="text-slate-800">
                      {new Date(deliveryRecord.dateTime).toLocaleDateString()} at{' '}
                      {new Date(deliveryRecord.dateTime).toLocaleTimeString()}
                    </strong>
                  </div>
                  {deliveryRecord.agent?.name && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Delivery Agent:</span>
                      <strong className="text-slate-800">{deliveryRecord.agent.name}</strong>
                    </div>
                  )}
                  {deliveryRecord.customerAcknowledgement && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                      <strong>Customer Acknowledgment:</strong> {deliveryRecord.customerAcknowledgement}
                    </p>
                  )}
                  {deliveryRecord.photo && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Proof of Delivery Photo</span>
                      <button
                        type="button"
                        onClick={() => openLightbox([deliveryRecord.photo], 0, 'Proof of Delivery Photo')}
                        className="inline-block w-20 h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition cursor-pointer group"
                      >
                        <img src={deliveryRecord.photo} alt="Delivery Proof" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </button>
                    </div>
                  )}

                  {/* Delivery Handover Documents */}
                  {deliveryDocs.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Verified Handover Receipts ({deliveryDocs.length})
                      </span>
                      {deliveryDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="p-2 rounded-xl border border-slate-100 bg-white flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{doc.fileName}</p>
                              <p className="text-[10px] text-slate-400">{doc.type.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg text-[10px] hover:bg-slate-100 transition shadow-2xs"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Proof of delivery report and customer acknowledgment will be verified upon arrival.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Interactive Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        title={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
