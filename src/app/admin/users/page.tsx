'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Truck,
  Store,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  RefreshCw,
  FileText,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Lock,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { useSession } from '@/context/session-context';

function UsersContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { currentUser, switchRole, switchToRoleName } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
  }, [queryParam]);

  // Staff Credential Vault State
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [resetPasswordText, setResetPasswordText] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    assignedHub: 'Delhi NCR Field Hub',
    role: 'SALES',
    phone: '',
    address: '',
    kennelRegNumber: '',
    kennelRegDoc: '',
    govIdDoc: '',
    tradeLicenseDoc: '',
    vetAffiliationDoc: '',
    bankDetailsDoc: '',
    onboardingStatus: 'APPROVED',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Inspect Vendor Documents Modal
  const [viewingVendorDocs, setViewingVendorDocs] = useState<any | null>(null);

  // Deletion Modal
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users?type=staff');
      const data = await res.json();
      if (data.success) {
        // Strictly filter out Customers and Vendors (each has its own dedicated tab)
        setUsers(data.data.filter((u: any) => u.role !== 'CUSTOMER' && u.role !== 'VENDOR'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      setSuccessMessage(`Account created successfully for ${data.data.name} (${data.data.role})`);
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        assignedHub: 'Delhi NCR Field Hub',
        role: 'SALES',
        phone: '',
        address: '',
        kennelRegNumber: '',
        kennelRegDoc: '',
        govIdDoc: '',
        tradeLicenseDoc: '',
        vetAffiliationDoc: '',
        bankDetailsDoc: '',
        onboardingStatus: 'APPROVED',
      });
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = (u: any) => {
    const credText = `🐾 FURORA STAFF CREDENTIALS\nName: ${u.name}\nRole: ${u.role}\nUsername: ${u.username || u.email.split('@')[0]}\nPassword: ${u.tempPassword || 'Furora@2026'}\nLogin URL: http://localhost:3000${u.role === 'SALES' ? '/sales' : '/agent/order'}\nNote: Passwords can only be changed by Admin.`;
    navigator.clipboard.writeText(credText);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenResetPassword = (u: any) => {
    setEditingStaff(u);
    setResetPasswordText(u.tempPassword || `Furora@${Math.floor(1000 + Math.random() * 9000)}`);
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !resetPasswordText.trim()) return;
    setResetSubmitting(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await fetch(`/api/users/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setResetSuccess(`Password for ${editingStaff.name} successfully updated.`);
      setTimeout(() => {
        setEditingStaff(null);
        setResetPasswordText('');
        setResetSuccess('');
        loadUsers();
      }, 1200);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white border border-slate-900">
            <Shield className="w-3 h-3 mr-1 text-white" /> Admin
          </span>
        );
      case 'SALES':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <ShoppingBag className="w-3 h-3 mr-1 text-slate-500" /> Sales Team
          </span>
        );
      case 'DELIVERY_AGENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Truck className="w-3 h-3 mr-1 text-slate-500" /> Delivery Agent
          </span>
        );
      case 'VENDOR':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Store className="w-3 h-3 mr-1 text-slate-500" /> Vendor Kennel
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Customer
          </span>
        );
    }
  };

  // Metrics (Internal Staff Only: Sales, Agents, Admins)
  const metrics = useMemo(() => {
    const total = users.length;
    const sales = users.filter((u) => u.role === 'SALES').length;
    const agents = users.filter((u) => u.role === 'DELIVERY_AGENT').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { total, sales, agents, admins };
  }, [users]);

  // Filtered Users (Strictly internal staff)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'CUSTOMER' || u.role === 'VENDOR') return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchAddress = u.address?.toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchAddress;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

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
          <h2 className="text-base font-extrabold text-slate-900">Admin Only Access</h2>
          <p className="text-xs text-slate-500 mt-1">
            Only Furora Administrators can manage staff credentials and create accounts for Sales Team and Delivery Agents.
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

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Staff & Accounts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
              {filteredUsers.length} Staff Accounts
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage operational credentials for Sales Team, Delivery Agents, and Administrators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Staff Account
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.total}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Team</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.sales}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Agents</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.agents}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        <div className="card-clean p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admins</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics.admins}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Shield className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Staff' },
              { id: 'SALES', label: 'Sales Team' },
              { id: 'DELIVERY_AGENT', label: 'Delivery Agents' },
              { id: 'ADMIN', label: 'Admins' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  roleFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Showing <strong className="text-slate-800">{filteredUsers.length}</strong> accounts
        </div>
      </div>

      {/* Users Table */}
      <div className="card-clean overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Staff Member</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Role</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Username</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[190px]">Password (Admin Vault)</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[190px]">Email & Contact</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Field Hub / City</th>
                <th className="py-3 px-4 whitespace-nowrap text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No accounts match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPasswordRevealed = !!revealedPasswords[u.id];
                  const displayPassword = u.tempPassword || 'Furora@2026';
                  const isCopied = copiedId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors h-[58px]">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase">
                            {u.name?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{u.name}</div>
                            <div className="font-mono text-[10px] text-slate-400 tracking-tight">{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(u.role)}</td>

                      {/* Username */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          @{u.username || u.email.split('@')[0]}
                        </span>
                      </td>

                      {/* Password (Admin Vault) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                          <span className="font-mono text-xs font-semibold text-slate-800 select-all min-w-[70px]">
                            {isPasswordRevealed ? displayPassword : '••••••••'}
                          </span>

                          {/* Reveal/Hide Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({
                                ...prev,
                                [u.id]: !prev[u.id],
                              }))
                            }
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                            title={isPasswordRevealed ? 'Hide Password' : 'Reveal Password'}
                          >
                            {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Copy Credentials Card Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(u)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 transition"
                            title="Copy Staff Login Credentials Card (WhatsApp/Email)"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Reset Password Button (Admin Exclusive) */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(u)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 transition"
                            title="Reset Password (Admin Only)"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Field Hub / Location */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]" title={u.assignedHub || u.address || 'Field Hub'}>
                            {u.assignedHub || u.address || 'Field Hub Assigned'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* If already logged in as this user, show Active badge instead of redundant "Login as" */}
                          {currentUser?.id === u.id ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 select-none">
                              Active Account
                            </span>
                          ) : (
                            <button
                              onClick={() => switchRole(u.id)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                              title={`Switch active persona to ${u.name}`}
                            >
                              Login as
                            </button>
                          )}

                          {/* Delete button (except root admin) */}
                          {u.id !== 'usr_admin' && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                              title="Remove account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Security & Password Guarantee Footer Banner */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Staff passwords are encrypted and can <strong>only be changed by Furora Admins</strong>.</span>
          </div>
          <span className="text-slate-400">Admin Staff Credential Vault Active</span>
        </div>
      </div>

      {/* Create Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`card-clean ${formData.role === 'VENDOR' ? 'max-w-2xl max-h-[90vh]' : 'max-w-lg'} w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 overflow-y-auto`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create Staff / Agent Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate operational credentials for Sales Team, Delivery Agents, or Vendors.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFormError('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* Role Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'SALES',
                      label: 'Sales Team',
                      desc: 'Searches available stock, shows media & provenance, hides vendor cost/medical',
                      icon: ShoppingBag,
                      color: 'border-sky-300 bg-sky-50/50 text-sky-900',
                    },
                    {
                      id: 'DELIVERY_AGENT',
                      label: 'Delivery Agent',
                      desc: 'Pickup physical inspection, medical clearance, handover Proof of Delivery',
                      icon: Truck,
                      color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900',
                    },
                    {
                      id: 'ADMIN',
                      label: 'Administrator',
                      desc: 'Full system master access across all categories, orders, and audits',
                      icon: Shield,
                      color: 'border-slate-300 bg-slate-100 text-slate-900',
                    },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSelected = formData.role === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setFormData({ ...formData, role: r.id })}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? `${r.color} ring-2 ring-slate-900 font-bold shadow-xs`
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-bold text-xs">{r.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal leading-tight">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <Store className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>To onboard a <strong>Breeder / Vendor Kennel</strong> with 5-doc compliance, use the <strong>Vendors Tab</strong>.</span>
                  </div>
                  <Link
                    href="/admin/vendors"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="font-bold text-amber-800 hover:underline flex-shrink-0 ml-2"
                  >
                    Go to Vendors →
                  </Link>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma, Amit Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. priya.sales@furora.com, amit.ops@furora.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Username & Initial Password (Staff Credential Vault) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Username * (Login ID)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. rahul_ops, priya_sales"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Staff Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: `Furora@${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Furora@2026"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-2 text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Passwords are stored securely in the Admin Vault and can only be modified by Admins.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Field Hub / Address */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Station / Field Hub
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Field Hub, Indiranagar Desk"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : formData.role === 'VENDOR' ? 'Verify & Onboard Vendor' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password & Staff Credential Management Modal */}
      {editingStaff && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain modal-backdrop"
          onClick={() => setEditingStaff(null)}
        >
          <div
            className="card-clean max-w-md w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95 my-auto modal-content-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Admin Staff Password Control</h3>
                  <p className="text-[11px] text-slate-400">
                    Reset operational credentials for <strong className="text-slate-800">{editingStaff.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Staff Account:</span>
                  <span className="font-bold text-slate-900">{editingStaff.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Staff Role:</span>
                  <span className="font-semibold text-slate-700">{editingStaff.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Login Username:</span>
                  <span className="font-mono font-bold text-slate-900">@{editingStaff.username || editingStaff.email.split('@')[0]}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    New Staff Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPasswordText(`Furora@${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={resetPasswordText}
                  onChange={(e) => setResetPasswordText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Admin Exclusive Rule:</strong> Staff members cannot change or reset their passwords themselves. Only authorized Furora Admins can set or update credentials.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
                >
                  {resetSubmitting ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-sm w-full p-6 shadow-2xl space-y-4 rounded-3xl">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-extrabold text-slate-900">Remove Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deletingUser.name}</strong> ({deletingUser.role})?
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteSubmitting}
                className="flex-1 px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
              >
                {deleteSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Compliance Documents Inspector Modal */}
      {viewingVendorDocs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-clean max-w-xl w-full p-6 shadow-2xl space-y-4 rounded-3xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {viewingVendorDocs.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Onboarded & Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registration No: <span className="font-mono font-bold text-slate-800">{viewingVendorDocs.kennelRegNumber || 'AWBI-KEN-VERIFIED'}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingVendorDocs(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Security Banner */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">
              <Lock className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span>Visibility Level: <strong className="text-slate-900">ADMIN_ONLY</strong> (Redacted from Sales Reps & Customers)</span>
            </div>

            {/* Document List */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">1. Kennel Registration Certificate</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                      {viewingVendorDocs.kennelRegDoc || 'Verified on file (KCI/AWBI Certificate)'}
                    </p>
                  </div>
                </div>
                {viewingVendorDocs.kennelRegDoc && (
                  <a
                    href={viewingVendorDocs.kennelRegDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">2. Breeder Govt ID Proof (Aadhaar/PAN)</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                      {viewingVendorDocs.govIdDoc || 'Verified on file (Proprietor Identity Proof)'}
                    </p>
                  </div>
                </div>
                {viewingVendorDocs.govIdDoc && (
                  <a
                    href={viewingVendorDocs.govIdDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">3. Municipal / AWBI Breeder Trade License</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                      {viewingVendorDocs.tradeLicenseDoc || 'Verified on file (Commercial Kennel License)'}
                    </p>
                  </div>
                </div>
                {viewingVendorDocs.tradeLicenseDoc && (
                  <a
                    href={viewingVendorDocs.tradeLicenseDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">4. Veterinary Clinic Affiliation & Healthcare MoU</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                      {viewingVendorDocs.vetAffiliationDoc || 'Verified on file (Vet Clinic Tie-up MoU)'}
                    </p>
                  </div>
                </div>
                {viewingVendorDocs.vetAffiliationDoc && (
                  <a
                    href={viewingVendorDocs.vetAffiliationDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">5. Bank Account Proof / Canceled Cheque</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                      {viewingVendorDocs.bankDetailsDoc || 'Verified on file (Payout Settlement Details)'}
                    </p>
                  </div>
                </div>
                {viewingVendorDocs.bankDetailsDoc && (
                  <a
                    href={viewingVendorDocs.bankDetailsDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingVendorDocs(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
