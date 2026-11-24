'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  ExternalLink,
  QrCode,
  Heart,
  Share2,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react';

export default function CustomerPetVerificationPage() {
  const params = useParams();
  const petId = params?.petId as string;

  const [pet, setPet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const res = await fetch(`/api/pets/${petId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPet(data.data);
        } else {
          setError(data.error || 'Pet record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading pet profile');
      } finally {
        setLoading(false);
      }
    };

    if (petId) fetchPet();
  }, [petId]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading verified pet provenance...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Pet Record Not Found</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'The requested Pet ID could not be located in the Furora registry.'}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
          >
            Go to Furora Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Public Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-900">furora</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              Verified Pet Provenance
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition space-x-1.5 shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Link Copied!' : 'Share Record'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Verification Hero Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Furora Certified Customer Provenance</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {pet.breed?.name || 'Verified Pet Profile'}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span>Category: <strong className="text-white font-semibold">{pet.category?.name}</strong></span>
                <span>•</span>
                <span>Pet ID: <strong className="font-mono text-white font-bold">{pet.petId}</strong></span>
                {pet.microchipNumber && (
                  <>
                    <span>•</span>
                    <span>Microchip ID: <strong className="font-mono text-emerald-300 font-bold">{pet.microchipNumber}</strong></span>
                  </>
                )}
                <span>•</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  {pet.status}
                </span>
              </div>
            </div>

            {/* QR Code thumbnail */}
            {pet.qrCodeUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-md flex-shrink-0 self-center sm:self-auto text-center">
                <img
                  src={pet.qrCodeUrl}
                  alt={`QR Code for ${pet.petId}`}
                  className="w-28 h-28 object-contain mx-auto"
                />
                <span className="text-[10px] font-mono font-bold text-slate-600 block mt-1">
                  {pet.petId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pet Details Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Age & Vital Stats */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Age & Vital Stats</span>
            </div>

            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              <div className="pt-1 flex justify-between items-center">
                <span className="text-slate-400">Current Age</span>
                <span className="font-extrabold text-slate-900 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                  {pet.age || 'Dynamic Age'}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold text-slate-800">
                  {new Date(pet.dob).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-400">Sex</span>
                <span className="font-semibold text-slate-800">{pet.sex}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-400">Colour</span>
                <span className="font-semibold text-slate-800">{pet.colour}</span>
              </div>
              {pet.microchipNumber && (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-400">Microchip #</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                    {pet.microchipNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Parentage (Sire & Dam) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Sire & Dam Lineage</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Sire (Father)
                </span>
                <p className="font-bold text-slate-900 text-xs">
                  {pet.fatherName || 'Not recorded'}
                </p>
                {pet.fatherPhoto && (
                  <a
                    href={pet.fatherPhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:underline pt-0.5 space-x-1"
                  >
                    <span>View Photo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Dam (Mother)
                </span>
                <p className="font-bold text-slate-900 text-xs">
                  {pet.motherName || 'Not recorded'}
                </p>
                {pet.motherPhoto && (
                  <a
                    href={pet.motherPhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:underline pt-0.5 space-x-1"
                  >
                    <span>View Photo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: KCI & Certifications */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Award className="w-4 h-4 text-amber-500" />
              <span>KCI Registration</span>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                  pet.kciRegistered
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="inline-flex items-center space-x-1 font-bold text-xs">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      pet.kciRegistered ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                  <span>
                    {pet.kciRegistered
                      ? 'KCI Registered & Certified'
                      : 'Standard Pedigree (Non-KCI)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {pet.kciRegistered
                    ? 'Authenticated through the Kennel Club of India verification lineage.'
                    : 'Purebred lineage without official KCI microchip endorsement.'}
                </p>
              </div>

              {pet.kciDocuments && pet.kciDocuments.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Official Documents
                  </span>
                  {pet.kciDocuments.map((doc: string, idx: number) => (
                    <a
                      key={idx}
                      href={doc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition text-xs font-semibold"
                    >
                      <span className="flex items-center space-x-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">KCI Certificate #{idx + 1}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Gallery (Photos & Videos) */}
        {((pet.photos && pet.photos.length > 0) || (pet.videos && pet.videos.length > 0)) && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Photos & Videos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pet.photos?.map((photo: string, idx: number) => (
                <a
                  key={`photo-${idx}`}
                  href={photo}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 block"
                >
                  <img
                    src={photo}
                    alt={`${pet.petId} photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </a>
              ))}
              {pet.videos?.map((vid: string, idx: number) => (
                <a
                  key={`vid-${idx}`}
                  href={vid}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center p-3 text-center space-y-1 hover:bg-slate-800 transition"
                >
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                  <span className="text-[11px] font-bold">Watch Video #{idx + 1}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Other Details / Markings */}
        {pet.otherDetails && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Identification & Personality Notes</h2>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {pet.otherDetails}
            </p>
          </div>
        )}

        {/* Official Furora Footer */}
        <div className="text-center pt-6 space-y-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Furora. All rights reserved.</p>
          <p className="text-[11px]">
            Information hosted on this QR record is verified and authenticated by Furora.
          </p>
        </div>
      </main>
    </div>
  );
}
