export type Role = 'ADMIN' | 'SALES' | 'VENDOR' | 'DELIVERY_AGENT' | 'CUSTOMER';

export type InventoryOwner = 'FURORA' | 'VENDOR';

export type PetStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ASSIGNED_TO_ORDER'
  | 'PICKUP_PENDING'
  | 'IN_TRANSIT'
  | 'MEDICAL_PENDING'
  | 'MEDICAL_APPROVED'
  | 'MEDICAL_FAILED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'UNAVAILABLE';

export type OrderStatus =
  | 'ORDER_RECEIVED'
  | 'VENDOR_ASSIGNED'
  | 'VENDOR_ACCEPTED'
  | 'VENDOR_REJECTED'
  | 'PET_ASSIGNED'
  | 'AGENT_ASSIGNED'
  | 'PICKUP_ASSIGNED'
  | 'PICKUP_INSPECTION'
  | 'INSPECTION_FAILED'
  | 'PICKUP_ACCEPTED'
  | 'MEDICAL_CHECK'
  | 'MEDICAL_APPROVED'
  | 'MEDICAL_FAILED'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERY_COMPLETED'
  | 'CANCELLED_REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type DocumentVisibility =
  | 'ADMIN_ONLY'
  | 'INTERNAL_FURORA'
  | 'VENDOR_VISIBLE'
  | 'CUSTOMER_VISIBLE'
  | 'DELIVERY_AGENT_VISIBLE';

export type DocumentType =
  | 'MEDICAL_REPORT'
  | 'TEST_REPORT'
  | 'VACCINATION_INFO'
  | 'CERTIFICATE'
  | 'INSPECTION_EVIDENCE'
  | 'DELIVERY_REPORT'
  | 'KCI_DOCUMENT'
  | 'PARENT_DOCUMENT'
  | 'OTHER';

export type VendorPayoutStatus =
  | 'UNASSIGNED'
  | 'PENDING_PICKUP'
  | 'ELIGIBLE_FOR_PAYOUT'
  | 'SETTLED'
  | 'REFUNDED';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  address?: string | null;
  assignedHub?: string | null;
  onboardingStatus?: string | null;
  onboardingNotes?: string | null;
  kennelRegNumber?: string | null;
  assignedCategories?: string | null;
}
