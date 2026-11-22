import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import { isOptimizableImage, optimizeImage } from '@/lib/image-optimizer';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'compliance';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    let buffer: any = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type || 'application/octet-stream';
    let originalName = file.name;
    const originalSize = buffer.length;
    let savingsPercent = 0;
    let isOptimized = false;

    // 1. Super-compress and optimize raster images using Sharp
    if (isOptimizableImage(mimeType, originalName)) {
      try {
        const optimizationResult = await optimizeImage(buffer, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 80,
          effort: 6,
        });

        if (optimizationResult.isOptimized) {
          buffer = optimizationResult.buffer;
          mimeType = optimizationResult.contentType; // 'image/webp'
          savingsPercent = optimizationResult.savingsPercent;
          isOptimized = true;

          // Replace extension with .webp
          const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
          originalName = `${baseName}.webp`;

          console.log(
            `[Image Optimizer] Compressed ${file.name}: ${(originalSize / 1024).toFixed(1)} KB -> ${(
              buffer.length / 1024
            ).toFixed(1)} KB (${savingsPercent}% saved)`
          );
        }
      } catch (optErr: any) {
        console.warn('[Image Optimizer] Compression skipped due to error:', optErr.message);
      }
    }

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueKey = `${folder}/${Date.now()}-${sanitizedName}`;

    // 2. Stream to Cloudflare R2 Cloud Storage
    if (isR2Configured()) {
      try {
        const { fileUrl } = await uploadToR2(uniqueKey, buffer, mimeType, {
          'original-filename': encodeURIComponent(file.name),
          'optimized': String(isOptimized),
          'savings-percent': `${savingsPercent}%`,
        });

        return NextResponse.json({
          success: true,
          url: fileUrl,
          fileName: originalName,
          fileSize: buffer.length,
          originalSize,
          savingsPercent,
          isOptimized,
          mimeType,
          storage: 'CLOUDFLARE_R2',
        });
      } catch (r2Err: any) {
        console.warn('R2 upload failed, falling back to local disk:', r2Err);
      }
    }

    // 3. Local Disk Fallback in dev
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFileName = `${Date.now()}-${sanitizedName}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    await fs.promises.writeFile(localFilePath, buffer);

    const localUrl = `/uploads/${localFileName}`;

    return NextResponse.json({
      success: true,
      url: localUrl,
      fileName: originalName,
      fileSize: buffer.length,
      originalSize,
      savingsPercent,
      isOptimized,
      mimeType,
      storage: 'LOCAL_DISK',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
