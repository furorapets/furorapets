'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award, Printer, CheckCircle2, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        // First fetch order to see if eligible
        const orderRes = await fetch(`/api/records/${orderId}`);
        const orderData = await orderRes.json();
        if (!orderData.success) {
          setError(orderData.error || 'Order record not found');
          setLoading(false);
          return;
        }
        setOrder(orderData.data);

        // Attempt certificate generation / retrieval
        const certRes = await fetch('/api/certificates/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const certData = await certRes.json();
        if (certData.success) {
          setCert(certData.data);
        } else {
          setError(certData.error || 'Failed to issue certificate');
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

  if (error || !cert) {
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

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center print:hidden px-2">
        <Link
          href={`/records/${orderId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Verified Record
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-soft transition"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Certificate
        </button>
      </div>

      {/* Official Certificate Canvas */}
      <div className="bg-white border-8 border-double border-amber-600/30 rounded-3xl p-8 sm:p-12 shadow-floating relative overflow-hidden">
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
          <Award className="w-[600px] h-[600px] text-slate-900" />
        </div>

        {/* Certificate Header */}
        <div className="text-center space-y-2 pb-6 border-b border-amber-200/60">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-extrabold tracking-widest text-slate-900 uppercase">furora</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              OFFICIAL SEAL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Certificate of Health, Pedigree & Provenance
          </h1>
          <p className="text-[11px] text-amber-800 uppercase tracking-widest font-bold">
            Certificate ID: {cert.certificateId}
          </p>
        </div>

        {/* Certificate Body */}
        <div className="py-8 space-y-6 text-center">
          <p className="text-xs text-slate-500 italic max-w-xl mx-auto leading-relaxed">
            This is to officially certify that the companion animal described below has undergone mandatory physical inspection,
            verified parent pedigree verification, and veterinary medical clearance in accordance with Furora standards:
          </p>

          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-6 text-left max-w-lg mx-auto space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pet ID</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200/60">
                {order.pet?.petId}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Breed & Category</span>
              <span className="font-bold text-slate-900">{order.pet?.breed} ({order.pet?.category})</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth & Age</span>
              <span className="font-semibold text-slate-800">
                {new Date(order.pet?.dob).toLocaleDateString()} • {order.pet?.age}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sex & Colour</span>
              <span className="font-semibold text-slate-800">{order.pet?.sex} • {order.pet?.colour}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Custodian</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
          </div>
        </div>

        {/* Certificate Footer with QR Code & Authority Seal */}
        <div className="pt-6 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {cert.qrCodeUrl && (
              <div className="p-2 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <img
                  src={cert.qrCodeUrl}
                  alt="Verification QR"
                  className="w-20 h-20"
                />
              </div>
            )}
            <div className="text-left text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center">
                <QrCode className="w-3.5 h-3.5 mr-1 text-slate-700" />
                Scan to Verify Live Online
              </div>
              <p className="text-slate-400 max-w-[200px] text-[11px] leading-tight">
                Resolves directly to the immutable pet provenance & medical clearance record.
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1 text-xs">
            <div className="font-extrabold text-slate-900">Furora Provenance Authority</div>
            <div className="text-[11px] text-slate-400">Date Issued: {new Date(cert.issuedAt).toLocaleDateString()}</div>
            <div className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Digitally Authenticated
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
