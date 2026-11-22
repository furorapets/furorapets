import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured, getPresignedUploadUrl } from '@/lib/r2';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, folder = 'uploads' } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Clean filename and generate unique S3 key
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueKey = `${folder}/${Date.now()}-${sanitizedFileName}`;

    // If Cloudflare R2 is configured, return true presigned S3 upload URL
    if (isR2Configured()) {
      const { uploadUrl, fileUrl, key } = await getPresignedUploadUrl(uniqueKey, fileType, 3600);
      return NextResponse.json({
        success: true,
        data: {
          uploadUrl,
          fileUrl,
          key,
          storageProvider: 'CLOUDFLARE_R2',
        },
      });
    }

    // Fallback in dev/local mode when R2 keys haven't been added yet
    const fallbackUrl = `https://r2-mock.furora.com/${uniqueKey}`;
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: fallbackUrl,
        fileUrl: fallbackUrl,
        key: uniqueKey,
        storageProvider: 'LOCAL_MOCK',
        note: 'Cloudflare R2 keys not set; returning development mock URL.',
      },
    });
  } catch (error: any) {
    console.error('Storage presigned URL error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate storage upload URL' },
      { status: 500 }
    );
  }
}
