'use client';

import React, { useState, useRef } from 'react';
import { compressImageClientSide } from '@/lib/client-image-compressor';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface LineageProvenanceUploadProps {
  fatherName: string;
  fatherPhoto: string;
  fatherDocs: string[] | string;
  motherName: string;
  motherPhoto: string;
  motherDocs: string[] | string;
  onChange: (data: {
    fatherName?: string;
    fatherPhoto?: string;
    fatherDocs?: string[];
    motherName?: string;
    motherPhoto?: string;
    motherDocs?: string[];
  }) => void;
  disabled?: boolean;
}

export default function LineageProvenanceUpload({
  fatherName,
  fatherPhoto,
  fatherDocs,
  motherName,
  motherPhoto,
  motherDocs,
  onChange,
  disabled = false,
}: LineageProvenanceUploadProps) {
  // Normalize docs
  const fatherDocList: string[] = Array.isArray(fatherDocs)
    ? fatherDocs
    : typeof fatherDocs === 'string' && fatherDocs.trim()
    ? fatherDocs.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const motherDocList: string[] = Array.isArray(motherDocs)
    ? motherDocs
    : typeof motherDocs === 'string' && motherDocs.trim()
    ? motherDocs.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const [uploadingFatherPhoto, setUploadingFatherPhoto] = useState(false);
  const [uploadingFatherDoc, setUploadingFatherDoc] = useState(false);
  const [uploadingMotherPhoto, setUploadingMotherPhoto] = useState(false);
  const [uploadingMotherDoc, setUploadingMotherDoc] = useState(false);
  const [showFatherDocSection, setShowFatherDocSection] = useState(fatherDocList.length > 0);
  const [showMotherDocSection, setShowMotherDocSection] = useState(motherDocList.length > 0);

  const fatherPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const fatherDocInputRef = useRef<HTMLInputElement | null>(null);
  const motherPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const motherDocInputRef = useRef<HTMLInputElement | null>(null);

  // Upload single photo helper
  const uploadSinglePhoto = async (
    file: File,
    folder: string,
    setLoading: (b: boolean) => void,
    onSuccess: (url: string) => void
  ) => {
    if (!file || disabled) return;
    setLoading(true);

    try {
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          uploadFile = await compressImageClientSide(file, 1600, 1600, 0.82);
        } catch (e) {
          console.warn('Client compression fallback:', e);
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
        throw new Error(data.error || 'Failed to upload photo');
      }

      onSuccess(data.url);
    } catch (err: any) {
      alert(err.message || 'Error uploading photo');
    } finally {
      setLoading(false);
    }
  };

  // Upload single document helper
  const uploadDocument = async (
    file: File,
    folder: string,
    setLoading: (b: boolean) => void,
    onSuccess: (url: string) => void
  ) => {
    if (!file || disabled) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document');
      }

      onSuccess(data.url);
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ================= SIRE (FATHER) ================= */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Sire (Father)</span>
              <span className="text-[10px] font-semibold text-slate-500">Paternal Pedigree</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-150">
              Male
            </span>
          </div>

          {/* Father Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Father Name / Registered Kennel Title
            </label>
            <input
              type="text"
              placeholder="e.g. Champion Bruno of Silverline"
              value={fatherName}
              onChange={(e) => onChange({ fatherName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Father Photo Upload */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Father Photo
            </label>
            <input
              ref={fatherPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files &&
                uploadSinglePhoto(
                  e.target.files[0],
                  'pets/lineage',
                  setUploadingFatherPhoto,
                  (url) => onChange({ fatherPhoto: url })
                )
              }
              className="hidden"
            />

            {fatherPhoto ? (
              <div className="relative rounded-xl border border-slate-200 bg-white p-2 flex items-center gap-3">
                <img
                  src={fatherPhoto}
                  alt="Father"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 block truncate">
                    Sire Photo Uploaded
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Photo
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={fatherPhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    title="View Photo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onChange({ fatherPhoto: '' })}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fatherPhotoInputRef.current?.click()}
                disabled={uploadingFatherPhoto || disabled}
                className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-3 bg-white text-center transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploadingFatherPhoto ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
                    <span className="text-xs font-semibold text-slate-700">Compressing & uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Upload Father Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Father Documents (Optional Pedigree / KCI) */}
          <div>
            {!showFatherDocSection && fatherDocList.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowFatherDocSection(true)}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition pt-1"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                <span>+ Attach Father Pedigree / KCI Certificate (Optional)</span>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <span>Father Pedigree Docs / KCI</span>
                    <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fatherDocInputRef.current?.click()}
                      disabled={uploadingFatherDoc || disabled}
                      className="text-[10px] font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> + Upload
                    </button>
                    {fatherDocList.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowFatherDocSection(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                        title="Hide section"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fatherDocInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) =>
                    e.target.files &&
                    uploadDocument(
                      e.target.files[0],
                      'pets/lineage/docs',
                      setUploadingFatherDoc,
                      (url) => onChange({ fatherDocs: [...fatherDocList, url] })
                    )
                  }
                  className="hidden"
                />

                {uploadingFatherDoc && (
                  <div className="p-2 rounded-lg bg-blue-50 text-[11px] text-blue-700 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    <span>Uploading document...</span>
                  </div>
                )}

                {fatherDocList.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {fatherDocList.map((docUrl, idx) => (
                      <div
                        key={`${docUrl}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-mono text-[10px] truncate max-w-[170px]">
                            {docUrl.split('/').pop() || 'PedigreeDoc.pdf'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-500 hover:text-slate-800"
                            title="View"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              onChange({ fatherDocs: fatherDocList.filter((_, i) => i !== idx) })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Optional: Upload certified pedigree if available.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= DAM (MOTHER) ================= */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Dam (Mother)</span>
              <span className="text-[10px] font-semibold text-slate-500">Maternal Pedigree</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-150">
              Female
            </span>
          </div>

          {/* Mother Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Mother Name / Registered Kennel Title
            </label>
            <input
              type="text"
              placeholder="e.g. Queen Daisy of Blue Ridge"
              value={motherName}
              onChange={(e) => onChange({ motherName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Mother Photo Upload */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Mother Photo
            </label>
            <input
              ref={motherPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files &&
                uploadSinglePhoto(
                  e.target.files[0],
                  'pets/lineage',
                  setUploadingMotherPhoto,
                  (url) => onChange({ motherPhoto: url })
                )
              }
              className="hidden"
            />

            {motherPhoto ? (
              <div className="relative rounded-xl border border-slate-200 bg-white p-2 flex items-center gap-3">
                <img
                  src={motherPhoto}
                  alt="Mother"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 block truncate">
                    Dam Photo Uploaded
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Photo
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={motherPhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    title="View Photo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onChange({ motherPhoto: '' })}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => motherPhotoInputRef.current?.click()}
                disabled={uploadingMotherPhoto || disabled}
                className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-3 bg-white text-center transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploadingMotherPhoto ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
                    <span className="text-xs font-semibold text-slate-700">Compressing & uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Upload Mother Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mother Documents (Optional Pedigree / KCI) */}
          <div>
            {!showMotherDocSection && motherDocList.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowMotherDocSection(true)}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition pt-1"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                <span>+ Attach Mother Pedigree / KCI Certificate (Optional)</span>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <span>Mother Pedigree Docs / KCI</span>
                    <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => motherDocInputRef.current?.click()}
                      disabled={uploadingMotherDoc || disabled}
                      className="text-[10px] font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> + Upload
                    </button>
                    {motherDocList.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowMotherDocSection(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                        title="Hide section"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={motherDocInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) =>
                    e.target.files &&
                    uploadDocument(
                      e.target.files[0],
                      'pets/lineage/docs',
                      setUploadingMotherDoc,
                      (url) => onChange({ motherDocs: [...motherDocList, url] })
                    )
                  }
                  className="hidden"
                />

                {uploadingMotherDoc && (
                  <div className="p-2 rounded-lg bg-blue-50 text-[11px] text-blue-700 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    <span>Uploading document...</span>
                  </div>
                )}

                {motherDocList.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {motherDocList.map((docUrl, idx) => (
                      <div
                        key={`${docUrl}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-mono text-[10px] truncate max-w-[170px]">
                            {docUrl.split('/').pop() || 'PedigreeDoc.pdf'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-500 hover:text-slate-800"
                            title="View"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              onChange({ motherDocs: motherDocList.filter((_, i) => i !== idx) })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Optional: Upload certified pedigree if available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
