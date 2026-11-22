'use client';

import React from 'react';
import { LayoutGrid, ClipboardList, ShieldCheck, Truck } from 'lucide-react';

interface MetricItem {
  icon: any;
  label: string;
  value: string | number;
  delta: string;
  deltaType: 'positive' | 'negative' | 'neutral';
}

interface DashboardKpiStripProps {
  metrics?: {
    availablePets?: number;
    activeOrders?: number;
    clearanceRate?: number;
    deliveredCount?: number;
  };
}

export default function DashboardKpiStrip({ metrics }: DashboardKpiStripProps) {
  const items: MetricItem[] = [
    {
      icon: LayoutGrid,
      label: 'Available Pets',
      value: metrics?.availablePets ?? 18,
      delta: '+8 this week',
      deltaType: 'positive',
    },
    {
      icon: ClipboardList,
      label: 'Active Orders',
      value: metrics?.activeOrders ?? 12,
      delta: 'In pipeline',
      deltaType: 'neutral',
    },
    {
      icon: ShieldCheck,
      label: 'Health Clearance',
      value: `${metrics?.clearanceRate ?? 98}%`,
      delta: 'Pass rate',
      deltaType: 'positive',
    },
    {
      icon: Truck,
      label: 'Delivered (POD)',
      value: metrics?.deliveredCount ?? 24,
      delta: '100% verified',
      deltaType: 'positive',
    },
  ];

  return (
    <div className="card-clean p-4 sm:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex items-center space-x-3.5 ${
                idx === 0 ? 'pr-4' : idx === items.length - 1 ? 'pl-4' : 'px-4'
              } ${idx > 0 && idx % 2 === 0 ? 'pt-4 md:pt-0' : ''}`}
            >
              {/* Circular Icon with clean soft border */}
              <div className="w-10 h-10 rounded-full border border-slate-200/80 bg-white flex items-center justify-center flex-shrink-0 text-slate-700 shadow-soft">
                <Icon className="w-4 h-4 text-slate-800" strokeWidth={1.75} />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block tracking-tight">
                  {item.label}
                </span>

                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {item.value}
                  </span>

                  <span
                    className={`text-[10px] font-bold flex items-center ${
                      item.deltaType === 'positive'
                        ? 'text-emerald-600'
                        : item.deltaType === 'negative'
                        ? 'text-rose-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.deltaType === 'positive' && (
                      <span className="mr-0.5 text-[8px]">▲</span>
                    )}
                    {item.delta}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
