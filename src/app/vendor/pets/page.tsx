'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ShieldAlert, X, Sparkles, Clock, AlertCircle, XCircle, ArrowRight } from 'lucide-react';
import { useSession } from '@/context/session-context';

export default function VendorPetsPage() {
  const { currentUser, switchToRoleName } = useSession();
  const [pets, setPets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Pet modal
  const [creatingPet, setCreatingPet] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newBreedId, setNewBreedId] = useState('');
  const [newDob, setNewDob] = useState('2026-07-01');
  const [newSex, setNewSex] = useState('Female');
  const [newColour, setNewColour] = useState('White & Grey');
  const [newFatherName, setNewFatherName] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [newKci, setNewKci] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [petsRes, catRes] = await Promise.all([
        fetch('/api/pets'),
        fetch('/api/categories'),
      ]);

      const petsData = await petsRes.json();
      const catData = await catRes.json();

      if (petsData.success) setPets(petsData.data);
      if (catData.success) {
        setCategories(catData.data);
        if (catData.data.length > 0 && !newCatId) {
          setNewCatId(catData.data[0].id);
          const activeBreeds = catData.data[0].breeds?.filter((b: any) => b.active) || [];
          setBreeds(activeBreeds);
          if (activeBreeds.length > 0) setNewBreedId(activeBreeds[0].id);
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
  }, []);

  const handleCatChange = (catId: string) => {
    setNewCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    const activeBreeds = cat?.breeds?.filter((b: any) => b.active) || [];
    setBreeds(activeBreeds);
    if (activeBreeds.length > 0) setNewBreedId(activeBreeds[0].id);
    else setNewBreedId('');
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId || !newBreedId) {
      alert('Please select category and breed');
      return;
    }
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newCatId,
          breedId: newBreedId,
          dob: newDob,
          sex: newSex,
          colour: newColour,
          fatherName: newFatherName,
          motherName: newMotherName,
          kciRegistered: newKci,
          photos: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatingPet(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'VENDOR' && currentUser.role !== 'ADMIN') {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Vendor Portal (Breeder Inventory)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current persona is <strong>{currentUser.name}</strong> ({currentUser.role}).
            Breeder facility inventory requires Vendor or Admin authentication.
          </p>
        </div>
        <button
          onClick={() => switchToRoleName('VENDOR')}
          className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition shadow-soft"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Switch to Pet World Breeders (Vendor)
        </button>
      </div>
    );
  }

  // Vendor Onboarding Compliance Gate
  if (currentUser?.role === 'VENDOR' && currentUser?.onboardingStatus && currentUser.onboardingStatus !== 'APPROVED') {
    const isPending = currentUser.onboardingStatus === 'PENDING';
    const isChangesRequested = currentUser.onboardingStatus === 'CHANGES_REQUESTED';

    return (
      <div className="card-clean p-8 max-w-xl mx-auto mt-12 text-center space-y-5">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            isPending
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : isChangesRequested
              ? 'bg-orange-50 text-orange-600 border border-orange-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}
        >
          {isPending ? (
            <Clock className="w-7 h-7 animate-pulse" />
          ) : isChangesRequested ? (
            <AlertCircle className="w-7 h-7" />
          ) : (
            <XCircle className="w-7 h-7" />
          )}
        </div>

        <div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
              isPending
                ? 'bg-amber-100 text-amber-800'
                : isChangesRequested
                ? 'bg-orange-100 text-orange-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isPending
              ? 'Verification Under Review'
              : isChangesRequested
              ? 'Action Required: Re-submission'
              : 'Application Not Approved'}
          </span>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isPending
              ? 'Breeder Partner Account Pending Review'
              : isChangesRequested
              ? 'Document Re-submission Requested'
              : 'Application Not Approved'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Facility: <strong>{currentUser.name}</strong> • KCI / AWBI Reg:{' '}
            <span className="font-mono">{currentUser.kennelRegNumber || 'Under Review'}</span>
          </p>
        </div>

        {isChangesRequested && currentUser.onboardingNotes && (
          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-left text-xs text-orange-950 space-y-1">
            <span className="font-bold text-orange-800 block">Furora Admin Correction Notes:</span>
            <p className="italic">"{currentUser.onboardingNotes}"</p>
          </div>
        )}

        {isPending && (
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Your breeding facility is currently undergoing document verification. Listing pets is enabled once your
            kennel accreditation is verified by Furora compliance.
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/partner/onboard?email=${encodeURIComponent(currentUser.email)}&tab=track`}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{isChangesRequested ? 'Update & Re-submit Documents' : 'Track Status on Partner Portal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => switchToRoleName('ADMIN')}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Switch to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Kennel Pet Inventory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Facility Stock
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Isolated pet inventory registered for {currentUser?.name || 'your kennel'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreatingPet(true)}
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Pet to Inventory
          </button>
        </div>
      </div>

      {/* Pet List */}
      <div className="card-clean overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left">Pet ID</th>
                <th className="px-6 py-3.5 text-left">Breed & Category</th>
                <th className="px-6 py-3.5 text-left">Age / Sex / Colour</th>
                <th className="px-6 py-3.5 text-left">Parents / Pedigree</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    You have no pets in your kennel inventory yet. Click &ldquo;Add Pet to Inventory&rdquo; to add your first pet.
                  </td>
                </tr>
              ) : (
                pets.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {p.petId}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.breed?.name}</div>
                      <div className="text-[11px] text-slate-400">{p.category?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{p.age}</div>
                      <div className="text-[11px] text-slate-400">{p.sex} • {p.colour}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="text-[11px]">Sire: <span className="font-semibold text-slate-800">{p.fatherName || 'Not recorded'}</span></div>
                      <div className="text-[11px]">Dam: <span className="font-semibold text-slate-800">{p.motherName || 'Not recorded'}</span></div>
                      {p.kciRegistered && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-150">
                          KCI Certified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50/70 border-emerald-150 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Vendor Pet Creation */}
      {creatingPet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-lg w-full p-6 shadow-2xl space-y-4 rounded-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Add Pet to Your Facility</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pet ID is auto-generated (`FUR-PET-######`) and assigned directly to your inventory.
                </p>
              </div>
              <button
                onClick={() => setCreatingPet(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                  <select
                    value={newCatId}
                    onChange={(e) => handleCatChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Breed (Active Only)</label>
                  <select
                    value={newBreedId}
                    onChange={(e) => setNewBreedId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {breeds.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">DOB</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sex</label>
                  <select
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Colour</label>
                  <input
                    type="text"
                    value={newColour}
                    onChange={(e) => setNewColour(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Lineage & Parents
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Sire / Father Name"
                    value={newFatherName}
                    onChange={(e) => setNewFatherName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Dam / Mother Name"
                    value={newMotherName}
                    onChange={(e) => setNewMotherName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKci}
                    onChange={(e) => setNewKci(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 text-xs">KCI Registered Pet</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingPet(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
