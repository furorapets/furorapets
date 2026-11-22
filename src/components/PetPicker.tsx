'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Check, PawPrint, Clock } from 'lucide-react';

export interface PetPickerProps {
  pets: any[];
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  noneSubtext?: string;
  breedName?: string;
  loading?: boolean;
}

export default function PetPicker({
  pets = [],
  selectedPetId,
  onSelectPet,
  allowNone = true,
  noneLabel = 'No pet linked yet (Assign vendor or allocate later)',
  noneSubtext = 'Create order without pet; dispatch to vendor kennel or allocate from stock later.',
  breedName,
  loading = false,
}: PetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Male' | 'Female'>('ALL');

  const maleCount = useMemo(() => pets.filter((p) => p.sex === 'Male').length, [pets]);
  const femaleCount = useMemo(() => pets.filter((p) => p.sex === 'Female').length, [pets]);

  const filteredPets = useMemo(() => {
    return pets.filter((p) => {
      if (genderFilter !== 'ALL' && p.sex !== genderFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchId = p.petId?.toLowerCase().includes(q);
      const matchColour = p.colour?.toLowerCase().includes(q);
      const matchSex = p.sex?.toLowerCase().includes(q);
      const matchVendor = p.vendor?.name?.toLowerCase().includes(q);
      const matchOwner = p.inventoryOwner?.toLowerCase().includes(q);
      const matchChip = p.microchipNumber?.toLowerCase().includes(q);
      return matchId || matchColour || matchSex || matchVendor || matchOwner || matchChip;
    });
  }, [pets, genderFilter, searchQuery]);

  const selectedPet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId);
  }, [pets, selectedPetId]);

  if (loading) {
    return (
      <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
        <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Checking live inventory for available pets...</p>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/60 text-center space-y-1.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <PawPrint className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-slate-700">
          No in-stock pets currently available {breedName ? `for ${breedName}` : ''}
        </p>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          You can create this order and dispatch it to a certified vendor kennel to source the pet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search and Quick Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${pets.length} pets by ID, sex, colour, or kennel...`}
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

        {/* Gender Filter Pills & Count */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="inline-flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={() => setGenderFilter('ALL')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                genderFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({pets.length})
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Male')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                genderFilter === 'Male'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              ♂ Male ({maleCount})
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('Female')}
              className={`px-2 py-0.5 rounded-md font-medium transition ${
                genderFilter === 'Female'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              ♀ Female ({femaleCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'} shown
          </span>
        </div>
      </div>

      {/* Selectable Pet Cards Container */}
      <div className="max-h-56 sm:max-h-64 overflow-y-auto overscroll-contain space-y-1.5 pr-1 rounded-2xl border border-slate-100 p-1.5 bg-slate-50/40">
        {/* Optional 'None' Card */}
        {allowNone && (
          <button
            type="button"
            onClick={() => onSelectPet('')}
            className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
              !selectedPetId
                ? 'bg-white border-slate-900 ring-2 ring-slate-900 shadow-xs'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{noneLabel}</div>
                <div className="text-[10px] text-slate-400 truncate">{noneSubtext}</div>
              </div>
            </div>
            <div className="shrink-0">
              {!selectedPetId ? (
                <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
              )}
            </div>
          </button>
        )}

        {/* Pet Cards List */}
        {filteredPets.length === 0 ? (
          <div className="p-4 text-center space-y-1 bg-white rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">No pets match your search criteria</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('ALL');
              }}
              className="text-[11px] font-bold text-slate-900 underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredPets.map((p) => {
            const isSelected = selectedPetId === p.id;
            const photoUrl = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
            const isFuroraHQ = p.inventoryOwner === 'FURORA';
            const locationLabel = isFuroraHQ ? 'Furora HQ Stock' : p.vendor?.name ? `Vendor: ${p.vendor.name}` : 'Certified Kennel';

            return (
              <button
                type="button"
                key={p.id}
                onClick={() => onSelectPet(p.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-white border-slate-900 ring-2 ring-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo or Paw Avatar */}
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={p.petId}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200">
                      <PawPrint className="w-4 h-4 text-slate-500" />
                    </div>
                  )}

                  {/* Pet Info */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">{p.petId}</span>

                      {/* Gender Badge */}
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                          p.sex === 'Male'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.sex === 'Male' ? '♂ Male' : '♀ Female'}
                      </span>

                      {/* Colour */}
                      {p.colour && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {p.colour}
                        </span>
                      )}

                      {/* Dynamic Age */}
                      {(p.dynamicAge || p.age) && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {p.dynamicAge || p.age}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate">
                      <span className="truncate">{locationLabel}</span>
                      {p.microchipNumber && (
                        <>
                          <span>•</span>
                          <span className="font-mono truncate">Chip: {p.microchipNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Radio selection check */}
                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected Pet Quick Callout */}
      {selectedPet && (
        <div className="p-2 px-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 truncate">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              Selected <strong className="font-mono">{selectedPet.petId}</strong> ({selectedPet.sex} • {selectedPet.colour || 'Standard'} • {selectedPet.dynamicAge || selectedPet.age || 'Available'})
            </span>
          </div>
          {allowNone && (
            <button
              type="button"
              onClick={() => onSelectPet('')}
              className="text-[10px] font-semibold text-slate-300 hover:text-white underline ml-2 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
