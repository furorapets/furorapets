'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Check, Truck, MapPin, Phone, ShieldCheck } from 'lucide-react';

export interface AgentPickerProps {
  agents: any[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  noneSubtext?: string;
  loading?: boolean;
}

export default function AgentPicker({
  agents = [],
  selectedAgentId,
  onSelectAgent,
  allowNone = false,
  noneLabel = 'No delivery agent assigned yet',
  noneSubtext = 'Order will remain awaiting agent dispatch.',
  loading = false,
}: AgentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Deduplicate agents by name & email/address if any duplicates exist
  const uniqueAgents = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const a of agents) {
      const key = `${a.name?.trim().toLowerCase()}_${(a.email || a.phone || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(a);
      }
    }
    return list;
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return uniqueAgents.filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = a.name?.toLowerCase().includes(q);
      const matchAddress = a.address?.toLowerCase().includes(q);
      const matchEmail = a.email?.toLowerCase().includes(q);
      const matchPhone = a.phone?.toLowerCase().includes(q);
      return matchName || matchAddress || matchEmail || matchPhone;
    });
  }, [uniqueAgents, searchQuery]);

  const selectedAgent = useMemo(() => {
    return uniqueAgents.find((a) => a.id === selectedAgentId) || agents.find((a) => a.id === selectedAgentId);
  }, [uniqueAgents, agents, selectedAgentId]);

  if (loading) {
    return (
      <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
        <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading delivery partners & ops agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${uniqueAgents.length} ops agents by name, hub, or phone...`}
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

      {/* Scrollable Agent Cards List */}
      <div className="max-h-56 overflow-y-auto overscroll-contain space-y-1.5 pr-1 text-xs">
        {allowNone && (
          <div
            onClick={() => onSelectAgent('')}
            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              !selectedAgentId
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <p className="font-bold leading-tight">{noneLabel}</p>
              <p className={`text-[10px] ${!selectedAgentId ? 'text-slate-300' : 'text-slate-400'}`}>
                {noneSubtext}
              </p>
            </div>
            {!selectedAgentId && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          </div>
        )}

        {filteredAgents.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
            No delivery agents match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredAgents.map((a) => {
            const isSelected = selectedAgentId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => onSelectAgent(a.id)}
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
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs truncate leading-snug">{a.name}</h4>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>OPS AGENT</span>
                      </span>
                    </div>

                    <p
                      className={`text-[11px] truncate flex items-center gap-1 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0 opacity-70" />
                      <span>{a.address || 'Field Hub'}</span>
                    </p>

                    {a.phone && (
                      <p
                        className={`text-[10px] flex items-center gap-1 ${
                          isSelected ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>{a.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

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
