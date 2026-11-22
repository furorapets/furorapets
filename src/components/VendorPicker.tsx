'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Check, Store, MapPin, ShieldCheck, Phone, Award } from 'lucide-react';

export interface VendorPickerProps {
  vendors: any[];
  selectedVendorId: string;
  onSelectVendor: (vendorId: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  noneSubtext?: string;
  loading?: boolean;
}

export default function VendorPicker({
  vendors = [],
  selectedVendorId,
  onSelectVendor,
  allowNone = false,
  noneLabel = 'No kennel assigned yet (Dispatch later)',
  noneSubtext = 'Order will remain in unallocated state awaiting kennel assignment.',
  loading = false,
}: VendorPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

  // Deduplicate vendors by name & address to eliminate repetitive test entries
  const uniqueVendors = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const v of vendors) {
      const key = `${v.name?.trim().toLowerCase()}_${v.address?.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(v);
      }
    }
    return list;
  }, [vendors]);

  // Extract cities for quick filter pills
  const cities = useMemo(() => {
    const cityMap: Record<string, number> = {};
    uniqueVendors.forEach((v) => {
      let city = 'Other';
      const addr = (v.address || '').toLowerCase();
      if (addr.includes('bangalore') || addr.includes('bengaluru')) city = 'Bangalore';
      else if (addr.includes('pune')) city = 'Pune';
      else if (addr.includes('vadodara')) city = 'Vadodara';
      else if (addr.includes('delhi')) city = 'Delhi';
      else if (addr.includes('mumbai')) city = 'Mumbai';
      else if (addr.includes('chennai')) city = 'Chennai';
      else if (addr.includes('hyderabad')) city = 'Hyderabad';

      cityMap[city] = (cityMap[city] || 0) + 1;
    });

    const entries = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return entries;
  }, [uniqueVendors]);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return uniqueVendors.filter((v) => {
      // City Filter
      if (selectedCity !== 'ALL') {
        const addr = (v.address || '').toLowerCase();
        if (selectedCity === 'Other') {
          const known = ['bangalore', 'bengaluru', 'pune', 'vadodara', 'delhi', 'mumbai', 'chennai', 'hyderabad'];
          if (known.some((k) => addr.includes(k))) return false;
        } else if (!addr.includes(selectedCity.toLowerCase())) {
          return false;
        }
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchAddress = v.address?.toLowerCase().includes(q);
      const matchReg = v.kennelRegNumber?.toLowerCase().includes(q);
      const matchEmail = v.email?.toLowerCase().includes(q);
      const matchPhone = v.phone?.toLowerCase().includes(q);
      return matchName || matchAddress || matchReg || matchEmail || matchPhone;
    });
  }, [uniqueVendors, selectedCity, searchQuery]);

  const selectedVendor = useMemo(() => {
    return uniqueVendors.find((v) => v.id === selectedVendorId) || vendors.find((v) => v.id === selectedVendorId);
  }, [uniqueVendors, vendors, selectedVendorId]);

  if (loading) {
    return (
      <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
        <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading certified vendor kennels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search and City Filter Toolbar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${uniqueVendors.length} certified kennels by name, city, or reg #...`}
            className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* City Filter Pills */}
        {cities.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 select-none text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedCity('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                selectedCity === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Facilities ({uniqueVendors.length})
            </button>
            {cities.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCity(c.name)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                  selectedCity === c.name
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {c.name} ({c.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Kennel Cards List */}
      <div className="max-h-60 overflow-y-auto overscroll-contain space-y-1.5 pr-1 text-xs">
        {/* Allow None Option */}
        {allowNone && (
          <div
            onClick={() => onSelectVendor('')}
            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              !selectedVendorId
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <p className="font-bold leading-tight">{noneLabel}</p>
              <p className={`text-[10px] ${!selectedVendorId ? 'text-slate-300' : 'text-slate-400'}`}>
                {noneSubtext}
              </p>
            </div>
            {!selectedVendorId && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          </div>
        )}

        {filteredVendors.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
            No certified breeder kennels match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredVendors.map((v) => {
            const isSelected = selectedVendorId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVendor(v.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-soft'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-white/10 text-emerald-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs truncate leading-snug">{v.name}</h4>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>VERIFIED</span>
                      </span>
                    </div>

                    <p
                      className={`text-[11px] truncate flex items-center gap-1 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0 opacity-70" />
                      <span>{v.address || 'Breeding Facility'}</span>
                    </p>

                    {v.kennelRegNumber && (
                      <p
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Reg: {v.kennelRegNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
