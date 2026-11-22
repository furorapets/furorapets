import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'furorapetsbucket';
  const publicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '').replace(/\/$/, '');
  return { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain };
}

export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

/**
 * Creates and returns the S3Client configured for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY.'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Returns the public CDN / direct URL for an object stored in R2.
 */
export function getR2PublicUrl(key: string): string {
  const { accountId, bucketName, publicDomain } = getR2Config();
  if (publicDomain) {
    return `${publicDomain}/${key}`;
  }
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
}

/**
 * Generates a pre-signed URL for direct browser/mobile upload to Cloudflare R2.
 * Bypasses serverless payload limit so high-res pet photos and PDFs upload instantly.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const { bucketName } = getR2Config();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const fileUrl = getR2PublicUrl(key);

  return { uploadUrl, fileUrl, key };
}

/**
 * Directly uploads a buffer or stream from server-side to Cloudflare R2.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  metadata?: Record<string, string>
): Promise<{ fileUrl: string; key: string }> {
  const { bucketName } = getR2Config();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await client.send(command);
  const fileUrl = getR2PublicUrl(key);

  return { fileUrl, key };
}

/**
 * Deletes a file from Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!isR2Configured()) return false;
  try {
    const { bucketName } = getR2Config();
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error('Failed to delete file from R2:', error);
    return false;
  }
}
