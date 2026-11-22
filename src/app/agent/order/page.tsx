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
  QrCode,
} from 'lucide-react';
import { useSession } from '@/context/session-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

function AgentOrderWorkflowContent() {
  const { currentUser, switchToRoleName } = useSession();
  const searchParams = useSearchParams();
  const targetOrderId = searchParams.get('orderId') || '';

  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 10-point checklist state
  const [checklist, setChecklist] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
  });

  // Inspection Form State
  const [physicalCondition, setPhysicalCondition] = useState(
    'Clear eyes, active posture, healthy coat, unlabored breathing. 10/10 physical points passed.'
  );
  const [notes, setNotes] = useState(
    'Vendor pickup completed smoothly at facility. Pet verified against digital identity.'
  );
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80'
  );
  const [failureReason, setFailureReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Medical Center Form State
  const [vetClinicName, setVetClinicName] = useState('Crown Vet Specialty Animal Hospital');
  const [vetDoctorName, setVetDoctorName] = useState('Dr. Aditi Mukherjee, BVSc & AH (Reg #VCI-2018-9941)');
  const [parvoTestResult, setParvoTestResult] = useState<'NEGATIVE' | 'POSITIVE'>('NEGATIVE');
  const [distemperTestResult, setDistemperTestResult] = useState<'NEGATIVE' | 'POSITIVE'>('NEGATIVE');
  const [medicalCertUrl, setMedicalCertUrl] = useState(
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80'
  );

  // Delivery Form State
  const [deliveryCustId, setDeliveryCustId] = useState('GOV-ID-AADHAAR-88992211');
  const [deliveryPhoto, setDeliveryPhoto] = useState(
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80'
  );
  const [deliverySignature, setDeliverySignature] = useState('SIGN-HASH-VERIFIED-HANDOVER-OK');
  const [deliveryAck, setDeliveryAck] = useState(
    'Customer confirms receipt of companion animal in healthy condition with verified provenance documentation.'
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all orders assigned to this agent
      const res = await fetch('/api/orders');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setAssignedOrders(data.data);

        // Auto-select order
        if (targetOrderId) {
          const match = data.data.find(
            (o: any) => o.id === targetOrderId || o.orderId === targetOrderId
          );
          if (match) {
            setSelectedOrder(match);
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
        } else if (data.data.length > 0) {
          setSelectedOrder(data.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Check all points helper
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

  // Physical Inspection Submit (PASS or FAIL)
  const handleInspection = async (result: 'ACCEPT' | 'FAIL') => {
    if (!selectedOrder) return;
    if (result === 'FAIL' && !failureReason.trim()) {
      alert('Please enter a mandatory failure reason when failing inspection');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          result,
          physicalCondition,
          notes,
          photos: [photoUrl],
          failureReason: result === 'FAIL' ? failureReason : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit inspection');

      alert(
        `Inspection submitted: ${
          result === 'ACCEPT'
            ? 'PASSED (Advanced to Medical Clearance)'
            : 'FAILED (Returned to Vendor)'
        }`
      );
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Medical Clearance Submit (APPROVED or FAILED)
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
          reason: result === 'FAILED' ? 'Veterinary medical exam failed' : null,
          proofDocs: [medicalCertUrl],
          vetClinicName,
          vetDoctorName,
          documents: [
            {
              type: 'VET_MEDICAL_CERTIFICATE',
              visibility: 'CUSTOMER_VISIBLE',
              fileUrl: medicalCertUrl,
              fileName: `Veterinary Medical Clearance - ${vetClinicName}.pdf`,
            },
            {
              type: 'VET_VIRAL_TEST_REPORT',
              visibility: 'CUSTOMER_VISIBLE',
              fileUrl: medicalCertUrl,
              fileName: `Rapid Viral Antigen Screening (Parvo: ${parvoTestResult}, Distemper: ${distemperTestResult}) - ${vetClinicName}.pdf`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit medical examination');

      alert(
        `Medical examination: ${
          result === 'APPROVED'
            ? 'APPROVED (Ready for Delivery Handover)'
            : 'FAILED (Quarantined/Returned)'
        }`
      );
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Proof of Delivery Handover Submit
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
          customerIdCaptured: deliveryCustId,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
          <h2 className="text-base font-extrabold text-slate-900">Delivery/Ops Agent Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current persona is <strong>{currentUser.name}</strong> ({currentUser.role}). Delivery agent operations view is strictly scoped to assigned field agents.
          </p>
        </div>
        <button
          onClick={() => switchToRoleName('DELIVERY_AGENT')}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-soft cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Switch to Rahul Agent (Delivery & Ops)
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-4 animate-fadeIn">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Agent Field Operations
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Delivery Agent View
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Conduct pickup physical inspections, veterinary clearances, and customer handovers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200">
            Agent: <strong className="ml-1 text-slate-900">{currentUser?.name}</strong>
          </span>
        </div>
      </div>

      {/* Task Queue Selector Bar */}
      {assignedOrders.length > 0 && (
        <div className="card-clean p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-soft">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Assigned Order:</span>
            <select
              value={selectedOrder?.id || ''}
              onChange={(e) => {
                const found = assignedOrders.find((o) => o.id === e.target.value);
                if (found) setSelectedOrder(found);
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

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Total Assigned Queue:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
              {assignedOrders.length} orders
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
          {/* Left Column: Order & Pet Info Card */}
          <div className="lg:col-span-1 space-y-5">
            <div className="card-clean p-5 rounded-2xl shadow-soft space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Assigned Order
                  </span>
                  <div className="font-mono font-extrabold text-slate-900 text-base">{selectedOrder.orderId}</div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Pet Card */}
              {selectedOrder.pet ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Linked Pet Profile
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
                    <div className="text-xs font-extrabold text-slate-900">{selectedOrder.breed?.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Category: {selectedOrder.category?.name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                  Awaiting vendor pet allocation.
                </div>
              )}

              {/* Vendor Facility */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Store className="w-3.5 h-3.5 text-amber-600 mr-1" /> Vendor Pickup Location
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{selectedOrder.vendor?.name || 'Pet World Breeders'}</div>
                  <div className="text-slate-500 text-[11px]">{selectedOrder.vendor?.address || 'Plot 45, Green Meadows, Pune'}</div>
                  <div className="text-slate-400 text-[11px]">Contact: {selectedOrder.vendor?.phone || '+91 9876543212'}</div>
                </div>
              </div>

              {/* Customer Delivery Destination */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-purple-600 mr-1" /> Delivery Destination
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{selectedOrder.customerName}</div>
                  <div className="text-slate-500 text-[11px]">{selectedOrder.deliveryAddress}</div>
                  <div className="text-slate-400 text-[11px]">Phone: {selectedOrder.customerContact}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Workflow Action Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stage 1: Physical Pickup Inspection (PICKUP_ASSIGNED or PET_ASSIGNED) */}
            {['PICKUP_ASSIGNED', 'PET_ASSIGNED'].includes(selectedOrder.status) && (
              <div className="card-clean p-6 rounded-2xl shadow-soft space-y-5 animate-scaleUp">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center">
                      <Camera className="w-4 h-4 text-slate-700 mr-2" />
                      Physical Inspection & 10-Point Health Checklist
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conduct in-person visual and physical screening at vendor kennel before taking custody.
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

                {/* 10-Point Interactive Checklist */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    10-Point Physical Screen
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

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Field Agent Notes & Observations
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Inspection Photo Proof URL
                    </label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Failure Reason (Only required if failing inspection)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Signs of lethargy, skin irritation, or physical mismatch"
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
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
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Pass Inspection (Clear for Medical Check)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 2: Medical Clearance (MEDICAL_CHECK) */}
            {selectedOrder.status === 'MEDICAL_CHECK' && (
              <div className="card-clean p-6 rounded-2xl shadow-soft space-y-5 animate-scaleUp">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center">
                    <ShieldCheck className="w-4 h-4 text-teal-600 mr-2" />
                    Veterinary Medical Center Clearance
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Physical pickup accepted. Record clinical examination results and upload the stamped Veterinary Fitness Certificate.
                  </p>
                </div>

                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2 text-xs text-teal-950">
                  <div className="font-bold flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 mr-1.5" /> Physical Pickup Completed
                  </div>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Pet has arrived at the authorized medical clinic partner. Licensed veterinarians must verify vital signs, administer mandatory viral screening tests, and issue an official Fit-to-Travel certificate.
                  </p>
                </div>

                {/* Clinical Form Fields */}
                <div className="space-y-3.5 text-xs">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Canine Parvovirus (CPV) Antigen Test
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
                        Canine Distemper (CDV) Antigen Test
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
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Official Stamped Medical Certificate Document URL *
                    </label>
                    <input
                      type="url"
                      value={medicalCertUrl}
                      onChange={(e) => setMedicalCertUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      required
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
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Issue Medical Clearance & Advance to Delivery
                  </button>
                </div>
              </div>
            )}

            {/* Stage 3: Customer Handover & POD (READY_FOR_DELIVERY) */}
            {selectedOrder.status === 'READY_FOR_DELIVERY' && (
              <div className="card-clean p-6 rounded-2xl shadow-soft space-y-5 animate-scaleUp">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center">
                    <Truck className="w-4 h-4 text-slate-700 mr-2" />
                    Proof of Delivery (POD) & Customer Handover
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Medical clearance completed. Record recipient verification details and capture signed delivery receipt.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-emerald-950 space-y-1 text-xs">
                  <div className="font-bold flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" /> Ready for Customer Handover
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Capture delivery proof photo, verify recipient government ID, and register signed delivery report.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Recipient Government ID Number
                    </label>
                    <input
                      type="text"
                      value={deliveryCustId}
                      onChange={(e) => setDeliveryCustId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Delivery Handover Proof Photo URL
                    </label>
                    <input
                      type="url"
                      value={deliveryPhoto}
                      onChange={(e) => setDeliveryPhoto(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Signed Delivery Report (Digital Signature / Verification Hash)
                    </label>
                    <input
                      type="text"
                      value={deliverySignature}
                      onChange={(e) => setDeliverySignature(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
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
                      className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-soft transition disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Registering POD...' : 'Complete Final Delivery & Issue POD'} <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4: Completed Delivery View */}
            {selectedOrder.status === 'DELIVERY_COMPLETED' && (
              <div className="card-clean p-8 text-center space-y-4 rounded-2xl bg-white shadow-soft">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Delivery Handover Completed!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Order <strong>{selectedOrder.orderId}</strong> has been successfully delivered and confirmed with verified Proof of Delivery.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                  <Link
                    href={`/records/${selectedOrder.orderId}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
                    title="View full customer record with pickup report, vet certificate, and delivery proof"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> View Scannable QR Record &rarr;
                  </Link>
                  <Link
                    href={`/certificate/${selectedOrder.orderId}`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition"
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
