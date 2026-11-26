'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Truck,
  ShoppingBag,
  Store,
  Sparkles,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();

    const userInput = customUser || identifier;
    const passInput = customPass || password;

    if (!userInput.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }
    if (!passInput) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: userInput.trim(),
          password: passInput,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Full navigation ensures all React session contexts, headers, and cookies re-initialize cleanly
        window.location.href = data.redirectTo || '/admin';
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to connect to authentication server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-lg mx-auto">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Furora
        </h2>
        <p className="text-xs text-slate-500">
          Enter your staff username or email to access your workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="card-clean p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Username or Login Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. ganesan or admin@furora.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(true)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline transition cursor-pointer"
                >
                  Forgot or Change Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* External / Public Links */}
        <div className="text-center space-y-2 text-xs text-slate-500">
          <p>
            Looking to track a companion pet order?{' '}
            <Link href="/track" className="font-bold text-slate-900 hover:underline">
              Live Pet Tracking &rarr;
            </Link>
          </p>
          <p>
            Are you a certified breeder kennel?{' '}
            <Link href="/partner/onboard" className="font-bold text-slate-900 hover:underline">
              Apply for Kennel Onboarding &rarr;
            </Link>
          </p>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        initialEmail={identifier.includes('@') ? identifier.trim() : ''}
      />
    </div>
  );
}
