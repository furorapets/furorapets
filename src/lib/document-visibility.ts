import { Role, DocumentVisibility, SessionUser } from '@/types';

export interface DocumentRecord {
  id: string;
  visibility: string; // DocumentVisibility
  uploadedById: string;
  petId?: string | null;
  orderId?: string | null;
  vendorId?: string | null;
  customerId?: string | null;
  agentId?: string | null;
}

/**
 * Central Document Visibility Authorization Engine (PRD §4.5 & §5 Module J)
 * Every document fetch passes through this central check regardless of caller role.
 */
export function canAccessDocument(
  user: SessionUser,
  doc: DocumentRecord,
  context?: {
    orderVendorId?: string | null;
    orderCustomerId?: string | null;
    orderAgentId?: string | null;
    petVendorId?: string | null;
  }
): boolean {
  // 1. Admin has total access across all visibility levels (PRD §3)
  if (user.role === 'ADMIN') {
    return true;
  }

  const visibility = doc.visibility as DocumentVisibility;

  // 2. ADMIN_ONLY documents can strictly only be seen by Admins
  if (visibility === 'ADMIN_ONLY') {
    return false;
  }

  // 3. INTERNAL_FURORA documents are restricted to Admin
  if (visibility === 'INTERNAL_FURORA') {
    return false;
  }

  // 4. Sales Team: PRD §3 explicitly states Sales cannot see private vendor documents or medical records
  if (user.role === 'SALES') {
    // Sales can only view public customer-facing pet media
    return visibility === 'CUSTOMER_VISIBLE' && doc.visibility !== 'ADMIN_ONLY';
  }

  // 5. Vendor Scoping:
  if (user.role === 'VENDOR') {
    // Vendor can only see documents relating to their own facility/orders
    const isVendorOwner =
      doc.uploadedById === user.id ||
      context?.orderVendorId === user.id ||
      context?.petVendorId === user.id;

    if (!isVendorOwner) {
      return false;
    }

    // Vendor can see VENDOR_VISIBLE and CUSTOMER_VISIBLE
    return visibility === 'VENDOR_VISIBLE' || visibility === 'CUSTOMER_VISIBLE';
  }

  // 6. Delivery/Ops Agent Scoping:
  if (user.role === 'DELIVERY_AGENT') {
    // Agent can only see documents for their single assigned order
    const isAssignedAgent = context?.orderAgentId === user.id;
    if (!isAssignedAgent && doc.uploadedById !== user.id) {
      return false;
    }

    return (
      visibility === 'DELIVERY_AGENT_VISIBLE' ||
      visibility === 'CUSTOMER_VISIBLE' ||
      doc.uploadedById === user.id
    );
  }

  // 7. Customer Scoping:
  if (user.role === 'CUSTOMER') {
    const isOrderOwner = context?.orderCustomerId === user.id;
    if (!isOrderOwner) {
      return false;
    }

    // Customer can strictly ONLY see CUSTOMER_VISIBLE documents
    return visibility === 'CUSTOMER_VISIBLE';
  }

  return false;
}
