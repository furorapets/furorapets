'use client';

import React, { useState, useRef } from 'react';
import { compressImageClientSide } from '@/lib/client-image-compressor';
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  ExternalLink,
  Star,
  Sparkles,
  Film,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export interface PetMediaUploadProps {
  photos: string[] | string;
  videos?: string[] | string;
  onPhotosChange: (photos: string[]) => void;
  onVideosChange?: (videos: string[]) => void;
  folder?: string;
  disabled?: boolean;
}

export default function PetMediaUpload({
  photos,
  videos = [],
  onPhotosChange,
  onVideosChange,
  folder = 'pets',
  disabled = false,
}: PetMediaUploadProps) {
  // Normalize photos to string[]
  const photoList: string[] = Array.isArray(photos)
    ? photos
    : typeof photos === 'string' && photos.trim()
    ? photos.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Normalize videos to string[]
  const videoList: string[] = Array.isArray(videos)
    ? videos
    : typeof videos === 'string' && videos.trim()
    ? videos.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Photo Upload (Batch of files)
  const handlePhotoFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0 || disabled) return;

    setErrorMsg('');
    setIsUploadingPhoto(true);
    const newUploadedUrls: string[] = [];

    const files = Array.from(fileList);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressText(`Compressing & uploading ${i + 1} of ${files.length}...`);

      try {
        // 1. Client-side pre-compression
        let uploadFile = file;
        if (file.type.startsWith('image/')) {
          try {
            uploadFile = await compressImageClientSide(file, 1600, 1600, 0.82);
          } catch (compErr) {
            console.warn('Client-side compression fallback:', compErr);
          }
        }

        // 2. Upload to Cloudflare R2 via /api/upload
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('folder', folder);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        newUploadedUrls.push(data.url);
      } catch (err: any) {
        console.error('Upload error:', err);
        setErrorMsg(err.message || `Failed to upload ${file.name}`);
      }
    }

    if (newUploadedUrls.length > 0) {
      onPhotosChange([...photoList, ...newUploadedUrls]);
    }

    setIsUploadingPhoto(false);
    setUploadProgressText('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Handle Video Upload (MP4 / WebM / MOV up to 100MB)
  const handleVideoFile = async (file: File) => {
    if (!file || disabled) return;
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('Video file exceeds 100MB limit. Please upload a smaller video clip or paste a video link.');
      return;
    }

    setErrorMsg('');
    setIsUploadingVideo(true);
    setUploadProgressText(`Uploading video "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `${folder}/videos`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload video');
      }

      if (onVideosChange) {
        onVideosChange([...videoList, data.url]);
      }
    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg(err.message || 'Failed to upload video');
    } finally {
      setIsUploadingVideo(false);
      setUploadProgressText('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const updated = photoList.filter((_, idx) => idx !== indexToRemove);
    onPhotosChange(updated);
  };

  const setCoverPhoto = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const target = photoList[indexToCover];
    const rest = photoList.filter((_, idx) => idx !== indexToCover);
    onPhotosChange([target, ...rest]);
  };

  const removeVideo = (indexToRemove: number) => {
    if (!onVideosChange) return;
    const updated = videoList.filter((_, idx) => idx !== indexToRemove);
    onVideosChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* PHOTOS SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-700" />
            <span>Pet Photos</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              High Resolution (Direct R2 Upload)
            </span>
          </label>
        </div>

        {/* Multi-Photo Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingPhoto(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingPhoto(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingPhoto(false);
            if (e.dataTransfer.files) {
              handlePhotoFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => photoInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDraggingPhoto
              ? 'border-slate-900 bg-slate-50 scale-[1.01]'
              : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
            onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)}
            className="hidden"
            disabled={disabled || isUploadingPhoto}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-700 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Click to upload or drag & drop pet photos
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PNG, JPG, HEIC, WebP • High-resolution images up to 10MB each
              </p>
            </div>
          </div>
        </div>

        {/* Upload Status / Errors */}
        {isUploadingPhoto && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-800">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0"></div>
            <span className="font-semibold">{uploadProgressText || 'Uploading image...'}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Photo Gallery Grid */}
        {photoList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
            {photoList.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs aspect-square"
              >
                {/* Image */}
                <img
                  src={url}
                  alt={`Pet photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Cover Badge */}
                {idx === 0 ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" /> Primary Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverPhoto(idx);
                    }}
                    title="Set as cover photo"
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition shadow-xs flex items-center gap-1"
                  >
                    <Star className="w-2.5 h-2.5" /> Set Cover
                  </button>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(idx);
                  }}
                  title="Remove photo"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Bottom Bar: Verified indicator & Full Preview */}
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-[10px] text-white">
                  <span className="font-mono text-[9px] truncate max-w-[100px] opacity-80">
                    Verified Media
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-white/20 hover:bg-white/40 transition"
                    title="View full image"
                  >
                    <ExternalLink className="w-3 h-3 text-white" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIDEOS SECTION */}
      {onVideosChange && (
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-slate-700" />
              <span>Pet Videos (Direct R2 Upload)</span>
            </label>
          </div>

          {/* Upload Video Button */}
          <div className="flex items-center gap-3">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => e.target.files && handleVideoFile(e.target.files[0])}
              className="hidden"
              disabled={disabled || isUploadingVideo}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={disabled || isUploadingVideo}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-slate-700" />
              <span>Upload Video (MP4 / WebM up to 100MB)</span>
            </button>
          </div>

          {isUploadingVideo && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-800">
              <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0"></div>
              <span className="font-semibold">{uploadProgressText}</span>
            </div>
          )}

          {/* Video List */}
          {videoList.length > 0 && (
            <div className="space-y-2 pt-1">
              {videoList.map((vUrl, idx) => (
                <div
                  key={`${vUrl}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Film className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{vUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={vUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Preview
                    </a>
                    <button
                      type="button"
                      onClick={() => removeVideo(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
