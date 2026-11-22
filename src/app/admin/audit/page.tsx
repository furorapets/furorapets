'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Clock, User, Filter, CheckCircle2, Sparkles, Activity, ClipboardList, Layers, Store } from 'lucide-react';
import { useSession } from '@/context/session-context';

export default function AdminAuditPage() {
  const { currentUser, switchToRoleName } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = '/api/audit';
      if (actionFilter) url += `?action=${actionFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="card-clean p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Access Restricted (Admin Only)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current persona is <strong>{currentUser.name}</strong> ({currentUser.role}).
            Immutable audit trail logs and compliance records are restricted to Furora Administrators.
          </p>
        </div>
        <button
          onClick={() => switchToRoleName('ADMIN')}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-soft"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Switch to Furora Admin
        </button>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-800 border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mr-1.5 inline-block"></span>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderMetadata = (metadata: string) => {
    if (!metadata) return <span className="text-slate-300 font-mono text-xs">—</span>;

    const orderMatch = metadata.match(/FUR-ORD-\d+/);
    const petMatch = metadata.match(/FUR-PET-\d+/);

    try {
      const parsed = JSON.parse(metadata);
      const orderId = parsed.orderId || orderMatch?.[0];
      const petId = parsed.petId || petMatch?.[0];
      const vendorId = parsed.vendorId;

      return (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          {orderId && (
            <Link
              href={`/admin/orders?q=${orderId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              title="Inspect order in Orders & Dispatch"
            >
              <ClipboardList className="w-2.5 h-2.5 text-slate-500" />
              <span>{orderId}</span>
            </Link>
          )}
          {petId && (
            <Link
              href={`/admin/categories?q=${petId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              title="Inspect pet in Category & Pet Inventory"
            >
              <Layers className="w-2.5 h-2.5 text-slate-500" />
              <span>{petId}</span>
            </Link>
          )}
          {vendorId && (
            <Link
              href={`/admin/vendors?q=${vendorId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              title="Inspect vendor in Vendors"
            >
              <Store className="w-2.5 h-2.5 text-slate-500" />
              <span>Vendor</span>
            </Link>
          )}
          {!orderId && !petId && !vendorId && (
            <span className="truncate max-w-xs">{metadata}</span>
          )}
        </div>
      );
    } catch (e) {
      if (orderMatch || petMatch) {
        return (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {orderMatch && (
              <Link
                href={`/admin/orders?q=${orderMatch[0]}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                <ClipboardList className="w-2.5 h-2.5 text-slate-500" />
                <span>{orderMatch[0]}</span>
              </Link>
            )}
            {petMatch && (
              <Link
                href={`/admin/categories?q=${petMatch[0]}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                <Layers className="w-2.5 h-2.5 text-slate-500" />
                <span>{petMatch[0]}</span>
              </Link>
            )}
          </div>
        );
      }
      return <span className="truncate max-w-xs text-slate-600">{metadata}</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              System Activity
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Real-time chronological log of orders, pet state transitions, and partner events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="card-clean px-2.5 py-1.5 flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-slate-700 pr-4 focus:outline-none cursor-pointer"
            >
              <option value="">All Audit Actions</option>
              <option value="PET_CREATED">Pet Created</option>
              <option value="PET_STATUS_TRANSITION">Pet Status Transition</option>
              <option value="INVENTORY_OWNERSHIP_MOVE">Inventory Transfer</option>
              <option value="ORDER_STATUS_TRANSITION">Order Transition</option>
              <option value="DOCUMENT_UPLOADED">Document Upload</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card-clean overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left">Timestamp</th>
                <th className="px-6 py-3.5 text-left">Action Event</th>
                <th className="px-6 py-3.5 text-left">State Transition</th>
                <th className="px-6 py-3.5 text-left">Actor / User</th>
                <th className="px-6 py-3.5 text-left">Context Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {log.fromState || log.toState ? (
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-400">{log.fromState || 'START'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {log.toState}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {(log.user?.name || 'S')[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{log.user?.name || 'System Auto'}</div>
                          <div className="text-[10px] text-slate-400">
                            {log.user?.role}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {renderMetadata(log.metadata)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
