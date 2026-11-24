import prisma from './prisma';
import QRCode from 'qrcode';
import { generateCertificateId } from './id-generator';
import { logAudit } from './audit';
import { calculateAge } from './age-calculator';
import { resolveBaseUrl } from './pet-qr';

export async function generatePetCertificate(orderIdOrDbId: string, baseUrl?: string) {
  const rootUrl = resolveBaseUrl(baseUrl);
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderIdOrDbId }, { orderId: orderIdOrDbId }] },
    include: {
      pet: { include: { breed: true, category: true } },
      certificate: true,
      medicalRecords: true,
    },
  });

  if (!order) throw new Error('Order not found');
  if (!order.petId || !order.pet) throw new Error('Order has no linked pet');

  const eligibleStatuses = ['READY_FOR_DELIVERY', 'DELIVERY_COMPLETED', 'MEDICAL_APPROVED'];
  if (!eligibleStatuses.includes(order.status)) {
    throw new Error(
      `Cannot issue certificate for order in status '${order.status}'. Pet must have passed medical examination.`
    );
  }

  // If already generated, return existing
  if (order.certificate) {
    return order.certificate;
  }

  const certificateId = await generateCertificateId();
  const verificationUrl = `${rootUrl}/records/${order.orderId}`;

  // Generate QR Code data URL
  const qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
    width: 250,
    margin: 2,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
  });

  const furoraDetails = {
    issuer: 'Furora Pet Health & Provenance Authority',
    verificationStandard: 'ISO-FUR-9001-Clearance',
    breed: order.pet.breed.name,
    category: order.pet.category.name,
    dob: order.pet.dob,
    ageAtIssuance: calculateAge(order.pet.dob).formatted,
    issuedTo: order.customerName,
  };

  const certificate = await prisma.certificate.create({
    data: {
      petId: order.petId,
      orderId: order.id,
      certificateId,
      furoraDetails: JSON.stringify(furoraDetails),
      qrCodeUrl,
      verificationUrl,
    },
  });

  await logAudit({
    orderId: order.id,
    userId: null,
    action: 'CERTIFICATE_GENERATED',
    fromState: null,
    toState: certificateId,
    metadata: {
      certificateId,
      orderId: order.orderId,
      petId: order.pet.petId,
    },
  });

  return certificate;
}
