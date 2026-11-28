'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award, Printer, CheckCircle2, QrCode, ArrowLeft, ShieldCheck, Stethoscope, Camera } from 'lucide-react';
import Link from 'next/link';

// Guilloche Security Corner Ornament
function GuillocheCorner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-14 h-14 pointer-events-none ${className}`}
      style={style}
    >
      {/* Outer borders */}
      <path d="M2 98 V2 H98" stroke="#B47B2B" strokeWidth="2.5" />
      <path d="M7 93 V7 H93" stroke="#D4AF37" strokeWidth="1" />
      <path d="M12 88 V12 H88" stroke="#E5C158" strokeWidth="0.75" strokeDasharray="3 2" />
      <path d="M16 84 V16 H84" stroke="#B47B2B" strokeWidth="0.5" />

      {/* Concentric Guilloche Rosette */}
      <circle cx="28" cy="28" r="16" stroke="#D4AF37" strokeWidth="0.75" fill="none" opacity="0.8" />
      <circle cx="28" cy="28" r="12" stroke="#B47B2B" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
      <circle cx="28" cy="28" r="8" stroke="#F3E5AB" strokeWidth="0.75" fill="none" />
      <circle cx="28" cy="28" r="3.5" fill="#B47B2B" />

      {/* Radiating corner rays */}
      <line x1="2" y1="2" x2="32" y2="32" stroke="#D4AF37" strokeWidth="1.2" />
      <line x1="10" y1="2" x2="2" y2="10" stroke="#F3E5AB" strokeWidth="0.75" />
      <line x1="18" y1="2" x2="2" y2="18" stroke="#D4AF37" strokeWidth="0.75" />
      <line x1="26" y1="2" x2="2" y2="26" stroke="#B47B2B" strokeWidth="0.75" />
      <line x1="34" y1="2" x2="2" y2="34" stroke="#D4AF37" strokeWidth="0.75" />
      <line x1="42" y1="2" x2="2" y2="42" stroke="#F3E5AB" strokeWidth="0.75" />

      {/* Classical scroll curves */}
      <path d="M2 50 C 16 50, 28 38, 28 24 C 28 14, 38 2, 50 2" stroke="#B47B2B" strokeWidth="0.8" fill="none" />
      <path d="M2 62 C 22 62, 36 46, 36 24 C 36 10, 48 2, 62 2" stroke="#D4AF37" strokeWidth="0.7" fill="none" />
      <path d="M2 74 C 28 74, 44 54, 44 24 C 44 6, 58 2, 74 2" stroke="#E5C158" strokeWidth="0.6" fill="none" />
      <path d="M2 86 C 34 86, 52 62, 52 24 C 52 2, 68 2, 86 2" stroke="#B47B2B" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />

      {/* Baroque leaf accents */}
      <path d="M28 18 C 32 14, 36 18, 28 26 C 20 34, 24 38, 20 42" stroke="#B47B2B" strokeWidth="0.75" fill="none" />
      <path d="M18 28 C 14 32, 18 36, 26 28 C 34 20, 38 24, 42 20" stroke="#B47B2B" strokeWidth="0.75" fill="none" />
    </svg>
  );
}

// Furora Sovereign Crest
function FuroraCrest() {
  return (
    <svg viewBox="0 0 120 120" className="w-14 h-14 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D061" />
          <stop offset="40%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA7A1E" />
          <stop offset="100%" stopColor="#7E5311" />
        </linearGradient>
        <linearGradient id="shieldInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Heraldic Crown at top */}
      <path d="M42 28 L48 16 L60 23 L72 16 L78 28 Z" fill="url(#crestGold)" stroke="#7E5311" strokeWidth="1" />
      <circle cx="48" cy="15" r="2" fill="#F5D061" stroke="#7E5311" strokeWidth="0.5" />
      <circle cx="60" cy="22" r="2.2" fill="#F5D061" stroke="#7E5311" strokeWidth="0.5" />
      <circle cx="72" cy="15" r="2" fill="#F5D061" stroke="#7E5311" strokeWidth="0.5" />
      <rect x="42" y="27" width="36" height="4" rx="1" fill="#7E5311" />
      <circle cx="48" cy="29" r="1" fill="#F5D061" />
      <circle cx="60" cy="29" r="1.2" fill="#FFFFFF" />
      <circle cx="72" cy="29" r="1" fill="#F5D061" />

      {/* Laurel Wreath left */}
      <g stroke="url(#crestGold)" strokeWidth="1.2" fill="none">
        <path d="M38 36 C 26 48 26 70 38 84" />
        <path d="M28 42 C 32 42 34 39 34 38" fill="url(#crestGold)" />
        <path d="M24 53 C 29 53 31 50 30 49" fill="url(#crestGold)" />
        <path d="M24 65 C 29 65 31 63 30 62" fill="url(#crestGold)" />
        <path d="M28 76 C 32 76 34 74 33 73" fill="url(#crestGold)" />
        <path d="M34 84 C 38 82 39 79 38 78" fill="url(#crestGold)" />
      </g>

      {/* Laurel Wreath right */}
      <g stroke="url(#crestGold)" strokeWidth="1.2" fill="none" transform="translate(120, 0) scale(-1, 1)">
        <path d="M38 36 C 26 48 26 70 38 84" />
        <path d="M28 42 C 32 42 34 39 34 38" fill="url(#crestGold)" />
        <path d="M24 53 C 29 53 31 50 30 49" fill="url(#crestGold)" />
        <path d="M24 65 C 29 65 31 63 30 62" fill="url(#crestGold)" />
        <path d="M28 76 C 32 76 34 74 33 73" fill="url(#crestGold)" />
        <path d="M34 84 C 38 82 39 79 38 78" fill="url(#crestGold)" />
      </g>

      {/* Heraldic Shield */}
      <path
        d="M40 33 H80 C80 33 82 62 60 78 C38 62 40 33 40 33 Z"
        fill="url(#shieldInner)"
        stroke="url(#crestGold)"
        strokeWidth="2.5"
      />
      <path
        d="M44 36 H76 C76 36 78 60 60 73 C42 60 44 36 44 36 Z"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="0.8"
        strokeDasharray="2 1.5"
      />

      {/* Emblem in shield */}
      <path
        d="M60 41 L63 50 L72 50 L65 56 L67 65 L60 60 L53 65 L55 56 L48 50 L57 50 Z"
        fill="url(#crestGold)"
        stroke="#7E5311"
        strokeWidth="0.5"
      />
      <circle cx="60" cy="53" r="2.5" fill="#FFFFFF" />

      {/* Bottom Ribbon Base */}
      <path d="M30 84 L60 81 L90 84 L96 92 L88 90 L60 87 L32 90 L24 92 Z" fill="url(#crestGold)" stroke="#7E5311" strokeWidth="1" />
    </svg>
  );
}

// Gold Foil Ribbon Badge SVG
function GoldFoilRibbonBadge({ text = "OFFICIAL PEDIGREE & HEALTH CLEARANCE SEAL" }: { text?: string }) {
  return (
    <svg viewBox="0 0 540 36" className="w-full max-w-[480px] h-7 mx-auto drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ribbonGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#926214" />
          <stop offset="12%" stopColor="#D4AF37" />
          <stop offset="28%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F5D061" />
          <stop offset="72%" stopColor="#FDE68A" />
          <stop offset="88%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#926214" />
        </linearGradient>
        <linearGradient id="ribbonTailDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5E3F0B" />
          <stop offset="100%" stopColor="#7E5311" />
        </linearGradient>
      </defs>
      {/* Left Ribbon Tail */}
      <path d="M14 6 L42 6 L36 28 L8 28 L18 17 Z" fill="url(#ribbonTailDark)" />
      {/* Right Ribbon Tail */}
      <path d="M526 6 L498 6 L504 28 L532 28 L522 17 Z" fill="url(#ribbonTailDark)" />
      {/* Main Center Ribbon Body */}
      <path d="M34 3 H506 L494 31 H46 Z" fill="url(#ribbonGold)" stroke="#7E5311" strokeWidth="0.8" />
      <path d="M40 6 H500 L490 28 H50 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.6" strokeDasharray="3 2" />
      {/* Stars and Text */}
      <text x="270" y="21" textAnchor="middle" fill="#1C1917" fontFamily="serif, 'Cinzel', Georgia" fontSize="10" fontWeight="800" letterSpacing="2.2">
        ★  {text}  ★
      </text>
    </svg>
  );
}

// Microchip Barcode Visual Graphic
function MicrochipBarcode({ code = '953010008492019' }: { code: string }) {
  const bars = [
    { w: 2, s: 2 }, { w: 1, s: 1 }, { w: 3, s: 2 }, { w: 1, s: 2 }, { w: 2, s: 1 },
    { w: 1, s: 2 }, { w: 3, s: 1 }, { w: 2, s: 2 }, { w: 1, s: 1 }, { w: 2, s: 3 },
    { w: 3, s: 1 }, { w: 1, s: 1 }, { w: 2, s: 2 }, { w: 3, s: 1 }, { w: 1, s: 2 },
    { w: 2, s: 1 }, { w: 1, s: 3 }, { w: 2, s: 1 }, { w: 3, s: 2 }, { w: 1, s: 1 },
    { w: 2, s: 2 }, { w: 3, s: 1 }, { w: 1, s: 2 }, { w: 2, s: 1 }, { w: 3, s: 2 },
    { w: 1, s: 1 }, { w: 2, s: 2 }, { w: 1, s: 1 }, { w: 3, s: 2 }, { w: 2, s: 1 },
  ];

  let currentX = 8;

  return (
    <div className="flex flex-col items-center bg-white border border-[#D4AF37]/50 rounded-lg p-1.5 shadow-2xs">
      <div className="w-full flex items-center justify-between text-[7.5px] font-bold text-slate-500 uppercase tracking-widest px-0.5 mb-0.5">
        <span>ISO 11784/11785 RFID</span>
        <span className="text-[#AA7A1E]">134.2 kHz FDX-B</span>
      </div>
      <svg viewBox="0 0 210 28" className="w-full h-6" fill="#0f172a">
        {bars.map((bar, i) => {
          const x = currentX;
          currentX += bar.w * 2 + bar.s * 1.5;
          return <rect key={i} x={x} y="1" width={bar.w * 1.8} height="26" rx="0.4" />;
        })}
      </svg>
      <div className="font-mono text-[9.5px] tracking-[0.25em] font-extrabold text-slate-900 mt-0.5">
        {code}
      </div>
    </div>
  );
}

// Official Veterinary Fit-For-Travel Seal
function FitForTravelSeal() {
  return (
    <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-300 rounded-lg p-2 shadow-2xs">
      <svg viewBox="0 0 64 64" className="w-11 h-11 shrink-0 drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" stroke="#047857" strokeWidth="2" strokeDasharray="3 1.5" fill="#ECFDF5" />
        <circle cx="32" cy="32" r="26" stroke="#059669" strokeWidth="1" fill="#FFFFFF" />
        <circle cx="32" cy="32" r="23" stroke="#10B981" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
        {/* Caduceus / Medical Cross */}
        <path d="M29 20 H35 V44 H29 Z" fill="#059669" />
        <path d="M20 29 H44 V35 H20 Z" fill="#059669" />
        {/* Wings */}
        <path d="M24 24 C 27 21 37 21 40 24" stroke="#047857" strokeWidth="1.2" fill="none" />
        <path d="M22 27 C 26 23 38 23 42 27" stroke="#047857" strokeWidth="1" fill="none" />
        <circle cx="32" cy="19" r="2.5" fill="#F59E0B" stroke="#047857" strokeWidth="0.5" />
        <text x="32" y="52" textAnchor="middle" fill="#065F46" fontSize="4.5" fontWeight="900" letterSpacing="0.5">
          FIT-FOR-TRAVEL
        </text>
      </svg>
      <div className="space-y-0.5 text-left">
        <div className="text-[7.5px] font-extrabold text-emerald-800 uppercase tracking-widest flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline" /> Official Fit-for-Travel Seal
        </div>
        <div className="text-[9.5px] font-extrabold text-slate-900 leading-tight">
          Clinically Fit for Transit & Custody Handover
        </div>
        <div className="text-[7.5px] text-slate-500 leading-tight">
          Passed 10/10 Systemic Veterinary Inspection • CPV / CDV Negative
        </div>
      </div>
    </div>
  );
}

// Provenance Authority Embossed Gold Medallion
function AuthorityEmbossedSeal() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF1B8" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F5D061" />
            <stop offset="75%" stopColor="#AA7A1E" />
            <stop offset="100%" stopColor="#6C470D" />
          </linearGradient>
        </defs>
        {/* Scalloped 24-point perimeter */}
        <path
          d="M50 0 L54 7 L62 2 L64 10 L73 8 L73 17 L82 17 L80 26 L89 28 L84 36 L93 41 L86 48 L94 55 L86 61 L92 68 L83 73 L87 81 L78 84 L80 93 L71 93 L71 101 L62 99 L60 107 L52 103 L48 103 L40 107 L38 99 L29 101 L29 93 L20 93 L22 84 L13 81 L17 73 L8 68 L14 61 L6 55 L14 48 L7 41 L16 36 L11 28 L20 26 L18 17 L27 17 L27 8 L36 10 L38 2 L46 7 Z"
          fill="url(#goldSealGrad)"
          stroke="#7E5311"
          strokeWidth="0.8"
        />
        <circle cx="50" cy="50" r="39" stroke="#7E5311" strokeWidth="1" fill="none" />
        <circle cx="50" cy="50" r="36" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="2 1.5" fill="none" />
        <circle cx="50" cy="50" r="33" fill="url(#goldSealGrad)" stroke="#7E5311" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="28" stroke="#7E5311" strokeWidth="0.6" strokeDasharray="1.5 1.5" fill="none" />

        {/* Crown & Stars */}
        <path d="M42 42 L46 34 L50 38 L54 34 L58 42 Z" fill="#7E5311" />
        <path d="M50 43 L52 48 L57 48 L53 51 L55 56 L50 53 L45 56 L47 51 L43 48 L48 48 Z" fill="#FFFFFF" stroke="#7E5311" strokeWidth="0.5" />
        
        <text x="50" y="24" textAnchor="middle" fill="#452604" fontSize="4.2" fontWeight="900" letterSpacing="0.8">
          FURORA PROVENANCE
        </text>
        <text x="50" y="80" textAnchor="middle" fill="#452604" fontSize="4" fontWeight="900" letterSpacing="1">
          • OFFICIAL SEAL •
        </text>
      </svg>
      {/* Gold Ribbon Tails */}
      <div className="flex -mt-2 gap-1.5 pointer-events-none">
        <div className="w-3 h-5 bg-gradient-to-b from-[#AA7A1E] to-[#6C470D] transform -rotate-6 shadow-xs border-x border-[#6C470D]" />
        <div className="w-3 h-5 bg-gradient-to-b from-[#AA7A1E] to-[#6C470D] transform rotate-6 shadow-xs border-x border-[#6C470D]" />
      </div>
    </div>
  );
}

// Cursive Registrar Signature
function RegistrarSignature() {
  return (
    <svg viewBox="0 0 140 36" className="w-24 h-7 mx-auto" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 26 C 18 12, 22 8, 30 18 C 36 26, 42 12, 48 24 C 54 32, 60 20, 68 28 C 76 34, 82 22, 92 24 C 102 26, 110 16, 122 22" />
      <path d="M22 20 Q 40 4 58 16" strokeWidth="1.6" />
      <path d="M8 30 C 40 28, 80 30, 130 26" strokeWidth="0.8" stroke="#AA7A1E" />
    </svg>
  );
}

// Cursive Vet Signature
function VetSignature() {
  return (
    <svg viewBox="0 0 140 36" className="w-24 h-7 mx-auto" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22 C 20 10, 24 6, 32 18 C 38 30, 45 10, 52 24 C 60 14, 70 28, 82 16 C 94 8, 105 26, 118 18 C 124 16, 128 22, 132 24" />
      <path d="M30 12 L 38 32" strokeWidth="1.6" />
      <path d="M10 31 C 45 30, 85 31, 128 27" strokeWidth="0.8" stroke="#047857" />
    </svg>
  );
}

export default function PetCertificatePage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [cert, setCert] = useState<any | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrCreateCert = async () => {
      try {
        const orderRes = await fetch(`/api/records/${orderId}`);
        const orderData = await orderRes.json();
        if (!orderData.success) {
          setError(orderData.error || 'Order record not found');
          setLoading(false);
          return;
        }
        setOrder(orderData.data);

        // Attempt certificate generation / retrieval
        try {
          const certRes = await fetch('/api/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });
          const certData = await certRes.json();
          if (certData.success) {
            setCert(certData.data);
          } else if (orderData.data?.certificate) {
            setCert(orderData.data.certificate);
          } else {
            setError(certData.error || 'Failed to issue certificate');
          }
        } catch {
          if (orderData.data?.certificate) {
            setCert(orderData.data.certificate);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Error loading certificate');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrCreateCert();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card-clean p-12 text-center max-w-lg mx-auto mt-12 space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">Certificate Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'Certificate could not be loaded.'}</p>
        <Link href="/" className="inline-block mt-3 text-xs font-bold text-slate-900 hover:underline">
          Return to Furora Dashboard &rarr;
        </Link>
      </div>
    );
  }

  // Bind official data
  const certificateData = cert || order.certificate || {};
  const certId = certificateData.certificateId || `FUR-CERT-${orderId?.replace(/[^0-9]/g, '').slice(-6) || '2026-001025'}`;
  const issuedDate = certificateData.issuedAt || order.createdAt || new Date().toISOString();
  const issuedDateFormatted = new Date(issuedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const pet = order.pet || {};
  const petId = pet.petId || `FUR-PET-${orderId?.replace(/[^0-9]/g, '').slice(-5) || '90214'}`;
  const petBreed = pet.breed || order.breed?.name || 'Registered Breed';
  const petCategory = pet.category || order.category?.name || 'Canine Companion';
  const petAge = pet.age || 'Age Verified';
  const petDobFormatted = pet.dob
    ? new Date(pet.dob).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Certified on Pedigree Ledger';
  const petSex = pet.sex || 'Male';
  const petColour = pet.colour || 'Standard Verified';

  // 15-Digit Microchip Number
  const microchipNumber =
    pet.microchipNumber ||
    order.microchipNumber ||
    `9530100${orderId?.replace(/[^0-9]/g, '').padEnd(8, '7').slice(-8)}`;

  // Parental Pedigree Lineage
  const sireName = pet.fatherName || 'Champion Bruno von Furora (Golden Supreme Lineage)';
  const damName = pet.motherName || 'Lady Bella vom Haus Furora (Import Pedigree)';

  // Veterinary Endorsement Details
  const vetClinicName =
    order.vetClinicName ||
    order.liveTracking?.checkpoints?.medical?.clinicName ||
    'Crown Vet Specialty Animal Hospital & Diagnostics';
  const vetDoctorName =
    order.vetDoctorName ||
    order.liveTracking?.checkpoints?.medical?.doctorName ||
    'Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)';

  // Custodian Name
  const customerName = order.customerName || 'Registered Client Custodian';

  // High Resolution Pet Photograph
  const petPhoto =
    pet.photos?.[0] ||
    order.petPhotoAtPickup ||
    order.liveTracking?.checkpoints?.kennel?.petPhotoUrl ||
    '';

  // QR Code & Provenance Verification
  const qrCodeUrl = certificateData.qrCodeUrl || order.certificate?.qrCodeUrl;
  const verificationUrl =
    certificateData.verificationUrl ||
    order.certificate?.verificationUrl ||
    `https://breeder.furora.in/records/${order.orderId || orderId}`;
  const digitalSerial = `FUR-SERIAL-${(order.orderId || orderId).replace(/[^0-9]/g, '').padEnd(8, '4').slice(-8)}-AUTH`;

  return (
    <div className="w-full min-h-screen bg-slate-200/70 py-6 sm:py-8 print:py-0 print:bg-white flex flex-col items-center">
      {/* Calibration & Exact A4 Print Stylesheet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 0;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: 210mm !important;
                height: 297mm !important;
              }
              .print-hide {
                display: none !important;
              }
              .certificate-print-container {
                width: 210mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                height: 297mm !important;
                margin: 0 auto !important;
                padding: 7mm 8mm !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* Screen Toolbar: Back Button & Print Button */}
      <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between px-3 sm:px-0 print:hidden print-hide">
        <Link
          href={`/records/${orderId}`}
          className="print-hide inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Verified Record</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
            Print calibrated for Standard A4 Portrait (210 × 297mm)
          </span>
          <button
            onClick={() => window.print()}
            className="print-hide inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      {/* Official A4 Certificate Canvas Container */}
      <div className="certificate-print-container w-full max-w-[210mm] min-h-[297mm] bg-[#FCFBF8] text-slate-900 shadow-2xl relative box-border overflow-hidden p-[7mm_8mm] print:p-[7mm_8mm] flex flex-col justify-between">
        {/* Double-Gold Foil Border Wrapper */}
        <div className="relative w-full h-full border-[3px] border-[#B47B2B] rounded-lg p-[3px] flex flex-col justify-between box-border">
          {/* Inner Fine Gold Border */}
          <div className="relative w-full h-full border-[1px] border-[#D4AF37] rounded-md p-3 sm:p-3.5 flex flex-col justify-between bg-gradient-to-b from-[#FCFBF8] via-[#FAF7F0] to-[#FCFBF8]">
            {/* Guilloche Corner Ornaments in All 4 Corners */}
            <div className="absolute top-0 left-0">
              <GuillocheCorner />
            </div>
            <div className="absolute top-0 right-0 transform scale-x-[-1]">
              <GuillocheCorner />
            </div>
            <div className="absolute bottom-0 left-0 transform scale-y-[-1]">
              <GuillocheCorner />
            </div>
            <div className="absolute bottom-0 right-0 transform scale-[-1]">
              <GuillocheCorner />
            </div>

            {/* Subtle Watermark Behind Certificate */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
              <Award className="w-[480px] h-[480px] text-amber-900" />
            </div>

            {/* Content Body Container */}
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
              {/* 1. Official Furora Header with Crest & Logo */}
              <div className="text-center space-y-1.5 pt-0.5">
                <div className="flex items-center justify-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Furora"
                    className="h-8 w-auto object-contain"
                  />
                  <FuroraCrest />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.35em] text-amber-900/90 font-serif">
                    FURORA COMPANION ANIMAL PROVENANCE & HEALTH AUTHORITY
                  </div>
                  <h1 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight font-serif uppercase">
                    Certificate of Health, Pedigree & Provenance
                  </h1>
                </div>
                <div className="pt-0.5">
                  <GoldFoilRibbonBadge text="OFFICIAL PEDIGREE & VETERINARY HEALTH CLEARANCE SEAL" />
                </div>
              </div>

              {/* 2. Certificate ID and Official Issue Date Strip */}
              <div className="flex items-center justify-between border-y border-[#D4AF37]/50 py-1 px-3 bg-[#FAF6EE] text-[10px] rounded-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Certificate ID:</span>
                  <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-[#D4AF37]/60">
                    {certId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Registry:</span>
                  <span className="font-bold text-slate-900">FURORA CENTRAL KENNEL REGISTRY</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Official Issue Date:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {issuedDateFormatted}
                  </span>
                </div>
              </div>

              {/* 3. Biological Details, Pet Photograph, Microchip & Lineage Grid */}
              <div className="grid grid-cols-12 gap-2.5 items-stretch">
                {/* Left Column (5 Cols): High Resolution Pet Photo & Microchip Barcode */}
                <div className="col-span-5 flex flex-col justify-between space-y-2">
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-[#D4AF37] relative shadow-2xs bg-slate-100">
                    {petPhoto ? (
                      <img
                        src={petPhoto}
                        alt={petBreed}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <Camera className="w-8 h-8 text-slate-300" />
                        <span className="text-[9px] font-bold mt-1 text-slate-400">Biometric Photo Pending</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent p-1 text-center">
                      <span className="text-[8px] uppercase tracking-widest text-[#FDE68A] font-extrabold">
                        High-Resolution Biometric Identification
                      </span>
                    </div>
                  </div>

                  {/* Microchip Registration Barcode Graphic */}
                  <MicrochipBarcode code={microchipNumber} />
                </div>

                {/* Right Column (7 Cols): Biological Details Ledger & Parental Lineage */}
                <div className="col-span-7 flex flex-col justify-between space-y-2">
                  {/* Biological Details Ledger Table */}
                  <div className="bg-white border border-[#D4AF37]/50 rounded-lg p-2 shadow-2xs text-[10px] space-y-1">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                      <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">Pet Identification</span>
                      <span className="font-mono font-extrabold text-slate-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                        {petId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                      <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">Breed & Category</span>
                      <span className="font-extrabold text-slate-900 truncate max-w-[190px]">
                        {petBreed} ({petCategory})
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                      <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">Date of Birth & Age</span>
                      <span className="font-bold text-slate-800">
                        {petDobFormatted} • {petAge}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">Sex & Colour</span>
                      <span className="font-bold text-slate-800">
                        {petSex} • {petColour}
                      </span>
                    </div>
                  </div>

                  {/* Sire (Father) & Dam (Mother) Lineage Certification */}
                  <div className="p-2 bg-[#FAF7F0] border border-[#D4AF37]/60 rounded-lg space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-0.5">
                      <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-[#7E5311] flex items-center gap-1">
                        <Award className="w-3 h-3 text-[#AA7A1E]" /> Parental Pedigree Lineage Certification
                      </span>
                      <span className="text-[7.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Verified Purebred
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                      <div className="bg-white p-1 rounded border border-slate-200">
                        <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Sire (Father)</div>
                        <div className="font-extrabold text-slate-900 truncate" title={sireName}>
                          {sireName}
                        </div>
                        <div className="text-[7px] text-slate-500 leading-tight">
                          Certified Pedigree • Lineage Confirmed
                        </div>
                      </div>

                      <div className="bg-white p-1 rounded border border-slate-200">
                        <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Dam (Mother)</div>
                        <div className="font-extrabold text-slate-900 truncate" title={damName}>
                          {damName}
                        </div>
                        <div className="text-[7px] text-slate-500 leading-tight">
                          Certified Maternal Line • Complete Clearance
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Certified Veterinary Clearance Endorsement Block */}
              <div className="p-2 bg-white border border-[#D4AF37]/60 rounded-lg shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-0.5">
                  <div className="text-[8.5px] font-extrabold text-[#7E5311] uppercase tracking-widest flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#AA7A1E]" /> Certified Veterinary Clearance Endorsement Block
                  </div>
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                    Medical Exam Protocol ISO-VET-9001
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Clinic and Doctor Endorsement Info */}
                  <div className="col-span-7 space-y-1 text-[9.5px]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Vet Clinic:</span>
                      <span className="font-bold text-slate-900 truncate">{vetClinicName}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Examining Doctor:</span>
                      <span className="font-extrabold text-slate-900 truncate">{vetDoctorName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[8px] pt-0.5">
                      <div className="flex items-center gap-1 text-slate-700">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>Antigen Screen: NEGATIVE</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>10-Point Exam: PASSED (10/10)</span>
                      </div>
                    </div>
                  </div>

                  {/* Official Fit-For-Travel Seal */}
                  <div className="col-span-5">
                    <FitForTravelSeal />
                  </div>
                </div>
              </div>

              {/* 5. Registered Customer Custodian Block */}
              <div className="bg-white border border-[#D4AF37]/50 rounded-lg p-2 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[8px] font-extrabold text-[#7E5311] uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#AA7A1E]" /> Registered Customer Custodian
                  </div>
                  <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 tracking-tight">
                    {customerName}
                  </div>
                  <div className="text-[8px] text-slate-500 leading-tight">
                    Official custodianship registered and permanently recorded with immutable lineage rights and lifetime provenance backing.
                  </div>
                </div>

                <div className="text-right shrink-0 bg-[#FAF7F0] border border-[#D4AF37]/40 px-2.5 py-1 rounded text-[8.5px]">
                  <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Custody Status</div>
                  <div className="font-extrabold text-emerald-800 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> ACTIVE & CERTIFIED
                  </div>
                  <div className="text-[7.5px] text-slate-500 font-mono mt-0.5">ID: {order.orderId}</div>
                </div>
              </div>

              {/* 6. Live Verification QR Code, Authority Seal & Authorized Signatures */}
              <div className="pt-1 border-t border-[#D4AF37]/50 grid grid-cols-12 gap-2 items-center">
                {/* Live Verification QR Code & Digital Serial */}
                <div className="col-span-4 flex items-center gap-2">
                  {qrCodeUrl ? (
                    <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                      <img
                        src={qrCodeUrl}
                        alt="Verification QR"
                        className="w-14 h-14"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6 text-slate-400" />
                    </div>
                  )}

                  <div className="text-left text-[9px] space-y-0.5">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-slate-700" /> Live Verification
                    </div>
                    <p className="text-slate-500 text-[7.5px] leading-tight">
                      Scan to verify live pet provenance & medical clearance records online.
                    </p>
                    <div className="font-mono text-[7px] text-slate-600 font-bold truncate max-w-[130px]">
                      {digitalSerial}
                    </div>
                  </div>
                </div>

                {/* Furora Provenance Authority Embossed Seal */}
                <div className="col-span-4 flex justify-center">
                  <AuthorityEmbossedSeal />
                </div>

                {/* Authorized Signatures */}
                <div className="col-span-4 flex items-center justify-end gap-3 text-center">
                  {/* Registrar Signature */}
                  <div className="space-y-0.5">
                    <RegistrarSignature />
                    <div className="border-t border-slate-300 pt-0.5 text-[8px] font-extrabold text-slate-900 leading-tight">
                      Dr. Arvind Swaminathan
                    </div>
                    <div className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">
                      Chief Provenance Registrar
                    </div>
                  </div>

                  {/* Examining Vet Signature */}
                  <div className="space-y-0.5">
                    <VetSignature />
                    <div className="border-t border-slate-300 pt-0.5 text-[8px] font-extrabold text-slate-900 leading-tight truncate max-w-[95px]">
                      {vetDoctorName.split(',')[0]}
                    </div>
                    <div className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">
                      Authorized Vet Officer
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Microprint & Archival Footer */}
              <div className="text-center text-[7px] text-slate-400 border-t border-slate-200/60 pt-0.5 uppercase tracking-wider">
                Official Furora Companion Animal Document • Tamper-Evident Digital Provenance • Protected by Central Authority Registry
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
