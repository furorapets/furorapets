'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/context/session-context';
import DashboardSidebar from './dashboard-sidebar';
import PersonaSwitchModal from './persona-switch-modal';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutShellProps {
  children: React.ReactNode;
}

export default function DashboardLayoutShell({ children }: DashboardLayoutShellProps) {
  const pathname = usePathname();
  const { currentUser, availableUsers, switchRole } = useSession();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global automatic body and background scroll lock whenever any modal/popup is open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkModalState = () => {
      // Detect any active modal, dialog, or drawer
      const modalActive = !!document.querySelector(
        '.fixed.inset-0.z-50, .fixed.inset-0.z-\\[50\\], [data-modal="true"], [role="dialog"], .modal-backdrop'
      );

      if (modalActive) {
        if (!document.body.classList.contains('modal-open')) {
          const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
          }
          document.body.classList.add('modal-open');
        }
      } else {
        if (document.body.classList.contains('modal-open')) {
          document.body.style.paddingRight = '';
          document.body.classList.remove('modal-open');
        }
      }
    };

    checkModalState();

    const observer = new MutationObserver(() => {
      checkModalState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open']
    });

    return () => {
      observer.disconnect();
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Standalone public pages (Login, Live Tracking, Public Records, Certificates, Partner Landing) render full-page without internal dashboard sidebar
  const isStandalonePage =
    pathname.startsWith('/certificate/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/records/') ||
    pathname.startsWith('/partner/onboard');

  if (isStandalonePage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col antialiased text-slate-800">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center">
          <span className="font-extrabold text-slate-900 text-lg">furora</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSwitchModalOpen(true)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
          >
            {currentUser?.role || 'Switch'}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full min-h-screen">
        {/* Left Sidebar (Desktop) */}
        <div className="hidden lg:block sticky top-0 h-screen z-30">
          <DashboardSidebar
            currentUser={currentUser}
            onOpenSwitchModal={() => setIsSwitchModalOpen(true)}
          />
        </div>

        {/* Mobile Slide-over Sidebar */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 bg-white w-64 h-full shadow-2xl flex flex-col">
              <DashboardSidebar
                currentUser={currentUser}
                onOpenSwitchModal={() => {
                  setIsMobileMenuOpen(false);
                  setIsSwitchModalOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Center Workspace Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Persona Switcher Modal */}
      <PersonaSwitchModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitch={switchRole}
      />
    </div>
  );
}
