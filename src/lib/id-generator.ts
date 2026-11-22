import prisma from './prisma';

/**
 * Generates an atomic sequential formatted ID using the SequenceCounter table.
 * Formats:
 * - Pet: FUR-PET-000001
 * - Order: FUR-ORD-000001
 * - Certificate: FUR-CERT-000001
 */
export async function generateSequentialId(prefix: 'FUR-PET' | 'FUR-ORD' | 'FUR-CERT'): Promise<string> {
  // Atomic upsert and increment
  const record = await prisma.$transaction(async (tx) => {
    const counter = await tx.sequenceCounter.upsert({
      where: { id: prefix },
      create: { id: prefix, currentValue: 1 },
      update: { currentValue: { increment: 1 } },
    });
    return counter;
  });

  const paddedNumber = String(record.currentValue).padStart(6, '0');
  return `${prefix}-${paddedNumber}`;
}

export async function generatePetId(): Promise<string> {
  return generateSequentialId('FUR-PET');
}

export async function generateOrderId(): Promise<string> {
  return generateSequentialId('FUR-ORD');
}

export async function generateCertificateId(): Promise<string> {
  return generateSequentialId('FUR-CERT');
}
