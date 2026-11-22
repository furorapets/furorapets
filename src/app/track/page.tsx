'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Truck,
  ShieldCheck,
  Stethoscope,
  QrCode,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Phone,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = orderQuery.trim().toUpperCase();
    if (!query) {
      setErrorMessage('Please enter your Order ID (e.g. FUR-ORD-000006)');
      return;
    }

    setIsSearching(true);
    setErrorMessage('');

    try {
      // Validate order exists
      const res = await fetch(`/api/records/${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.data?.orderId) {
        router.push(`/records/${data.data.orderId}`);
      } else {
        setErrorMessage(
          `No active delivery record found for "${query}". Please check your order confirmation SMS/receipt.`
        );
      }
    } catch (err: any) {
      setErrorMessage('Unable to connect to tracking server. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 select-none">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Swiggy/Zomato-Style Pet Journey Tracking</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Where is my companion pet right now?
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Track your companion puppy across every leg of transit: from breeder kennel pickup to veterinary medical check and final doorstep delivery.
          </p>
        </div>

        {/* Search Card */}
        <div className="card-clean p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-xl space-y-5">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Enter Your Order Number or Scan QR Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => {
                    setOrderQuery(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. FUR-ORD-000006"
                  className="w-full pl-11 pr-4 py-3.5 text-sm font-mono font-bold bg-slate-50/60 border border-slate-200 rounded-2xl text-slate-900 placeholder:font-sans placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Connecting to Live Transit Fleet...</span>
                </>
              ) : (
                <>
                  <span>Track Live Pet Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* 3-Location Custody Architecture Visualizer */}
        <div className="card-clean p-6 bg-white border border-slate-200/90 rounded-3xl shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              How Furora Live Custody Tracking Works
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Swiggy/Zomato Model
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Breeder Kennel Pickup</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Ops delivery partner visits the certified kennel, performs a 10-point physical check, uploads real-time photos, and takes custody.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/60 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Veterinary Hospital Check</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Licensed veterinarians test viral markers (Parvo/Distemper), verify vaccinations, and attach a tamper-proof digital medical certificate.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/60 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-indigo-900">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Doorstep Live Delivery</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Live GPS route with climate-controlled van number, driver rating, direct one-touch calling, and contactless QR handover confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Back Link to Admin */}
        <div className="text-center pt-2">
          <Link
            href="/admin/orders"
            className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition"
          >
            Are you a Furora Staff member? Return to Operations Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
