'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import {
  Truck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Camera,
  MapPin,
  Store,
  Check,
  Sparkles,
  FileCheck2,
  User,
  Phone,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Upload,
  FileText,
  ExternalLink,
  Stethoscope,
  Info,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { compressImageClientSide } from '@/lib/client-image-compressor';

// 10-Point Physical Pickup Inspection Checklist Items
const INSPECTION_POINTS = [
  'Alert posture, energetic demeanor & normal gait',
  'Clear eyes with no signs of discharge, cloudiness or redness',
  'Clean ears and clear nasal passages without irritation',
  'Normal resting respiratory rate and unlabored breathing',
  'Healthy, shiny coat with zero evidence of ticks, fleas or skin rashes',
  'Pink, healthy gums with normal hydration capillary refill',
  'Clean paws, intact pads, normal nail length & joint mobility',
  'Microchip / Pet ID verification confirmed against physical record',
  'Normal body temperature and alert responsiveness',
  'Transport carrier sanitized, ventilated, and lined with clean pad',
];

interface AgentCameraPhotoUploadProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  description?: string;
  badge?: string;
}

function AgentCameraPhotoUpload({
  label,
  required,
  value,
  onChange,
  folder,
  description,
  badge,
}: AgentCameraPhotoUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 20MB limit. Please choose a smaller photo.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      // 1. Client-side compression
      let uploadFile = file;
      try {
        uploadFile = await compressImageClientSide(file, 1600, 1600, 0.82);
      } catch (cErr) {
        console.warn('Client-side compression fallback:', cErr);
      }

      // 2. Direct multipart upload to /api/upload
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo to Cloudflare R2');
      }

      onChange(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {badge}
          </span>
        )}
      </div>

      {description && <p className="text-[10px] text-slate-400">{description}</p>}

      {/* Hidden File Inputs: Camera & Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Uploading State */}
      {isUploading ? (
        <div className="p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center space-y-2 animate-pulse">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-[11px] font-bold text-indigo-900">
            Compressing & streaming photo to Cloudflare R2 ({folder})...
          </p>
        </div>
      ) : value ? (
        /* Image Preview State */
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 relative group">
          <div className="relative h-44 sm:h-48 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>R2 Active</span>
            </div>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-900 transition shadow-sm text-[10px] font-bold flex items-center gap-1"
              title="Open full photo in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
              {value.split('/').pop() || 'photo.webp'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                title="Open device camera"
              >
                <Camera className="w-3 h-3 text-indigo-600" />
                <span className="hidden sm:inline">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                title="Select photo from files"
              >
                <Upload className="w-3 h-3 text-slate-600" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Remove photo"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Pick State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`p-4 rounded-xl border-2 border-dashed text-center transition ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 mx-auto flex items-center justify-center text-slate-600 mb-2">
            <Camera className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Camera Photo</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Browse Gallery</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Tap to capture or drop photo here • Streams directly to Cloudflare R2 ({folder})
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface AgentDocumentUploadProps {
  label: string;
  required?: boolean;
  value: string;
  fileName?: string;
  onChange: (url: string, fileName?: string) => void;
  folder: string;
  description?: string;
  acceptedTypes?: string;
}

function AgentDocumentUpload({
  label,
  required,
  value,
  fileName,
  onChange,
  folder,
  description,
  acceptedTypes = '.pdf,.jpg,.jpeg,.png,.webp',
}: AgentDocumentUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(
    fileName || (value ? value.split('/').pop() || 'Document.pdf' : '')
  );

  React.useEffect(() => {
    if (fileName) {
      setCurrentFileName(fileName);
    } else if (value) {
      const extracted = value.split('/').pop();
      if (extracted) setCurrentFileName(extracted);
    }
  }, [fileName, value]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds 25MB limit. Please upload a smaller file.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          uploadFile = await compressImageClientSide(file, 1600, 1600, 0.82);
        } catch (cErr) {
          console.warn('Client-side compression fallback:', cErr);
        }
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document to Cloudflare R2');
      }

      setCurrentFileName(data.fileName);
      onChange(data.url, data.fileName);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const isImageFile =
    value &&
    (value.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) ||
      value.includes('unsplash.com') ||
      value.includes('images'));

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>R2 Stored</span>
          </span>
        )}
      </div>

      {description && <p className="text-[10px] text-slate-400">{description}</p>}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Uploading State */}
      {isUploading ? (
        <div className="p-3.5 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center space-y-1.5 animate-pulse">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-[11px] font-bold text-indigo-900">
            Streaming document to Cloudflare R2 ({folder})...
          </p>
        </div>
      ) : value ? (
        /* Uploaded Document Card with Filename & Status Preview */
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 transition">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isImageFile ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-200 bg-slate-100 flex-shrink-0">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 stroke-[2]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 truncate">
                {currentFileName || 'Uploaded Document'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Encrypted on Cloudflare R2 ({folder})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition shadow-2xs cursor-pointer"
              title="Open document in new window"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Replace document"
            >
              <Upload className="w-3 h-3 text-slate-500" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('', '');
                setCurrentFileName('');
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Remove document"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-3.5 rounded-xl border-2 border-dashed text-center transition cursor-pointer flex items-center justify-center gap-3 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
            <Upload className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-800">
              Click to upload document or drop file
            </p>
            <p className="text-[10px] text-slate-400">
              PDF, JPG, PNG up to 25MB • R2 folder: <code>{folder}</code>
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AgentOrderWorkflowContent() {
  const { currentUser } = useSession();
  const searchParams = useSearchParams();
  const targetOrderId = searchParams.get('orderId') || '';

  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 10-point checklist state - All UNCHECKED (false) by default per operational mandate
  const [checklist, setChecklist] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false,
  });

  // Bidirectional stage tab selection (null = auto follows live trip max stage)
  const [activeStageTab, setActiveStageTab] = useState<number | null>(null);
  // Track locally accepted orders en route to breeder facility
  const [localEnRouteOrders, setLocalEnRouteOrders] = useState<Record<string, boolean>>({});

  // Stage 1: Acceptance Notes
  const [acceptanceNotes, setAcceptanceNotes] = useState('Agent accepted delivery assignment. Transit vehicle sanitized and en route to partner breeder kennel.');

  // Stage 2: Vendor Pickup & Document Collection Form State - CLEAN BY DEFAULT (NO RANDOM MOCKS)
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [microchipVerified, setMicrochipVerified] = useState(false);
  const [physicalCondition, setPhysicalCondition] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState('');
  const [vaccinationCardUrl, setVaccinationCardUrl] = useState('');
  const [vaccinationCardName, setVaccinationCardName] = useState('');
  const [dewormingRecordUrl, setDewormingRecordUrl] = useState('');
  const [dewormingRecordName, setDewormingRecordName] = useState('');
  const [pedigreeDocUrl, setPedigreeDocUrl] = useState('');
  const [pedigreeDocName, setPedigreeDocName] = useState('');
  const [pickupFailureReason, setPickupFailureReason] = useState('');

  // Stage 3: Medical Center Form State - CLEAN BY DEFAULT
  const [vetClinicName, setVetClinicName] = useState('Crown Vet Specialty Animal Hospital & Diagnostics');
  const [vetDoctorName, setVetDoctorName] = useState('Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)');
  const [parvoTestResult, setParvoTestResult] = useState<'NEGATIVE' | 'POSITIVE'>('NEGATIVE');
  const [distemperTestResult, setDistemperTestResult] = useState<'NEGATIVE' | 'POSITIVE'>('NEGATIVE');
  const [coronaTestResult, setCoronaTestResult] = useState<'NEGATIVE' | 'POSITIVE'>('NEGATIVE');
  const [medicalCertUrl, setMedicalCertUrl] = useState('');
  const [medicalCertName, setMedicalCertName] = useState('');
  const [antigenPhotoUrl, setAntigenPhotoUrl] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Stage 4: Customer Delivery Handover Form State - CLEAN BY DEFAULT
  const [deliveryCustId, setDeliveryCustId] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState('');
  const [deliverySignature, setDeliverySignature] = useState('');
  const [deliveryAck, setDeliveryAck] = useState('');

  // Load agent orders
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setAssignedOrders(data.data);

        // Pre-select order if query param supplied
        if (targetOrderId) {
          const match = data.data.find(
            (o: any) => o.id === targetOrderId || o.orderId === targetOrderId
          );
          if (match) {
            setSelectedOrder(match);
            syncOrderState(match);
            return;
          }
        }

        // Default to active order in progress
        const active = data.data.find(
          (o: any) =>
            o.status !== 'DELIVERY_COMPLETED' && o.status !== 'CANCELLED_REFUNDED'
        );
        if (active) {
          setSelectedOrder(active);
          syncOrderState(active);
        } else if (data.data.length > 0) {
          setSelectedOrder(data.data[0]);
          syncOrderState(data.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const syncOrderState = (order: any) => {
    setActiveStageTab(null);
    if (order?.pet?.microchipNumber) {
      setMicrochipNumber(order.pet.microchipNumber);
      setMicrochipVerified(true);
    } else {
      setMicrochipNumber('');
      setMicrochipVerified(false);
    }

    setPickupPhotoUrl(order?.petPhotoAtPickup || '');
    setVetClinicName(order?.vetClinicName || 'Crown Vet Specialty Animal Hospital & Diagnostics');
    setVetDoctorName(order?.vetDoctorName || 'Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)');
    setMedicalCertUrl(order?.medicalCertUrl || '');

    // Check documents if present on order
    if (Array.isArray(order?.documents)) {
      const vax = order.documents.find((d: any) => d.type === 'KENNEL_VACCINATION_CARD');
      if (vax) {
        setVaccinationCardUrl(vax.fileUrl);
        setVaccinationCardName(vax.fileName);
      } else {
        setVaccinationCardUrl('');
        setVaccinationCardName('');
      }

      const dew = order.documents.find((d: any) => d.type === 'KENNEL_DEWORMING_RECORD');
      if (dew) {
        setDewormingRecordUrl(dew.fileUrl);
        setDewormingRecordName(dew.fileName);
      } else {
        setDewormingRecordUrl('');
        setDewormingRecordName('');
      }

      const ped = order.documents.find((d: any) => d.type === 'KENNEL_PEDIGREE_CERTIFICATE');
      if (ped) {
        setPedigreeDocUrl(ped.fileUrl);
        setPedigreeDocName(ped.fileName);
      } else {
        setPedigreeDocUrl('');
        setPedigreeDocName('');
      }

      const med = order.documents.find((d: any) => d.type === 'VET_MEDICAL_CERTIFICATE');
      if (med) {
        setMedicalCertUrl(med.fileUrl);
        setMedicalCertName(med.fileName);
      }

      const ant = order.documents.find((d: any) => d.type === 'VET_VIRAL_TEST_REPORT');
      if (ant) {
        setAntigenPhotoUrl(ant.fileUrl);
      } else {
        setAntigenPhotoUrl('');
      }
    } else {
      setVaccinationCardUrl('');
      setVaccinationCardName('');
      setDewormingRecordUrl('');
      setDewormingRecordName('');
      setPedigreeDocUrl('');
      setPedigreeDocName('');
      setAntigenPhotoUrl('');
    }

    if (Array.isArray(order?.inspections) && order.inspections.length > 0) {
      const latestInsp = order.inspections[order.inspections.length - 1];
      if (latestInsp.physicalCondition) setPhysicalCondition(latestInsp.physicalCondition);
      if (latestInsp.notes) setPickupNotes(latestInsp.notes);
      if (latestInsp.failureReason) setPickupFailureReason(latestInsp.failureReason);
      if (Array.isArray(latestInsp.photos) && latestInsp.photos.length > 0 && !order?.petPhotoAtPickup) {
        setPickupPhotoUrl(latestInsp.photos[0]);
      }
      // Populate checklist if saved
      const allChecked: Record<number, boolean> = {};
      INSPECTION_POINTS.forEach((_, idx) => {
        allChecked[idx] = true;
      });
      setChecklist(allChecked);
    } else {
      setPhysicalCondition('');
      setPickupNotes('');
      setPickupFailureReason('');
      const allUnchecked: Record<number, boolean> = {};
      INSPECTION_POINTS.forEach((_, idx) => {
        allUnchecked[idx] = false;
      });
      setChecklist(allUnchecked);
    }

    if (order?.deliveryRecord) {
      setDeliveryPhoto(order.deliveryRecord.photo || '');
      setDeliveryCustId(order.deliveryRecord.customerIdCaptured || '');
      setDeliverySignature(order.deliveryRecord.signedDeliveryReport || '');
      setDeliveryAck(order.deliveryRecord.customerAcknowledgement || '');
    } else {
      setDeliveryPhoto('');
      setDeliveryCustId('');
      setDeliverySignature('');
      setDeliveryAck('');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Checklist Helpers
  const handleCheckAllPoints = () => {
    const allChecked: Record<number, boolean> = {};
    INSPECTION_POINTS.forEach((_, idx) => {
      allChecked[idx] = true;
    });
    setChecklist(allChecked);
  };

  const handleToggleChecklist = (idx: number) => {
    setChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Stage 1 Action A: Accept Delivery Assignment (Keeps order in Stage 1 en route)
  const handleAcceptAssignment = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PICKUP_ASSIGNED',
          estimatedDeliveryTime: 'EN_ROUTE_TO_BREEDER',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept order assignment');

      setLocalEnRouteOrders((prev) => ({ ...prev, [selectedOrder.id]: true }));
      setSelectedOrder((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'PICKUP_ASSIGNED',
              estimatedDeliveryTime: 'EN_ROUTE_TO_BREEDER',
            }
          : prev
      );
      alert('Assignment accepted! You are now en route to the breeder kennel facility. Stage 1 remains active until you arrive physically at the kennel.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 1 Action B: Mark Arrived at Breeder Kennel (Advances trip to Stage 2)
  const handleArriveAtKennel = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PICKUP_INSPECTION',
          estimatedDeliveryTime: 'ARRIVED_AT_KENNEL',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record arrival at breeder kennel');

      setSelectedOrder((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'PICKUP_INSPECTION',
              estimatedDeliveryTime: 'ARRIVED_AT_KENNEL',
            }
          : prev
      );
      setActiveStageTab(2);
      alert('Arrival confirmed! You have physically reached the breeder kennel. Stage 2 Inspection & Document Collection is now open.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 2 Action: Complete Pickup & Collect Documents
  const handleInspection = async (result: 'ACCEPT' | 'FAIL') => {
    if (!selectedOrder) return;
    if (result === 'FAIL' && !pickupFailureReason.trim()) {
      alert('Please enter a mandatory failure reason when rejecting pickup');
      return;
    }

    setSubmitting(true);
    try {
      // Build documents payload for backend linking
      const documentsPayload = [
        {
          type: 'KENNEL_VACCINATION_CARD',
          visibility: 'CUSTOMER_VISIBLE',
          fileUrl: vaccinationCardUrl,
          fileName: vaccinationCardName || `Breeder Kennel Vaccination Card - ${selectedOrder.breed?.name || 'Pet'}.pdf`,
        },
        {
          type: 'KENNEL_DEWORMING_RECORD',
          visibility: 'CUSTOMER_VISIBLE',
          fileUrl: dewormingRecordUrl,
          fileName: dewormingRecordName || `Deworming Certification Record - ${selectedOrder.breed?.name || 'Pet'}.pdf`,
        },
        {
          type: 'KENNEL_PEDIGREE_CERTIFICATE',
          visibility: 'CUSTOMER_VISIBLE',
          fileUrl: pedigreeDocUrl,
          fileName: pedigreeDocName || `Official Pedigree & Lineage Document - ${selectedOrder.breed?.name || 'Pet'}.pdf`,
        },
      ];

      const res = await fetch('/api/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          result,
          physicalCondition,
          notes: pickupNotes,
          photos: [pickupPhotoUrl],
          failureReason: result === 'FAIL' ? pickupFailureReason : null,
          microchipVerified,
          microchipNumber: microchipNumber.trim() || selectedOrder.pet?.microchipNumber,
          documents: documentsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit inspection');

      alert(
        `Pickup inspection submitted: ${
          result === 'ACCEPT'
            ? 'PASSED! Documents and pet collected. Moving to Partner Medical Center.'
            : 'FAILED! Pet rejected and retained by vendor.'
        }`
      );
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 3 Action: Complete Medical Examination & Clearance
  const handleMedicalClearance = async (result: 'APPROVED' | 'FAILED') => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          petId: selectedOrder.petId,
          result,
          reason: result === 'FAILED' ? 'Veterinary medical examination failed' : null,
          proofDocs: [medicalCertUrl, antigenPhotoUrl],
          vetClinicName,
          vetDoctorName,
          documents: [
            {
              type: 'VET_MEDICAL_CERTIFICATE',
              visibility: 'CUSTOMER_VISIBLE',
              fileUrl: medicalCertUrl,
              fileName: medicalCertName || `Veterinary Fitness Certificate - ${vetClinicName}.pdf`,
            },
            {
              type: 'VET_VIRAL_TEST_REPORT',
              visibility: 'CUSTOMER_VISIBLE',
              fileUrl: antigenPhotoUrl,
              fileName: `Rapid Viral Antigen Screening (Parvo: ${parvoTestResult}, Corona: ${coronaTestResult}, Distemper: ${distemperTestResult}) - ${vetClinicName}.pdf`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit medical examination');

      alert(
        `Medical examination: ${
          result === 'APPROVED'
            ? 'APPROVED! Pet is certified Fit-for-Travel. Advance to Customer Doorstep Handover.'
            : 'FAILED! Pet quarantined and returned.'
        }`
      );
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 4 Action: Complete Final Delivery with QR Code & OTP
  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return;
    if (!deliveryCustId.trim() || !deliverySignature.trim()) {
      alert('Recipient Customer ID and Signed Delivery Report are mandatory');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          photo: deliveryPhoto,
          customerIdCaptured: `${deliveryCustId} (OTP: ${deliveryOtp})`,
          signedDeliveryReport: deliverySignature,
          customerAcknowledgement: deliveryAck,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete delivery');

      alert('Delivery successfully completed! Proof of Delivery registered and Certificate issued.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Copy scannable QR link helper
  const handleCopyLink = () => {
    if (!selectedOrder) return;
    const url = `${window.location.origin}/records/${selectedOrder.orderId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Role guard
  const isAgentOrAdmin =
    currentUser?.role === 'DELIVERY_AGENT' || currentUser?.role === 'ADMIN';

  if (!isAgentOrAdmin) {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Delivery & Ops Agent Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access to live companion pickup and field delivery operations is restricted to authorized Delivery Agents and Admins.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-soft cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Determine highest reached operational stage in trip lifecycle (1 through 5)
  const tripMaxStage = !selectedOrder
    ? 0
    : ['PICKUP_ASSIGNED', 'AGENT_ASSIGNED', 'PET_ASSIGNED'].includes(selectedOrder.status)
    ? 1
    : selectedOrder.status === 'PICKUP_INSPECTION'
    ? 2
    : ['PICKUP_ACCEPTED', 'MEDICAL_CHECK'].includes(selectedOrder.status)
    ? 3
    : ['READY_FOR_DELIVERY', 'MEDICAL_APPROVED'].includes(selectedOrder.status)
    ? 4
    : selectedOrder.status === 'DELIVERY_COMPLETED'
    ? 5
    : 1;

  // Active viewing stage (defaults to live trip stage; allows navigation back to completed stages)
  const currentStage = activeStageTab ?? Math.min(tripMaxStage, 4);

  const isEnRouteToBreeder =
    (selectedOrder?.status === 'PICKUP_ASSIGNED' &&
      selectedOrder?.estimatedDeliveryTime === 'EN_ROUTE_TO_BREEDER') ||
    Boolean(selectedOrder?.id && localEnRouteOrders[selectedOrder.id]);

  const publicRecordUrl = selectedOrder
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/records/${selectedOrder.orderId}`
    : '';
  const qrImageUrl = selectedOrder
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
        publicRecordUrl
      )}`
    : '';

  return (
    <div className="w-full pb-16 space-y-5 animate-fadeIn max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Field Logistics & Delivery Portal
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Dispatch Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Accept assignments, conduct breeder pickup, upload compliance documents, clear medical checks, and complete QR code customer delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
          >
            &larr; Back to Route Overview
          </Link>
          <span className="inline-flex items-center text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200">
            Agent: <strong className="ml-1 text-slate-900">{currentUser?.name}</strong>
          </span>
        </div>
      </div>

      {/* 4-Stage Operational Timeline Stepper - CLICKABLE TABS FOR REACHED STAGES */}
      <div className="card-clean p-4 md:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Step 1: Assignment */}
          <button
            type="button"
            disabled={tripMaxStage < 1}
            onClick={() => setActiveStageTab(1)}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              currentStage === 1
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                : tripMaxStage > 1
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Stage 1</span>
              {tripMaxStage > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : tripMaxStage === 1 ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
            <div className="mt-1 font-extrabold text-xs text-slate-900">Accept Order</div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isEnRouteToBreeder ? 'En route to kennel' : 'Dispatched to route'}
            </p>
          </button>

          {/* Step 2: Vendor Area */}
          <button
            type="button"
            disabled={tripMaxStage < 2}
            onClick={() => setActiveStageTab(2)}
            className={`p-3 rounded-xl border text-left transition ${
              tripMaxStage >= 2
                ? 'cursor-pointer hover:border-purple-300'
                : 'cursor-not-allowed opacity-60'
            } ${
              currentStage === 2
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
                : tripMaxStage > 2
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Stage 2</span>
              {tripMaxStage > 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : tripMaxStage === 2 ? (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              ) : (
                <Store className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
            <div className="mt-1 font-extrabold text-xs text-slate-900">Kennel Pickup & Docs</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Chip check & compliance</p>
          </button>

          {/* Step 3: Medical Center */}
          <button
            type="button"
            disabled={tripMaxStage < 3}
            onClick={() => setActiveStageTab(3)}
            className={`p-3 rounded-xl border text-left transition ${
              tripMaxStage >= 3
                ? 'cursor-pointer hover:border-indigo-300'
                : 'cursor-not-allowed opacity-60'
            } ${
              currentStage === 3
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/20'
                : tripMaxStage > 3
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Stage 3</span>
              {tripMaxStage > 3 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : tripMaxStage === 3 ? (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              ) : (
                <Stethoscope className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
            <div className="mt-1 font-extrabold text-xs text-slate-900">Vet Medical Center</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Antigen viral screening</p>
          </button>

          {/* Step 4: Customer Area */}
          <button
            type="button"
            disabled={tripMaxStage < 4}
            onClick={() => setActiveStageTab(4)}
            className={`p-3 rounded-xl border text-left transition ${
              tripMaxStage >= 4
                ? 'cursor-pointer hover:border-blue-300'
                : 'cursor-not-allowed opacity-60'
            } ${
              currentStage === 4
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/20'
                : tripMaxStage === 5
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Stage 4</span>
              {tripMaxStage === 5 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : tripMaxStage === 4 ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              ) : (
                <QrCode className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
            <div className="mt-1 font-extrabold text-xs text-slate-900">Customer Doorstep</div>
            <p className="text-[10px] text-slate-500 mt-0.5">QR scan & OTP handover</p>
          </button>
        </div>
      </div>

      {/* Task Queue Selector Bar */}
      {assignedOrders.length > 0 && (
        <div className="card-clean p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Trip:
            </span>
            <select
              value={selectedOrder?.id || ''}
              onChange={(e) => {
                const found = assignedOrders.find((o) => o.id === e.target.value);
                if (found) {
                  setSelectedOrder(found);
                  syncOrderState(found);
                }
              }}
              className="text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              {assignedOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderId} — {o.breed?.name} ({o.status.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
              title="Refresh order state from server"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
              {assignedOrders.length} assigned trips
            </span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {!selectedOrder ? (
        <div className="card-clean p-12 text-center text-slate-400 space-y-3 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Active Order Selected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You currently have no active orders dispatched to you. When an Admin assigns a pickup in <code>/admin/orders</code>, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Order & Pet Dossier Card */}
          <div className="lg:col-span-1 space-y-5">
            <div className="card-clean p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Current Trip Dossier
                  </span>
                  <div className="font-mono font-extrabold text-slate-900 text-base">
                    {selectedOrder.orderId}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    currentStage === 5
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : currentStage === 4
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : currentStage === 3
                      ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      : currentStage === 2
                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block"></span>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Linked Pet Profile */}
              {selectedOrder.pet ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Companion Animal Profile
                  </span>
                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded text-xs border border-slate-200/60">
                        {selectedOrder.pet.petId}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {selectedOrder.pet.sex} • {selectedOrder.pet.colour}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {selectedOrder.breed?.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                      <span>Category: {selectedOrder.category?.name}</span>
                      {selectedOrder.pet.microchipNumber && (
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Chip #{selectedOrder.pet.microchipNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                  Awaiting vendor pet allocation.
                </div>
              )}

              {/* Breeder Kennel Location */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Store className="w-3.5 h-3.5 text-amber-600 mr-1" /> 1. Breeder Kennel Pickup
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900">
                    {selectedOrder.vendor?.name || 'Authorized Breeder Kennel'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {selectedOrder.vendor?.address || 'Plot 45, Green Meadows, Pune'}
                  </div>
                  {(selectedOrder.vendor?.mapUrl || selectedOrder.vendor?.address) && (
                    <a
                      href={selectedOrder.vendor?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.vendor?.address || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Open in Google Maps 📍</span>
                      <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                    </a>
                  )}
                  {selectedOrder.vendor?.secondaryAddress && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <span className="font-semibold text-slate-600 block text-[10px] uppercase">
                        Alternative Facility Location:
                      </span>
                      <div className="text-slate-500">{selectedOrder.vendor.secondaryAddress}</div>
                      {selectedOrder.vendor?.secondaryMapUrl && (
                        <a
                          href={selectedOrder.vendor.secondaryMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
                        >
                          <MapPin className="w-2.5 h-2.5 text-sky-600" />
                          <span>Open Alt Location Maps 📍</span>
                          <ExternalLink className="w-2 h-2" />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="text-slate-400 text-[11px] pt-1">
                    Contact: {selectedOrder.vendor?.phone || selectedOrder.vendor?.email || '+91 9876543212'}
                  </div>
                </div>
              </div>

              {/* Partner Medical Center */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600 mr-1" /> 2. Partner Vet Hospital
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-900">
                    {selectedOrder.vetClinicName || vetClinicName}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {selectedOrder.vetDoctorName || vetDoctorName}
                  </div>
                </div>
              </div>

              {/* Customer Delivery Destination */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 mr-1" /> 3. Customer Destination
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{selectedOrder.customerName}</div>
                  <div className="text-slate-500 text-[11px]">{selectedOrder.deliveryAddress}</div>
                  <div className="text-slate-400 text-[11px]">
                    Phone: {selectedOrder.customerContact}
                  </div>
                </div>
              </div>

              {/* Live QR Passport Quick Link */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Live QR Record
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Updates live on every upload you complete across the 4 stages.
                  </p>
                  <Link
                    href={`/records/${selectedOrder.orderId}`}
                    target="_blank"
                    className="inline-flex items-center text-[11px] font-bold text-emerald-400 hover:underline gap-1"
                  >
                    <span>View Customer Pass</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Active Stage Action Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stage Navigation Review Banner (when agent browses an earlier stage) */}
            {activeStageTab !== null && activeStageTab !== Math.min(tripMaxStage, 4) && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between text-xs text-amber-950 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Viewing <strong>Stage {currentStage}</strong> records. Live trip workflow is currently at <strong>Stage {Math.min(tripMaxStage, 4)}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStageTab(Math.min(tripMaxStage, 4))}
                  className="ml-3 px-3 py-1 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition whitespace-nowrap cursor-pointer shadow-xs"
                >
                  Return to Active Stage ({Math.min(tripMaxStage, 4)}) &rarr;
                </button>
              </div>
            )}

            {/* ========================================================
                STAGE 1: ACCEPT DELIVERY ASSIGNMENT (PICKUP_ASSIGNED)
            ======================================================== */}
            {currentStage === 1 && (
              <div className="card-clean p-6 rounded-2xl shadow-xs space-y-5 animate-scaleUp border border-amber-200 bg-amber-50/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                      {isEnRouteToBreeder
                        ? 'Stage 1 of 4 • Assignment Accepted • En Route'
                        : 'Stage 1 of 4 • Assigned Order'}
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center">
                      <Truck className="w-5 h-5 text-amber-600 mr-2" />
                      {isEnRouteToBreeder
                        ? 'Driving to Breeder Kennel Facility'
                        : 'Accept Delivery Assignment'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEnRouteToBreeder
                        ? 'Your acceptance is registered. Head to the breeder kennel using GPS navigation. Once you arrive physically at the kennel, tap the arrival button below to start inspection.'
                        : 'Order has been dispatched by Furora Admin. Accept assignment to confirm you are on duty and moving to the breeder kennel.'}
                    </p>
                  </div>
                </div>

                {isEnRouteToBreeder ? (
                  /* State B: Agent has accepted and is en route to kennel */
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
                      <div className="font-extrabold flex items-center text-emerald-900 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                        Assignment Confirmed • Transit Active
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Vehicle sanitized. Proceed directly to the authorized partner breeder kennel. The trip stays in Stage 1 until you arrive physically at the breeder location.
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-3 text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Destination Breeder Kennel Location
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <strong className="text-slate-900 text-sm block">
                            {selectedOrder.vendor?.name || 'Authorized Breeder Kennel'}
                          </strong>
                          <div className="text-slate-600 text-xs mt-0.5">
                            {selectedOrder.vendor?.address || 'Plot 45, Green Meadows, Pune'}
                          </div>
                          {selectedOrder.vendor?.secondaryAddress && (
                            <div className="text-slate-500 text-[11px] mt-1">
                              Alt Facility: {selectedOrder.vendor.secondaryAddress}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(selectedOrder.vendor?.mapUrl || selectedOrder.vendor?.address) && (
                            <a
                              href={selectedOrder.vendor?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.vendor?.address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Navigate in Google Maps 📍</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {selectedOrder.vendor?.secondaryMapUrl && (
                            <a
                              href={selectedOrder.vendor.secondaryMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 text-sky-800 font-bold text-xs border border-sky-200 hover:bg-sky-100 transition"
                            >
                              <MapPin className="w-3 h-3 text-sky-600" />
                              <span>Alt Facility Maps 📍</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Arrived at facility? Tap button to open Stage 2 physical screening:
                      </span>
                      <button
                        onClick={handleArriveAtKennel}
                        disabled={submitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-soft disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Updating...' : '📍 I Have Arrived at Breeder Kennel (Start Inspection) →'}
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* State A: Agent has not yet accepted assignment */
                  <>
                    <div className="p-4 bg-white rounded-xl border border-amber-200/80 space-y-3 text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600" />
                        <span>Trip Dispatch Confirmation Protocol</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                            Breeder Kennel:
                          </span>
                          <strong className="text-slate-900 text-xs">
                            {selectedOrder.vendor?.name || 'Pet World Breeders'}
                          </strong>
                          <div className="text-[11px] text-slate-500">{selectedOrder.vendor?.address}</div>
                          {selectedOrder.vendor?.mapUrl && (
                            <a
                              href={selectedOrder.vendor.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold underline mt-1"
                            >
                              <MapPin className="w-3 h-3 text-emerald-600" /> Open in Google Maps 📍
                            </a>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                            Customer Destination:
                          </span>
                          <strong className="text-slate-900 text-xs">{selectedOrder.customerName}</strong>
                          <div className="text-[11px] text-slate-500">{selectedOrder.deliveryAddress}</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Agent Dispatch Note
                        </label>
                        <input
                          type="text"
                          value={acceptanceNotes}
                          onChange={(e) => setAcceptanceNotes(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleAcceptAssignment}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-soft disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Confirming...' : 'Accept Assignment & Start Journey'}
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================
                STAGE 2: VENDOR AREA (PICKUP & DOCUMENT COLLECTION)
            ======================================================== */}
            {currentStage === 2 && (
              <div className="card-clean p-6 rounded-2xl shadow-xs space-y-5 animate-scaleUp border border-purple-200 bg-white">
                {/* Stage Back & Fast-Forward Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveStageTab(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>&larr; Back to Stage 1 (Order Info)</span>
                  </button>
                  {tripMaxStage >= 3 && (
                    <button
                      type="button"
                      onClick={() => setActiveStageTab(3)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                    >
                      <span>Return to Stage 3 (Medical) &rarr;</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                      Stage 2 of 4 • Breeder Kennel Pickup
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center">
                      <Store className="w-5 h-5 text-purple-600 mr-2" />
                      Breeder Kennel Pickup & Document Collection
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify 15-digit microchip, tick all physical screening points, and upload genuine compliance documents into Cloudflare R2 storage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckAllPoints}
                    className="inline-flex items-center text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer self-start sm:self-auto"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" /> Check All 10 Points
                  </button>
                </div>

                {/* Microchip Physical Verification Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      15-Digit RFID Microchip Physical Scanner Verification
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Mandatory ISO 11784/11785
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        15-Digit Microchip Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 956000001234567"
                        value={microchipNumber}
                        onChange={(e) => setMicrochipNumber(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <label
                        onClick={() => setMicrochipVerified(!microchipVerified)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-2 transition ${
                          microchipVerified
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {microchipVerified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <span>Microchip Scanned & Verified on Pet</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 10-Point Interactive Health Screen */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    10-Point Physical Health Screening Checklist
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {INSPECTION_POINTS.map((item, idx) => {
                      const isChecked = Boolean(checklist[idx]);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleChecklist(idx)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                            isChecked
                              ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <span className="text-[11px] leading-tight font-medium">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Document Collection Uploads Section */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-indigo-600" />
                      Breeder Kennel Compliance Documents & Pickup Proof Upload
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Direct streaming to Cloudflare R2
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* 1. Pet Pickup Photo */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentCameraPhotoUpload
                        label="1. Pet Pickup Proof Photo"
                        required
                        value={pickupPhotoUrl}
                        onChange={setPickupPhotoUrl}
                        folder="orders/inspections"
                        description="Direct camera capture or photo upload of pet at breeder kennel"
                        badge="Camera / Photo"
                      />
                    </div>

                    {/* 2. Vaccination Card */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentDocumentUpload
                        label="2. Kennel Vaccination Card Document"
                        required
                        value={vaccinationCardUrl}
                        fileName={vaccinationCardName}
                        onChange={(url, name) => {
                          setVaccinationCardUrl(url);
                          if (name) setVaccinationCardName(name);
                        }}
                        folder="orders/documents"
                        description="Physical vaccination card with breeder/vet stamp"
                      />
                    </div>

                    {/* 3. Deworming Record */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentDocumentUpload
                        label="3. Deworming Proof Document"
                        required
                        value={dewormingRecordUrl}
                        fileName={dewormingRecordName}
                        onChange={(url, name) => {
                          setDewormingRecordUrl(url);
                          if (name) setDewormingRecordName(name);
                        }}
                        folder="orders/documents"
                        description="Kennel deworming certification schedule record"
                      />
                    </div>

                    {/* 4. Pedigree Certificate */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentDocumentUpload
                        label="4. KCI / Pedigree Certificate Document"
                        value={pedigreeDocUrl}
                        fileName={pedigreeDocName}
                        onChange={(url, name) => {
                          setPedigreeDocUrl(url);
                          if (name) setPedigreeDocName(name);
                        }}
                        folder="orders/documents"
                        description="Official Kennel Club of India / pedigree certificate"
                      />
                    </div>
                  </div>
                </div>

                {/* Field Notes & Observations */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Physical Condition Assessment
                    </label>
                    <input
                      type="text"
                      value={physicalCondition}
                      onChange={(e) => setPhysicalCondition(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Pickup Agent Notes & Observations
                    </label>
                    <textarea
                      rows={2}
                      value={pickupNotes}
                      onChange={(e) => setPickupNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Failure Reason (Only required if rejecting pickup)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Signs of lethargy, skin irritation, or physical mismatch"
                      value={pickupFailureReason}
                      onChange={(e) => setPickupFailureReason(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Accept vs Fail Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                    <button
                      onClick={() => handleInspection('FAIL')}
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Fail Inspection (Return to Vendor)
                    </button>

                    <button
                      onClick={() => handleInspection('ACCEPT')}
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      {tripMaxStage >= 3
                        ? 'Update Kennel Documents & Inspection Record'
                        : 'Complete Pickup & Collect All Documents'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                STAGE 3: MEDICAL CENTER (VET CLEARANCE & DOCUMENTS)
            ======================================================== */}
            {currentStage === 3 && (
              <div className="card-clean p-6 rounded-2xl shadow-xs space-y-5 animate-scaleUp border border-indigo-200 bg-white">
                {/* Stage Back & Fast-Forward Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveStageTab(2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>&larr; Back to Stage 2 (Kennel Pickup & Docs)</span>
                  </button>
                  {tripMaxStage >= 4 && (
                    <button
                      type="button"
                      onClick={() => setActiveStageTab(4)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                    >
                      <span>Return to Stage 4 (Doorstep) &rarr;</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                    Stage 3 of 4 • Partner Medical Center
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center">
                    <Stethoscope className="w-5 h-5 text-indigo-600 mr-2" />
                    Veterinary Medical Center Examination & Clearance
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Conduct mandatory viral antigen tests (Parvo, Corona, Distemper) and upload stamped Veterinary Fitness Certificate.
                  </p>
                </div>

                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2 text-xs text-teal-950">
                  <div className="font-bold flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 mr-1.5" /> Pet & Kennel Documents Safely Collected
                  </div>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Pet has arrived at authorized partner hospital. Licensed veterinarians must verify vital signs, administer mandatory viral screening tests, and issue an official Fit-to-Travel certificate.
                  </p>
                </div>

                {/* Clinical Form Fields */}
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Veterinary Clinic / Hospital Name *
                      </label>
                      <input
                        type="text"
                        value={vetClinicName}
                        onChange={(e) => setVetClinicName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Licensed Vet Surgeon & Reg No. *
                      </label>
                      <input
                        type="text"
                        value={vetDoctorName}
                        onChange={(e) => setVetDoctorName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>
                  </div>

                  {/* Viral Tests */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Canine Parvovirus (CPV)
                      </label>
                      <select
                        value={parvoTestResult}
                        onChange={(e) => setParvoTestResult(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="NEGATIVE">NEGATIVE (Clear / Passed)</option>
                        <option value="POSITIVE">POSITIVE (Failed / Infected)</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Canine Distemper (CDV)
                      </label>
                      <select
                        value={distemperTestResult}
                        onChange={(e) => setDistemperTestResult(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="NEGATIVE">NEGATIVE (Clear / Passed)</option>
                        <option value="POSITIVE">POSITIVE (Failed / Infected)</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Canine Coronavirus (CCV)
                      </label>
                      <select
                        value={coronaTestResult}
                        onChange={(e) => setCoronaTestResult(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="NEGATIVE">NEGATIVE (Clear / Passed)</option>
                        <option value="POSITIVE">POSITIVE (Failed / Infected)</option>
                      </select>
                    </div>
                  </div>

                  {/* Medical Documents Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentDocumentUpload
                        label="Official Stamped Vet Fitness Certificate"
                        required
                        value={medicalCertUrl}
                        fileName={medicalCertName}
                        onChange={(url, name) => {
                          setMedicalCertUrl(url);
                          if (name) setMedicalCertName(name);
                        }}
                        folder="orders/medical"
                        description="Official physical stamped fitness-for-travel veterinary certificate"
                      />
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentCameraPhotoUpload
                        label="Rapid Antigen Test Cassette Photo"
                        required
                        value={antigenPhotoUrl}
                        onChange={setAntigenPhotoUrl}
                        folder="orders/medical"
                        description="Diagnostic test cassette showing negative result bands (CPV/CDV/CCV)"
                        badge="Camera / Photo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Veterinarian Clinical Examination Notes
                    </label>
                    <textarea
                      rows={2}
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleMedicalClearance('FAILED')}
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Fail Medical Check (Quarantine)
                  </button>

                  <button
                    onClick={() => handleMedicalClearance('APPROVED')}
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    {tripMaxStage >= 4
                      ? 'Update Medical Clearance & Retain Ready Status'
                      : 'Issue Medical Clearance & Advance to Handover'}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STAGE 4: CUSTOMER AREA (DOORSTEP HANDOVER & QR CODE)
            ======================================================== */}
            {currentStage === 4 && (
              <div className="card-clean p-6 rounded-2xl shadow-xs space-y-6 animate-scaleUp border border-blue-200 bg-white">
                {/* Stage Back Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveStageTab(3)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>&larr; Back to Stage 3 (Vet Medical Center)</span>
                  </button>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                    Stage 4 of 4 • Customer Doorstep
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center">
                    <QrCode className="w-5 h-5 text-blue-600 mr-2" />
                    Customer Doorstep Handover & QR Code Verification
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Show the live QR code to the customer to scan on their phone. Enter recipient delivery OTP and capture signed handover receipt.
                  </p>
                </div>

                {/* Prominent Live Verifiable QR Code Section */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white p-3 rounded-xl shadow-lg flex-shrink-0">
                    <img
                      src={qrImageUrl}
                      alt="Customer Handover QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>

                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Live Verifiable QR Passport
                    </div>
                    <h3 className="text-base font-extrabold text-white">
                      Show QR Code to Customer at Doorstep
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Customer scans this QR code with their phone camera to instantly inspect the live digital passport: verified microchip number, kennel documents, rapid viral test results, and stamped veterinary fitness certificate!
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedLink ? 'Link Copied!' : 'Copy Passport URL'}
                      </button>
                      <Link
                        href={`/records/${selectedOrder.orderId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Preview Customer Screen
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Handover Verification Form */}
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Customer 6-Digit Delivery OTP *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={deliveryOtp}
                        onChange={(e) => setDeliveryOtp(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                        placeholder="e.g. 849201"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Recipient Government ID Number *
                      </label>
                      <input
                        type="text"
                        value={deliveryCustId}
                        onChange={(e) => setDeliveryCustId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <AgentCameraPhotoUpload
                        label="Delivery Handover Proof Photo"
                        required
                        value={deliveryPhoto}
                        onChange={setDeliveryPhoto}
                        folder="orders/deliveries"
                        description="Direct camera capture or photo proof of pet handover to customer at doorstep"
                        badge="Camera / Photo"
                      />
                    </div>

                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Signed Delivery Report (Digital Signature / Hash) *
                        </label>
                        <input
                          type="text"
                          value={deliverySignature}
                          onChange={(e) => setDeliverySignature(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                          required
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Cryptographic digital handover verification signature captured upon customer OTP verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Customer Acknowledgement & Receipt Confirmation
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAck}
                      onChange={(e) => setDeliveryAck(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleCompleteDelivery}
                      disabled={submitting}
                      className="inline-flex items-center px-6 py-3 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Registering POD...' : 'Complete Final Delivery & Issue POD'}{' '}
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                STAGE 5: DELIVERY COMPLETED
            ======================================================== */}
            {selectedOrder.status === 'DELIVERY_COMPLETED' && (currentStage === 5 || !activeStageTab) && (
              <div className="card-clean p-8 text-center space-y-5 rounded-2xl bg-white shadow-soft border border-emerald-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Delivery Handover Successfully Completed!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Order <strong>{selectedOrder.orderId}</strong> has been safely delivered and confirmed. The digital provenance passport is active and accessible to customer and admin.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/records/${selectedOrder.orderId}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
                    title="View full customer record with pickup report, vet certificate, and delivery proof"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> View Scannable QR Record &rarr;
                  </Link>
                  <Link
                    href={`/certificate/${selectedOrder.orderId}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Printable Certificate &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Stage: Inspection Failed View */}
            {selectedOrder.status === 'INSPECTION_FAILED' && (
              <div className="card-clean p-8 text-center space-y-3 rounded-2xl bg-rose-50/30 border border-rose-100">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-rose-950 text-base">Pickup Inspection Failed</h3>
                  <p className="text-xs text-rose-700 max-w-md mx-auto mt-1">
                    Animal was rejected during physical screening and retained by vendor. Order has been routed to Admin for pet replacement.
                  </p>
                </div>
              </div>
            )}

            {/* Fallback if status is outside standard 4-stage map */}
            {![
              'PICKUP_ASSIGNED', 'AGENT_ASSIGNED', 'PET_ASSIGNED',
              'PICKUP_INSPECTION',
              'PICKUP_ACCEPTED', 'MEDICAL_CHECK',
              'READY_FOR_DELIVERY', 'MEDICAL_APPROVED',
              'DELIVERY_COMPLETED',
              'INSPECTION_FAILED', 'MEDICAL_FAILED'
            ].includes(selectedOrder.status) && (
              <div className="card-clean p-8 rounded-2xl border border-slate-200 text-center space-y-4 bg-white">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Trip Status: {selectedOrder.status}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    This order is assigned to your delivery queue. Click below to confirm dispatch and proceed to Stage 2 Kennel Pickup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAcceptAssignment}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-sm"
                >
                  {submitting ? 'Updating...' : 'Accept Assignment & Open Kennel Inspection'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentOrderWorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <AgentOrderWorkflowContent />
    </Suspense>
  );
}
