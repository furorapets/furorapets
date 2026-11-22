'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileSearch,
  Stethoscope,
  Truck,
  Clock,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status: 'In progress' | 'On hold' | 'Done';
  time: string;
  iconType: 'inspection' | 'medical' | 'delivery';
}

export default function ActiveTasksList() {
  const [filter, setFilter] = useState('All');

  const defaultTasks: TaskItem[] = [
    {
      id: '1',
      title: 'Physical Pickup Inspection — FUR-ORD-001025',
      subtitle: 'Golden Retriever at Pet World facility',
      href: '/agent/order',
      status: 'In progress',
      time: '2h ago',
      iconType: 'inspection',
    },
    {
      id: '2',
      title: 'Veterinary Examination & Clearances — FUR-PET-000124',
      subtitle: 'Persian Cat awaiting health documentation',
      href: '/records/FUR-ORD-001025',
      status: 'On hold',
      time: '6h ago',
      iconType: 'medical',
    },
    {
      id: '3',
      title: 'Customer Delivery & POD Handover — FUR-ORD-001020',
      subtitle: 'Delivered to Ananya Sharma with verified signature',
      href: '/certificate/FUR-ORD-001025',
      status: 'Done',
      time: 'Yesterday',
      iconType: 'delivery',
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'inspection':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileSearch className="w-4 h-4" />
          </div>
        );
      case 'medical':
        return (
          <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
        );
      case 'delivery':
        return (
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'In progress':
        return (
          <span className="flex items-center text-xs font-semibold text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 inline-block animate-pulse"></span>
            In progress
          </span>
        );
      case 'On hold':
        return (
          <span className="flex items-center text-xs font-semibold text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 inline-block"></span>
            On hold
          </span>
        );
      case 'Done':
        return (
          <span className="flex items-center text-xs font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
            Done
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="card-clean p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Operations</h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            Live Pipeline
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter(filter === 'All' ? 'Week' : 'All')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shadow-soft"
          >
            <span>{filter === 'All' ? 'All Operations' : 'This Week'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-slate-100">
        {defaultTasks.map((task) => (
          <div
            key={task.id}
            className="py-3.5 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl px-2 transition"
          >
            {/* Left: Icon + Title */}
            <div className="flex items-center space-x-3.5 min-w-0 pr-4">
              {getIcon(task.iconType)}

              <div className="min-w-0 truncate">
                <Link
                  href={task.href}
                  className="text-xs font-bold text-slate-900 hover:text-blue-600 transition truncate block"
                >
                  {task.title}
                </Link>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {task.subtitle}
                </div>
              </div>
            </div>

            {/* Right: Status Dot + Time + Menu */}
            <div className="flex items-center space-x-6 flex-shrink-0">
              <div className="hidden sm:block">{getStatusDot(task.status)}</div>

              <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-300" />
                <span>{task.time}</span>
              </div>

              <Link
                href={task.href}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                title="View details"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
