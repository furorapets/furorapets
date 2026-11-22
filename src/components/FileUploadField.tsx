'use client';

import React, { useState, useRef } from 'react';
import { compressImageClientSide } from '@/lib/client-image-compressor';
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export interface FileUploadFieldProps {
  label: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
  value: string; // The uploaded file URL
  fileName?: string;
  onChange: (url: string, fileName?: string) => void;
  required?: boolean;
  sampleUrl?: string;
  sampleName?: string;
  folder?: string;
  complianceStatus?: 'APPROVED' | 'NEEDS_UPDATE' | 'NONE';
  complianceFeedback?: string;
}

export default function FileUploadField({
  label,
  badge = 'Required',
  badgeColor = 'bg-slate-100 text-slate-700',
  description,
  value,
  fileName,
  onChange,
  required = true,
  sampleUrl = 'https://r2.furora.com/compliance/verified-sample-document.pdf',
  sampleName = 'Sample-Document.pdf',
  folder = 'compliance',
  complianceStatus = 'NONE',
  complianceFeedback,
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(fileName || (value ? value.split('/').pop() || 'Document.pdf' : ''));

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Check size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15MB limit. Please upload a smaller file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // 1. Client-side pre-compression for raster images
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          uploadFile = await compressImageClientSide(file);
        } catch (compErr) {
          console.warn('Client-side compression fallback:', compErr);
        }
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setCurrentFileName(data.fileName);
      onChange(data.url, data.fileName);
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setCurrentFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUseSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(sampleUrl, sampleName);
    setCurrentFileName(sampleName);
  };

  return (
    <div className="space-y-1.5 text-xs select-none">
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          {complianceStatus === 'NEEDS_UPDATE' ? (
            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-orange-100 text-orange-800 border border-orange-300 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-orange-600" /> Action Required: Re-upload
            </span>
          ) : complianceStatus === 'APPROVED' ? (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified by Admin
            </span>
          ) : badge ? (
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${badgeColor}`}>
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      {description && <p className="text-[10px] text-slate-400">{description}</p>}

      {/* Admin Specific Feedback Callout */}
      {complianceStatus === 'NEEDS_UPDATE' && complianceFeedback && (
        <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex items-start gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-[11px] text-orange-900 block">Admin Document Feedback:</span>
            <p className="text-[11px] font-medium text-orange-800 italic mt-0.5">&ldquo;{complianceFeedback}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {/* State 1: Already Uploaded File Card */}
      {value && !isUploading ? (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
            complianceStatus === 'NEEDS_UPDATE'
              ? 'border-orange-300 bg-orange-50/40 ring-1 ring-orange-200'
              : 'border-emerald-200 bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                complianceStatus === 'NEEDS_UPDATE'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {complianceStatus === 'NEEDS_UPDATE' ? (
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <FileCheck className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 truncate">
                {currentFileName || 'Uploaded Document'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {complianceStatus === 'NEEDS_UPDATE' ? (
                  <span className="text-[10px] text-orange-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-600" /> Revision Needed — Click Replace below
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded & Encrypted
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition shadow-2xs"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] transition shadow-2xs flex items-center gap-1"
              title="Replace document with revised file"
            >
              <Upload className="w-3 h-3" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
              title="Remove document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : isUploading ? (
        /* State 2: Uploading Progress */
        <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 text-center space-y-2">
          <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-[11px] font-semibold text-slate-700">Uploading and securing document...</p>
        </div>
      ) : (
        /* State 3: Upload Dropzone */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition text-center space-y-1.5 ${
            isDragging
              ? 'border-slate-900 bg-slate-100/80 scale-[1.01]'
              : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto shadow-2xs">
            <Upload className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-xs">Click to browse file</span>{' '}
            <span className="text-slate-500 font-normal text-xs">or drag and drop</span>
          </div>
          <p className="text-[10px] text-slate-400">PDF, JPG, PNG or WEBP (Max 15MB)</p>

          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={handleUseSample}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 hover:underline px-2 py-0.5 rounded transition"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              <span>Click here to use sample PDF</span>
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
