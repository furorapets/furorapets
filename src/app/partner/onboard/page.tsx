'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Building,
  Heart,
  Truck,
  DollarSign,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Layers,
  FileCheck,
  UserCheck,
  Lock,
  ChevronDown,
  HelpCircle,
  Award,
  RotateCw,
  KeyRound,
} from 'lucide-react';
import FileUploadField from '@/components/FileUploadField';

export default function PartnerOnboardPage() {
  // Page Mode: 'LANDING' (default) or 'WIZARD' (filling onboarding details) or 'TRACK'
  const [pageMode, setPageMode] = useState<'LANDING' | 'WIZARD' | 'TRACK'>('LANDING');

  // Quick Register Form State (Landing Page)
  const [regForm, setRegForm] = useState({
    kennelName: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Captcha & Email OTP State
  const [captchaSvg, setCaptchaSvg] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);

  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpToken, setOtpToken] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState<number>(0);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string>('');

  // Active Registered Vendor Session State
  const [registeredVendor, setRegisteredVendor] = useState<any | null>(null);

  // Wizard Step State (1: Documents, 2: Bank Settlement, 3: Review & Submit, 4: Success)
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Compliance Documents & Bank Form State
  const [formData, setFormData] = useState({
    kennelRegNumber: '',
    kennelRegDoc: '',
    govIdDoc: '',
    tradeLicenseDoc: '',
    vetAffiliationDoc: '',
    bankDetailsDoc: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    ethicalDeclaration: false,
  });

  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState('');

  // Status Lookup State (Track tab / modal)
  const [trackEmail, setTrackEmail] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResult, setTrackResult] = useState<any | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Check URL query parameters for pre-fill / direct status check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const tabParam = params.get('tab');
      if (emailParam) {
        setTrackEmail(emailParam);
        handleLookupStatus(emailParam);
        if (tabParam === 'track') {
          setPageMode('TRACK');
        }
      }
    }
  }, []);

  // Fetch security captcha on component mount
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (data.success) {
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.token);
        setCaptchaInput('');
      }
    } catch (err) {
      console.error('Failed to load captcha:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // OTP Resend Countdown Timer
  useEffect(() => {
    if (otpResendCountdown > 0) {
      const timer = setTimeout(() => setOtpResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCountdown]);

  // 1. Initial Step: Send Email OTP (Validates inputs & Captcha)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError('');

    if (!regForm.kennelName.trim()) {
      setRegError('Please enter your Kennel / Facility name');
      return;
    }
    if (!regForm.phone.trim() || regForm.phone.trim().length < 10) {
      setRegError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!regForm.email.trim() || !regForm.email.includes('@')) {
      setRegError('Please enter a valid contact email address');
      return;
    }
    if (!regForm.city.trim()) {
      setRegError('Please enter your Kennel city/location');
      return;
    }
    if (!captchaInput.trim()) {
      setRegError('Please enter the security verification captcha code');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regForm.email.trim(),
          kennelName: regForm.kennelName.trim(),
          captchaToken,
          captchaInput: captchaInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        fetchCaptcha();
        throw new Error(data.error || 'Failed to send verification code');
      }

      setOtpToken(data.otpToken);
      setOtpSent(true);
      setOtpCode('');
      setOtpResendCountdown(30);
      setOtpSuccessMessage(data.message || `Code dispatched to ${regForm.email.trim()}`);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // 2. Final Step: Confirm OTP & Transition directly to Wizard
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setRegError('Please enter the 6-digit verification code sent to your email');
      return;
    }

    setOtpLoading(true);
    try {
      const fullName = regForm.contactName.trim()
        ? `${regForm.kennelName.trim()} (${regForm.contactName.trim()})`
        : regForm.kennelName.trim();

      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regForm.email.trim(),
          otp: otpCode.trim(),
          otpToken,
          registrationData: {
            kennelName: regForm.kennelName.trim(),
            contactName: regForm.contactName.trim(),
            name: fullName,
            phone: regForm.phone.trim(),
            city: regForm.city.trim(),
            address: regForm.city.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verification failed. Please check the code or resend.');
      }

      setRegisteredVendor(data.data);
      setTrackResult(data.data);

      if (data.data) {
        setFormData((prev) => ({
          ...prev,
          kennelRegNumber: data.data.kennelRegNumber || '',
          kennelRegDoc: data.data.kennelRegDoc || '',
          govIdDoc: data.data.govIdDoc || '',
          tradeLicenseDoc: data.data.tradeLicenseDoc || '',
          vetAffiliationDoc: data.data.vetAffiliationDoc || '',
          bankDetailsDoc: data.data.bankDetailsDoc || '',
        }));
      }

      // Transition smoothly from landing page into the details wizard!
      setPageMode('WIZARD');
      setWizardStep(1);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // 2. Lookup Existing Application (Resume / Track)
  const handleLookupStatus = async (emailToSearch?: string) => {
    const email = emailToSearch || trackEmail;
    if (!email || !email.trim()) {
      setTrackError('Please enter your registered mobile or email');
      return;
    }

    setTrackingLoading(true);
    setTrackError('');
    try {
      const res = await fetch(`/api/vendor-onboarding?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No partner application found for this email');

      setTrackResult(data.data);
      setRegisteredVendor(data.data);

      // Pre-fill form state
      setFormData({
        kennelRegNumber: data.data.kennelRegNumber || '',
        kennelRegDoc: data.data.kennelRegDoc || '',
        govIdDoc: data.data.govIdDoc || '',
        tradeLicenseDoc: data.data.tradeLicenseDoc || '',
        vetAffiliationDoc: data.data.vetAffiliationDoc || '',
        bankDetailsDoc: data.data.bankDetailsDoc || '',
        bankName: 'HDFC Bank Ltd',
        accountNumber: '50200088991122',
        ifscCode: 'HDFC0001234',
        ethicalDeclaration: true,
      });

      // If changes are requested or draft, allow immediate transition into wizard!
      if (data.data.onboardingStatus === 'CHANGES_REQUESTED' || data.data.onboardingStatus === 'DRAFT') {
        setPageMode('WIZARD');
        setWizardStep(1);
      } else {
        setPageMode('TRACK');
      }
    } catch (err: any) {
      setTrackError(err.message);
      setTrackResult(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Check admin notes to flag specific documents
  const getDocCompliance = (docKey: string) => {
    if (trackResult?.onboardingStatus !== 'CHANGES_REQUESTED') {
      return { status: 'NONE' as const, feedback: '' };
    }
    const notes = trackResult?.onboardingNotes || '';
    if (!notes) return { status: 'NONE' as const, feedback: '' };

    const keywords: { [k: string]: string[] } = {
      kennelRegDoc: ['kennel club', 'registration certificate', 'kci', 'kennelregdoc'],
      govIdDoc: ['govt id', 'aadhaar', 'pan', 'identity proof', 'goviddoc'],
      tradeLicenseDoc: ['trade license', 'municipal', 'pet shop', 'tradelicensedoc'],
      vetAffiliationDoc: ['vet', 'veterinary', 'healthcare mou', 'clinic', 'vetaffiliationdoc'],
      bankDetailsDoc: ['bank', 'cheque', 'passbook', 'ifsc', 'account', 'bankdetailsdoc'],
    };

    const list = keywords[docKey] || [];
    const lowerNotes = notes.toLowerCase();
    const isFlagged = list.some((term) => lowerNotes.includes(term.toLowerCase()));

    if (isFlagged) {
      const lines = notes.split('\n');
      const matchedLine = lines.find((line: string) =>
        list.some((term) => line.toLowerCase().includes(term.toLowerCase()))
      );
      const feedback = matchedLine ? matchedLine.replace(/^[•\-\*]\s*/, '').trim() : notes;
      return { status: 'NEEDS_UPDATE' as const, feedback };
    }

    return { status: 'APPROVED' as const, feedback: '' };
  };

  // Wizard Step Validations
  const validateStep1 = () => {
    if (!formData.kennelRegNumber.trim()) return 'Kennel Club / AWBI registration number is required';
    if (!formData.kennelRegDoc) return 'Please upload your Kennel Registration Certificate';
    if (!formData.govIdDoc) return 'Please upload your Breeder Government Photo ID';
    if (!formData.tradeLicenseDoc) return 'Please upload your Municipal / AWBI Pet Shop Trade License';
    if (!formData.vetAffiliationDoc) return 'Please upload your Registered Vet Clinic Affiliation MoU';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.bankDetailsDoc) return 'Please upload Bank Account Proof (Canceled Cheque / Passbook)';
    return null;
  };

  const nextWizardStep = () => {
    setWizardError('');
    if (wizardStep === 1) {
      const err = validateStep1();
      if (err) {
        setWizardError(err);
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const err = validateStep2();
      if (err) {
        setWizardError(err);
        return;
      }
      setWizardStep(3);
    }
  };

  const prevWizardStep = () => {
    setWizardError('');
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  // 3. Submit Full Onboarding Application
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSubmitting(true);
    setWizardError('');

    if (!formData.ethicalDeclaration) {
      setWizardError('Please check and accept the ethical breeding declaration.');
      setWizardSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/vendor-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_APPLICATION',
          name: registeredVendor?.name || regForm.kennelName,
          email: registeredVendor?.email || regForm.email,
          phone: registeredVendor?.phone || regForm.phone,
          address: registeredVendor?.address || regForm.city,
          city: regForm.city,
          kennelRegNumber: formData.kennelRegNumber,
          kennelRegDoc: formData.kennelRegDoc,
          govIdDoc: formData.govIdDoc,
          tradeLicenseDoc: formData.tradeLicenseDoc,
          vetAffiliationDoc: formData.vetAffiliationDoc,
          bankDetailsDoc: formData.bankDetailsDoc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit application');

      setTrackResult(data.data);
      setWizardStep(4); // Success screen
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setWizardSubmitting(false);
    }
  };

  // FAQs List
  const faqs = [
    {
      q: 'Who is eligible to register as a breeder on Furora?',
      a: 'Any ethical breeder or kennel operating in India with a valid Kennel Club of India (KCI) or Animal Welfare Board of India (AWBI) registration, local municipal trade license, and a registered veterinary clinic affiliation can partner with Furora.',
    },
    {
      q: 'How does the onboarding and approval process work?',
      a: '1) Quick registration with your mobile and email. 2) Upload your 4 legal documents and bank account proof. 3) Our compliance team verifies your AWBI credentials within 24 to 48 hours. 4) Once approved, your dedicated Breeder Dashboard is activated to add pets and receive orders.',
    },
    {
      q: 'What happens if one of my documents needs update or correction?',
      a: 'You will immediately receive an email detailing the exact document that needs clarification. When you open your onboarding link, only the flagged document will be highlighted in orange for easy re-upload without losing any other data.',
    },
    {
      q: 'How and when are payments transferred to my bank account?',
      a: 'Furora holds customer funds safely in escrow. As soon as the delivery agent completes customer handover and proof of delivery (POD), the agreed payout is settled directly to your verified bank account.',
    },
    {
      q: 'Does Furora charge any upfront onboarding fees?',
      a: 'No. Registration and onboarding verification on the Furora Partner Network are 100% free of charge.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">furora</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Partner Network
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
            {pageMode === 'TRACK' && (
              <button
                onClick={() => setPageMode('LANDING')}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                &larr; Back to Home
              </button>
            )}

            <button
              onClick={() => {
                setPageMode('TRACK');
                setTrackError('');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                pageMode === 'TRACK'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Track / Resume Application</span>
            </button>

            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition shadow-2xs"
            >
              <span>Breeder Login</span>
              <ArrowRight className="w-3 h-3 text-slate-300" />
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: THE PUBLIC LANDING PAGE (Clean, high-conversion B2B portal)        */}
      {/* ========================================================================= */}
      {pageMode === 'LANDING' && (
        <div>
          {/* Hero Section with Quick Registration Card */}
          <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pt-10 pb-16 border-b border-slate-200/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Headlines & Value Propositions */}
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-900 border border-amber-300/60">
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    <span>India&apos;s #1 Ethical Breeder & Kennel Ecosystem</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
                    Grow Your Kennel with <span className="text-amber-600">Furora</span>
                  </h1>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                    Connect directly with verified pet parents across India. We manage order placement, doorstep AC cab pickup, comprehensive veterinary medical clearance, and prompt escrow bank payouts.
                  </p>

                  {/* 4 Value Pillars */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">Guaranteed Payouts</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Prompt bank transfer upon customer delivery sign-off.</p>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
                        <Truck className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">100% Logistics Covered</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Doorstep pickup by Furora agents in temperature-controlled cabs.</p>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">Free Medical Checks</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Full veterinary fitness exam & health reports at no cost to you.</p>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                        <Heart className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">Ethical Accreditation</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Verified breeder badge recognizing ethical AWBI standards.</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Swiggy/Zomato style Registration Card with Captcha & Email OTP */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xl shadow-slate-200/50">
                    {!otpSent ? (
                      <>
                        <div className="text-left mb-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-2">
                            Partner Registration
                          </span>
                          <h2 className="text-lg font-black text-slate-900">Register Your Kennel</h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Register with your mobile & email to start your onboarding application.
                          </p>
                        </div>

                        {regError && (
                          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span>{regError}</span>
                          </div>
                        )}

                        <form onSubmit={handleSendOtp} className="space-y-3.5 text-left text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Kennel / Facility Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Royal Paws Kennels"
                                value={regForm.kennelName}
                                onChange={(e) => setRegForm({ ...regForm, kennelName: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs transition"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Proprietor / Contact Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Rajesh Sharma"
                              value={regForm.contactName}
                              onChange={(e) => setRegForm({ ...regForm, contactName: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs transition"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Mobile Number <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="tel"
                                  required
                                  placeholder="9876543210"
                                  value={regForm.phone}
                                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs transition"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                City / State <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Pune, MH"
                                  value={regForm.city}
                                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs transition"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Contact Email Address <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                required
                                placeholder="breeder@royalpaws.com"
                                value={regForm.email}
                                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs transition"
                              />
                            </div>
                          </div>

                          {/* Security Verification Captcha */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Security Captcha <span className="text-rose-500">*</span>
                              </label>
                              <span className="text-[10px] text-slate-400">Case-insensitive</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-2xs">
                                {captchaSvg ? (
                                  <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                                ) : (
                                  <div className="w-[130px] h-[42px] flex items-center justify-center text-[10px] text-slate-400">
                                    Loading...
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={fetchCaptcha}
                                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex-shrink-0"
                                title="Refresh Captcha"
                              >
                                <RotateCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                              </button>
                              <input
                                type="text"
                                required
                                maxLength={5}
                                placeholder="Code"
                                value={captchaInput}
                                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-xs font-mono font-bold tracking-widest uppercase transition"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={regLoading}
                            className="w-full mt-2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20 disabled:opacity-50"
                          >
                            {regLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>Confirm with Email OTP</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPageMode('TRACK');
                                setTrackError('');
                              }}
                              className="text-[11px] text-slate-500 hover:text-amber-600 font-semibold transition"
                            >
                              Already started an application? <span className="underline font-bold text-slate-800">Resume / Track</span>
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      /* OTP Verification Screen */
                      <div className="text-left">
                        <div className="text-left mb-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 inline-block mb-2">
                            Email Verification Required
                          </span>
                          <h2 className="text-lg font-black text-slate-900">Enter Verification Code</h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            We&apos;ve sent a 6-digit verification code to{' '}
                            <strong className="text-slate-800 font-bold">{regForm.email}</strong>.
                          </p>
                        </div>

                        {regError && (
                          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span>{regError}</span>
                          </div>
                        )}

                        {otpSuccessMessage && !regError && (
                          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>{otpSuccessMessage}</span>
                          </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 text-center">
                              Enter 6-Digit OTP Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              required
                              autoFocus
                              placeholder="• • • • • •"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              className="w-full py-3.5 px-4 text-center text-2xl font-mono font-extrabold tracking-[0.45em] rounded-2xl border-2 border-amber-500/40 bg-amber-50/20 text-slate-900 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition shadow-inner"
                            />
                            <p className="text-[10px] text-slate-400 text-center mt-1.5">
                              Check your inbox and spam folder &bull; Valid for 10 minutes
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOtpSent(false);
                                setRegError('');
                                fetchCaptcha();
                              }}
                              className="text-slate-500 hover:text-slate-800 font-semibold transition"
                            >
                              &larr; Change Email
                            </button>

                            {otpResendCountdown > 0 ? (
                              <span className="text-slate-400 font-mono text-[11px]">
                                Resend in 0:{otpResendCountdown < 10 ? '0' : ''}{otpResendCountdown}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={regLoading}
                                className="text-amber-600 hover:text-amber-700 font-bold hover:underline transition"
                              >
                                Resend Code
                              </button>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={otpLoading || otpCode.length !== 6}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20 disabled:opacity-50"
                          >
                            {otpLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>Verify Code & Start Onboarding</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: How It Works in 4 Steps */}
          <section className="py-14 bg-white border-b border-slate-200/80">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                Simple 4-Step Process
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                How Onboarding Works on Furora
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-1">
                Fast, transparent, and completely digital. No physical paperwork required.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10 text-left">
                <div className="bg-[#fafbfc] p-5 rounded-2xl border border-slate-200 relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center mb-3 shadow-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Quick Registration</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Register with your kennel name, mobile number, and email to create your partner account.
                  </p>
                </div>

                <div className="bg-[#fafbfc] p-5 rounded-2xl border border-slate-200 relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center mb-3 shadow-xs">
                    2
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Upload Documents</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Submit your KCI/AWBI registration, government ID, trade license, vet clinic MoU, and bank cheque.
                  </p>
                </div>

                <div className="bg-[#fafbfc] p-5 rounded-2xl border border-slate-200 relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center mb-3 shadow-xs">
                    3
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Admin Verification</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Furora compliance team verifies your credentials within 24 to 48 hours and notifies you.
                  </p>
                </div>

                <div className="bg-[#fafbfc] p-5 rounded-2xl border border-slate-200 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-3 shadow-xs">
                    4
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Start Earning</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Activate your Breeder Dashboard, add available puppies/kittens, and receive guaranteed escrow payouts.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: 5 Documents Required Checklist */}
          <section className="py-14 bg-[#f8fafc] border-b border-slate-200/80">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                  Checklist
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  5 Documents You Will Need
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Keep photos or PDF scans of these documents ready on your device for instant upload.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Kennel Club / AWBI Certificate</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Proof of kennel registration with KCI or Animal Welfare Board of India.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Breeder Government ID Proof</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Aadhaar Card, Passport, or PAN card of the kennel proprietor.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Municipal / AWBI Trade License</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Local municipal corporation or AWBI pet shop / breeding establishment trade license.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Registered Vet Clinic MoU</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Written healthcare tie-up agreement with a registered veterinary practitioner.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3 sm:col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Bank Account Proof / Canceled Cheque</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Canceled cheque or bank passbook copy for direct escrow payout settlements.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Frequently Asked Questions */}
          <section className="py-14 bg-white border-b border-slate-200/80">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                  FAQs
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-2.5 text-left">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl overflow-hidden transition bg-[#fafbfc]"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs font-bold text-slate-900 hover:text-amber-600 transition"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Footer Call to Action */}
          <footer className="py-10 bg-slate-900 text-white text-center">
            <div className="max-w-4xl mx-auto px-4 space-y-4">
              <h3 className="text-xl font-black">Ready to scale your kennel nationwide?</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Join India&apos;s most trusted verified breeder community. Register above to start receiving orders.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition"
                >
                  Register Your Kennel &uarr;
                </button>
              </div>
              <p className="text-[11px] text-slate-500 pt-4 border-t border-slate-800">
                Furora Partner Network &bull; breeder@furora.in &bull; Chennai HQ
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DEDICATED ONBOARDING DETAILS WIZARD                                */}
      {/* (Visible ONLY after the vendor registers with mobile & email)              */}
      {/* ========================================================================= */}
      {pageMode === 'WIZARD' && (
        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Active Vendor Profile Ribbon */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    {registeredVendor?.name || regForm.kennelName || 'Registered Kennel'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    {registeredVendor?.onboardingStatus === 'CHANGES_REQUESTED' ? 'ACTION REQUIRED' : 'ONBOARDING ACTIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>📧 {registeredVendor?.email || regForm.email}</span>
                  <span>📱 {registeredVendor?.phone || regForm.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-semibold self-start sm:self-auto shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Draft Auto-Saved</span>
            </div>
          </div>

          {/* Admin Changes Requested Alert Banner */}
          {registeredVendor?.onboardingStatus === 'CHANGES_REQUESTED' && registeredVendor?.onboardingNotes && (
            <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-300 text-xs text-orange-950 flex items-start gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold text-orange-900">Compliance Verification Feedback from Admin:</strong>
                <p className="text-orange-900/90 whitespace-pre-wrap leading-relaxed">
                  {registeredVendor.onboardingNotes}
                </p>
                <p className="text-[11px] text-orange-800 font-semibold pt-1">
                  Only the flagged documents below have been highlighted in orange. Please replace them and resubmit.
                </p>
              </div>
            </div>
          )}

          {/* Step Progress Indicators */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span className="text-slate-900">Step {wizardStep} of 3</span>
              <span>
                {wizardStep === 1
                  ? 'Legal Accreditation & Documents'
                  : wizardStep === 2
                  ? 'Bank Settlement Details'
                  : wizardStep === 3
                  ? 'Review & Submit'
                  : 'Submitted'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (wizardStep / 3) * 100)}%` }}
              />
            </div>
          </div>

          {wizardError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{wizardError}</span>
            </div>
          )}

          {/* WIZARD STEP 1: Accreditation & 4 Documents */}
          {wizardStep === 1 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="text-left border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Step 1 of 3: Documents
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">Accreditation & Legal Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload clear photos or PDF copies of your kennel certifications. All images are automatically compressed to save space.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kennel Club of India / AWBI Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCI-KEN-2024-8841"
                    value={formData.kennelRegNumber}
                    onChange={(e) => setFormData({ ...formData, kennelRegNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-800 transition"
                  />
                </div>

                <FileUploadField
                  label="1. Kennel Club / AWBI Registration Certificate (PDF/Image URL)"
                  badge="Accreditation Proof"
                  badgeColor="bg-amber-50 text-amber-700 border border-amber-200"
                  description="Registration certificate issued by Kennel Club of India (KCI) or Animal Welfare Board of India."
                  value={formData.kennelRegDoc}
                  folder="kennel-certs"
                  onChange={(url) => setFormData({ ...formData, kennelRegDoc: url })}
                  complianceStatus={getDocCompliance('kennelRegDoc').status}
                  complianceFeedback={getDocCompliance('kennelRegDoc').feedback}
                />

                <FileUploadField
                  label="2. Breeder Govt Identity Proof (Aadhaar / PAN Card)"
                  badge="Proprietor Identity"
                  badgeColor="bg-slate-100 text-slate-700"
                  description="Government photo ID proof of the primary breeder / kennel proprietor."
                  value={formData.govIdDoc}
                  folder="breeder-kyc"
                  onChange={(url) => setFormData({ ...formData, govIdDoc: url })}
                  complianceStatus={getDocCompliance('govIdDoc').status}
                  complianceFeedback={getDocCompliance('govIdDoc').feedback}
                />

                <FileUploadField
                  label="3. Municipal / AWBI Pet Shop Trade License"
                  badge="Business License"
                  badgeColor="bg-slate-100 text-slate-700"
                  description="Current municipal pet shop/breeding establishment operating trade license."
                  value={formData.tradeLicenseDoc}
                  folder="trade-licenses"
                  onChange={(url) => setFormData({ ...formData, tradeLicenseDoc: url })}
                  complianceStatus={getDocCompliance('tradeLicenseDoc').status}
                  complianceFeedback={getDocCompliance('tradeLicenseDoc').feedback}
                />

                <FileUploadField
                  label="4. Registered Vet Clinic Tie-up / Healthcare MoU"
                  badge="Veterinary Clearance"
                  badgeColor="bg-emerald-50 text-emerald-700 border border-emerald-200"
                  description="Certificate or written agreement confirming routine health checkups with a licensed veterinary doctor."
                  value={formData.vetAffiliationDoc}
                  folder="vet-affiliations"
                  onChange={(url) => setFormData({ ...formData, vetAffiliationDoc: url })}
                  complianceStatus={getDocCompliance('vetAffiliationDoc').status}
                  complianceFeedback={getDocCompliance('vetAffiliationDoc').feedback}
                />
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={nextWizardStep}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm"
                >
                  <span>Continue to Bank Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* WIZARD STEP 2: Bank Settlement Details */}
          {wizardStep === 2 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="text-left border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Step 2 of 3: Bank Settlement
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">Payout & Bank Settlement Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide your business or proprietor bank account where order escrow funds will be transferred upon customer delivery.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-800 uppercase transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50200088991122"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-800 transition"
                  />
                </div>

                <FileUploadField
                  label="5. Bank Account Proof / Canceled Cheque"
                  badge="Payout Settlement"
                  badgeColor="bg-sky-50 text-sky-700 border border-sky-200"
                  description="Upload a photo or PDF of a canceled cheque or recent bank passbook page confirming your IFSC and Account Number."
                  value={formData.bankDetailsDoc}
                  folder="bank-proofs"
                  onChange={(url) => setFormData({ ...formData, bankDetailsDoc: url })}
                  complianceStatus={getDocCompliance('bankDetailsDoc').status}
                  complianceFeedback={getDocCompliance('bankDetailsDoc').feedback}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevWizardStep}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Documents</span>
                </button>
                <button
                  type="button"
                  onClick={nextWizardStep}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm"
                >
                  <span>Review & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* WIZARD STEP 3: Review & Ethical Declaration */}
          {wizardStep === 3 && (
            <form onSubmit={handleWizardSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="text-left border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Step 3 of 3: Final Review
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">Review & Submit Application</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your kennel information and accept the ethical breeding declaration to submit your application for Admin approval.
                </p>
              </div>

              {/* Summary Review Cards */}
              <div className="space-y-4 text-left text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Facility & Contact Summary</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Kennel Name:</span>
                      <strong className="text-slate-800">{registeredVendor?.name || regForm.kennelName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Registration Number:</span>
                      <strong className="text-slate-800">{formData.kennelRegNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email Address:</span>
                      <span className="text-slate-800">{registeredVendor?.email || regForm.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mobile:</span>
                      <span className="text-slate-800">{registeredVendor?.phone || regForm.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Uploaded Documents Check</span>
                  </h4>
                  <div className="space-y-1.5 text-[11px] pt-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>1. KCI / AWBI Certificate:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Uploaded to R2
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>2. Breeder Govt ID:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Uploaded to R2
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>3. Municipal / Trade License:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Uploaded to R2
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>4. Vet Clinic MoU:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Uploaded to R2
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>5. Bank Proof (Cheque):</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Uploaded to R2
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ethical Breeding Declaration Checkbox */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.ethicalDeclaration}
                      onChange={(e) => setFormData({ ...formData, ethicalDeclaration: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 mt-0.5"
                    />
                    <div className="text-[11px] text-amber-950 leading-relaxed">
                      <strong className="block text-slate-900 font-bold mb-0.5">Ethical Breeder & AWBI Code Compliance Declaration *</strong>
                      I declare that all submitted details and documents are authentic. Our kennel adheres to the Animal Welfare Board of India (AWBI) ethical breeding codes, ensures 100% deworming and core vaccinations, and agrees to mandatory pre-dispatch veterinary medical clearance for all orders.
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={prevWizardStep}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={wizardSubmitting}
                  className="px-7 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {wizardSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Application for Admin Approval</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* WIZARD STEP 4: Success & Verification Tracking Screen */}
          {wizardStep === 4 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-3">
                  ⏳ UNDER ADMIN REVIEW
                </span>
                <h2 className="text-2xl font-black text-slate-900">Application Submitted Successfully!</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                  Thank you! Your compliance documents and bank details for{' '}
                  <strong className="text-slate-900">{registeredVendor?.name || regForm.kennelName}</strong> have been securely received.
                </p>
              </div>

              {/* Progress Timeline */}
              <div className="bg-[#fafbfc] border border-slate-200 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <strong className="text-slate-900 block">Step 1: Partner Account Registered</strong>
                    <span className="text-[10px] text-slate-500">Email & phone confirmed</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <strong className="text-slate-900 block">Step 2: 5 Compliance Documents Uploaded</strong>
                    <span className="text-[10px] text-slate-500">Stored securely on Cloudflare R2</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] animate-pulse">
                    ⏳
                  </div>
                  <div>
                    <strong className="text-amber-900 block">Step 3: Furora Admin Document Verification</strong>
                    <span className="text-[10px] text-amber-700">In Progress &bull; Estimated review: 24 to 48 hours</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                    <Lock className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-slate-700 block">Step 4: Breeder Dashboard Activation</strong>
                    <span className="text-[10px] text-slate-400">Add live pet inventory & fulfill orders</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setPageMode('LANDING')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
                >
                  Return to Home
                </button>
                <Link
                  href="/login"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
                >
                  Go to Login Portal
                </Link>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TRACK / RESUME APPLICATION SCREEN                                  */}
      {/* ========================================================================= */}
      {pageMode === 'TRACK' && (
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                Application Status
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">Track Your Partner Application</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your registered mobile number or email address to check your verification status or resume editing.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupStatus();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Email Address or Phone
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter email e.g. breeder@royalpaws.com"
                    value={trackEmail}
                    onChange={(e) => setTrackEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-800 transition"
                  />
                </div>
              </div>

              {trackError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {trackError}
                </div>
              )}

              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                {trackingLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {/* Display Application Results */}
            {trackResult && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{trackResult.name}</h3>
                    <p className="text-xs text-slate-500">{trackResult.email} &bull; {trackResult.phone}</p>
                  </div>
                  <div>
                    {trackResult.onboardingStatus === 'APPROVED' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ APPROVED
                      </span>
                    ) : trackResult.onboardingStatus === 'CHANGES_REQUESTED' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-900 border border-orange-300 animate-pulse">
                        ⚠️ ACTION REQUIRED
                      </span>
                    ) : trackResult.onboardingStatus === 'REJECTED' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        DECLINED
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        ⏳ UNDER REVIEW
                      </span>
                    )}
                  </div>
                </div>

                {trackResult.onboardingStatus === 'APPROVED' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    <p className="font-bold">Your kennel is verified and approved!</p>
                    <p className="mt-1">You have full access to add live pets and receive customer assignments.</p>
                    <Link
                      href="/login"
                      className="inline-block mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition"
                    >
                      Login to Breeder Dashboard &rarr;
                    </Link>
                  </div>
                )}

                {trackResult.onboardingStatus === 'CHANGES_REQUESTED' && (
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-300 text-xs text-orange-950 space-y-2">
                    <strong className="font-bold text-orange-900">Admin Document Feedback:</strong>
                    <p className="whitespace-pre-wrap">{trackResult.onboardingNotes}</p>
                    <button
                      onClick={() => {
                        setRegisteredVendor(trackResult);
                        setPageMode('WIZARD');
                        setWizardStep(1);
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                    >
                      <span>Update Flagged Documents Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {trackResult.onboardingStatus === 'DRAFT' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold">Registration in Progress</p>
                    <p className="mt-0.5">Please upload your compliance documents to submit for approval.</p>
                    <button
                      onClick={() => {
                        setRegisteredVendor(trackResult);
                        setPageMode('WIZARD');
                        setWizardStep(1);
                      }}
                      className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                    >
                      <span>Continue Filling Documents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
