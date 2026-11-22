'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DataPoint {
  day: string;
  orders: number;
  delivery: number;
  dateStr: string;
  x: number;
  yOrders: number;
  yDelivery: number;
}

export default function PerformanceChart() {
  const [selectedRange, setSelectedRange] = useState('01-07 May');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dataPoints: DataPoint[] = [
    { day: '01', orders: 4, delivery: 3, dateStr: '01 May 2026', x: 20, yOrders: 85, yDelivery: 55 },
    { day: '02', orders: 5, delivery: 4, dateStr: '02 May 2026', x: 110, yOrders: 70, yDelivery: 75 },
    { day: '03', orders: 7, delivery: 6, dateStr: '03 May 2026', x: 200, yOrders: 35, yDelivery: 60 },
    { day: '04', orders: 6, delivery: 5, dateStr: '04 May 2026', x: 300, yOrders: 40, yDelivery: 75 },
    { day: '05', orders: 8, delivery: 4, dateStr: '05 May 2026', x: 400, yOrders: 50, yDelivery: 90 },
    { day: '06', orders: 5, delivery: 3, dateStr: '06 May 2026', x: 500, yOrders: 40, yDelivery: 85 },
    { day: '07', orders: 7, delivery: 5, dateStr: '07 May 2026', x: 580, yOrders: 30, yDelivery: 75 },
  ];

  const activePoint = hoveredIndex !== null ? dataPoints[hoveredIndex] : null;

  return (
    <div className="card-clean p-5 sm:p-6 space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Performance</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Order volume vs delivery fulfillment trajectory
          </p>
        </div>

        {/* Range Pill Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setSelectedRange(selectedRange === '01-07 May' ? 'This Month' : '01-07 May');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shadow-soft"
          >
            <span>{selectedRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* SVG Chart Canvas with Responsive Layout */}
      <div className="relative pt-2 pb-1">
        <div className="flex">
          {/* Y-Axis Labels (Counts, not hours) */}
          <div className="flex flex-col justify-between text-[10px] text-slate-400 font-medium pr-3 py-1 select-none w-6 text-right">
            <span>12</span>
            <span>8</span>
            <span>6</span>
            <span>2</span>
            <span>0</span>
          </div>

          {/* SVG Grid and Dual Curves with Interactive Hover */}
          <div
            className="flex-1 relative h-40"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 140"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Blue Gradient for Primary Curve */}
                <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>

                {/* Amber Gradient for Secondary Curve */}
                <linearGradient id="amberGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              <line x1="0" y1="10" x2="600" y2="10" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="75" x2="600" y2="75" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="110" x2="600" y2="110" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="135" x2="600" y2="135" stroke="#F1F5F9" strokeWidth="1" />

              {/* Dotted indicator line — ONLY on hover */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1="10"
                  x2={activePoint.x}
                  y2="135"
                  stroke="#CBD5E1"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                />
              )}

              {/* Orange/Amber Line: Deliveries Completed Curve */}
              <path
                d="M 0,55 C 50,75 100,80 150,70 C 200,60 250,90 300,75 C 350,60 400,95 450,90 C 500,85 550,65 600,75"
                fill="none"
                stroke="#F97316"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Blue Line: New Orders Curve */}
              <path
                d="M 0,85 C 50,70 100,75 150,55 C 200,35 250,50 300,40 C 350,30 400,60 450,50 C 500,40 550,25 600,30"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Active dots — ONLY on hover */}
              {activePoint && (
                <>
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yOrders}
                    r="4.5"
                    fill="#3B82F6"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yDelivery}
                    r="4.5"
                    fill="#F97316"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </>
              )}

              {/* Invisible wide hover hit areas for each data point */}
              {dataPoints.map((p, idx) => (
                <rect
                  key={p.day}
                  x={idx === 0 ? 0 : p.x - 40}
                  y="0"
                  width={idx === 0 || idx === dataPoints.length - 1 ? 60 : 80}
                  height="140"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                />
              ))}
            </svg>

            {/* Signature Floating Dark Tooltip Box — ONLY visible when activePoint !== null */}
            {activePoint && (
              <div
                className="absolute -top-10 -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-xl px-3.5 py-2.5 text-xs z-20 space-y-1.5 border border-slate-800 pointer-events-none transition-all duration-100 animate-in fade-in zoom-in-95"
                style={{
                  left: `${(activePoint.x / 600) * 100}%`,
                  width: '125px',
                }}
              >
                <div className="text-[10px] text-slate-400 font-semibold tracking-wide border-b border-slate-800 pb-1">
                  {activePoint.dateStr}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <span className="w-1.5 h-3 rounded-full bg-blue-500 inline-block"></span>
                    <span>Orders</span>
                  </span>
                  <span className="font-bold text-white">{activePoint.orders}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <span className="w-1.5 h-3 rounded-full bg-orange-500 inline-block"></span>
                    <span>Delivered</span>
                  </span>
                  <span className="font-bold text-white">{activePoint.delivery}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between pl-8 pr-1 pt-2 text-[10px] text-slate-400 font-medium select-none">
          {dataPoints.map((p, idx) => (
            <span
              key={p.day}
              onMouseEnter={() => setHoveredIndex(idx)}
              className={`cursor-pointer transition ${
                hoveredIndex === idx ? 'font-bold text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {p.day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
