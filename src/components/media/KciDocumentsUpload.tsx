'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface KciDocumentsUploadProps {
  documents: string[] | string;
  onChange: (docs: string[]) => void;
  disabled?: boolean;
  title?: string;
  label?: string;
}

export default function KciDocumentsUpload({
  documents,
  onChange,
  disabled = false,
  title,
  label,
}: KciDocumentsUploadProps) {
  const docList: string[] = Array.isArray(documents)
    ? documents
    : typeof documents === 'string' && documents.trim()
    ? documents.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayTitle = title || label || 'KCI Registration Certificates & Pedigree Export';
  const uploadLabel = label || title || 'KCI Certificate';

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    setIsUploading(true);

    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'pets/kci');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          newUrls.push(data.url);
        } else {
          alert(data.error || 'Failed to upload document');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading document');
      }
    }

    if (newUrls.length > 0) {
      onChange([...docList, ...newUrls]);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = (indexToRemove: number) => {
    onChange(docList.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>{displayTitle}</span>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="text-[10px] font-bold text-slate-900 hover:underline flex items-center gap-1"
        >
          <Upload className="w-3 h-3" /> + Upload {uploadLabel}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {isUploading && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          <span>Uploading {uploadLabel}...</span>
        </div>
      )}

      {docList.length > 0 ? (
        <div className="space-y-1.5">
          {docList.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-mono text-[11px] text-slate-800 truncate">
                  {url.split('/').pop() || `${uploadLabel}.pdf`}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150">
                  Verified Document
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center gap-1 transition"
                  title="View Certificate"
                >
                  <ExternalLink className="w-3 h-3" /> View
                </a>
                <button
                  type="button"
                  onClick={() => removeDoc(idx)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-4 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl bg-slate-50/50 hover:bg-slate-50 text-center cursor-pointer transition"
        >
          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-700">
            Upload official {displayTitle} (PDF / Image)
          </p>
          <p className="text-[10px] text-slate-400">Stored safely on encrypted cloud storage</p>
        </div>
      )}
    </div>
  );
}
