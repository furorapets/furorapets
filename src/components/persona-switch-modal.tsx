'use client';

import React from 'react';
import { SessionUser } from '@/types';
import { Shield, Users, Store, Truck, ShoppingBag, Check, X } from 'lucide-react';

interface PersonaSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser | null;
  availableUsers: SessionUser[];
  onSwitch: (userId: string) => void;
}

export default function PersonaSwitchModal({
  isOpen,
  onClose,
  currentUser,
  availableUsers,
  onSwitch,
}: PersonaSwitchModalProps) {
  if (!isOpen) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'SALES':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'VENDOR':
        return <Store className="w-4 h-4 text-amber-600" />;
      case 'DELIVERY_AGENT':
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case 'CUSTOMER':
        return <ShoppingBag className="w-4 h-4 text-pink-600" />;
      default:
        return <Users className="w-4 h-4 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SALES':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'VENDOR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELIVERY_AGENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CUSTOMER':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Switch Persona</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate any role to verify backend-enforced RBAC and visibility
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {availableUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            return (
              <button
                key={user.id}
                onClick={() => {
                  onSwitch(user.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition text-left ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span>{user.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{user.email}</div>
                  </div>
                </div>

                {isCurrent && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
