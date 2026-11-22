# Furora — Pet Inventory, Order & Delivery System
## Product Requirements Document (PRD)

**Version:** 1.0
**Purpose:** This PRD converts the plain-text spec into a build-ready document, broken into independently shippable modules so the system can be built and verified one piece at a time. It is meant to be handed to an AI coding assistant (or a dev team) module by module.

---

## 1. Overview

Furora is a platform for managing pet inventory (owned by Furora or by vendors), customer orders, pickup and medical inspection workflows, and final delivery — with strict role-based access and backend-enforced document visibility.

**Core principle:** the system must stay simple and clean. No feature should be added that isn't explicitly required below.

---

## 2. Goals

- Track every pet with a unique, permanent Pet ID and full lifecycle status.
- Track every order with a unique Order ID, permanently linked to one pet.
- Enforce role-based access **on the backend**, not just hidden in the UI.
- Enforce document visibility levels **on the backend**.
- Support the full workflow: order → vendor assignment → pickup → inspection → medical → delivery → certificate.
- Handle failure branches (inspection failed, medical failed) without breaking data integrity.

---

## 3. User Roles & Permissions Matrix

| Role | Can See | Cannot See |
|---|---|---|
| **Admin** | Everything — categories, breeds, vendors, pets, all inventory, all orders, customers, agents, medical records, documents, certificates, QR codes, all statuses | — |
| **Sales Team** | Available inventory: pet photo/video, parent photos/videos, breed, DOB, age | Private vendor documents, medical records |
| **Vendor** | Own pets, own inventory, assigned orders, own uploaded documents, order status, medical approved/failed *status only* | Other vendors, Furora internal records, other customers, actual medical documents |
| **Delivery/Ops Agent** | Only the **one** order currently assigned: Order ID, Pet ID, vendor details, pickup instructions, inspection page, medical workflow, delivery workflow | Any other order, pet, vendor, or customer — cannot browse the database |
| **Customer** | Own order and pet record; only documents tagged `Customer Visible` | Everything else |

**Rule:** every API endpoint must independently re-check role + ownership server-side. UI hiding is not access control.

---

## 4. Data Model (Entities)

### 4.1 Category
- `id`, `name` (Dogs, Cats, Fish, Birds, Small Animals, Reptiles), `active`

### 4.2 Breed
- `id`, `category_id`, `name`, `active` (admin-managed, not hardcoded)

### 4.3 Pet
- `pet_id` (unique, format `FUR-PET-000123`)
- `category_id`, `breed_id`
- `dob`, `age` (auto-calculated daily from DOB), `sex`, `colour`, `other_details`
- `photos[]`, `videos[]`
- `father` { name, photo, video, documents }
- `mother` { name, photo, video, documents }
- `kci_registered` (boolean) + `kci_documents[]`
- `inventory_owner` (`Furora` | `Vendor`), `vendor_id` (nullable)
- `status`: `available`, `reserved`, `assigned_to_order`, `pickup_pending`, `in_transit`, `medical_pending`, `medical_approved`, `medical_failed`, `delivered`, `returned`, `unavailable`
- `created_by` (vendor or admin), timestamps

### 4.4 Order
- `order_id` (unique, format `FUR-ORD-001025`)
- `customer_id`, `customer_info` (name, contact, delivery address)
- `category_id`, `breed_id`, `product_or_package`
- `payment_status`
- `pet_id` (set once, permanent link — see §6.2)
- `vendor_id` (nullable until assigned)
- `agent_id` (nullable until pickup assigned)
- `status` (see §7 Status Flow)
- timestamps for every status transition (audit trail)

### 4.5 Document
- `id`, `pet_id` / `order_id` reference
- `type` (medical report, test report, vaccination info, certificate, inspection evidence, delivery report, etc.)
- `visibility`: `Admin Only`, `Internal Furora`, `Vendor Visible`, `Customer Visible`, `Delivery Agent Visible`
- `file_url`, `uploaded_by`, `uploaded_at`

### 4.6 Inspection Record
- `order_id`, `pet_id`, `agent_id`, `photos[]`, `video`, `notes`, `physical_condition`, `result` (Accept/Fail), `timestamp`

### 4.7 Medical Record
- `order_id`, `pet_id`, `documents[]` (each with visibility tag), `result` (Approved/Failed), `reason` (if failed), `timestamp`

### 4.8 Delivery Record
- `order_id`, `pet_id`, `agent_id`, `photo`, `video`, `photo_with_customer` (optional)
- `customer_id_captured`, `signed_delivery_report`, `customer_acknowledgement`
- `date_time`, `status` → `DELIVERY COMPLETED`

### 4.9 Certificate
- `pet_id`, `order_id`, `furora_details`, `qr_code` → links to customer's secure record page

---

## 5. Functional Modules

### Module A — Category & Breed Management
- Admin CRUD for categories (fixed 6 top-level types) and breeds under each.
- Breeds: create, edit, activate/deactivate. Only active breeds sellable.

### Module B — Pet Profile & ID
- Auto-generate `FUR-PET-######` on creation (vendor or admin).
- Full profile form: category, breed, DOB, sex, colour, details, photos, videos.
- Age auto-calculated from DOB, refreshed daily (scheduled job).
- Parent info (father/mother): name, photo, video, documents.
- KCI checkbox → conditional document upload.

### Module C — Inventory Management
- Dual ownership model: Furora vs Vendor.
- Status state-machine (11 statuses, see §4.3) — transitions must be validated, not free-text.
- Admin can move a pet between Furora and Vendor inventory (with audit log).

### Module D — Sales Team View
- Read-only filtered view: available pets, photos/videos, parent media, breed, DOB, age.
- Hard block on private vendor documents and medical records at API level.

### Module E — Customer Ordering
- Public website flow: browse → select product/package → checkout.
- Auto-generate `FUR-ORD-######`.
- Capture customer info, payment status, delivery address.
- Initial status: `ORDER RECEIVED`.

### Module F — Order-to-Pet Linking
- Order links to exactly one Pet ID.
- Link is permanent once set — enforce at DB constraint level, not just app logic.
- Reassignment only allowed through the defined Medical-Failed flow (§7.2).

### Module G — Vendor Assignment & Response
- Admin assigns order → vendor.
- Vendor dashboard: Accept / Reject buttons.
- Accept → vendor selects specific Pet ID from their inventory → order/pet/vendor linked, status `VENDOR ACCEPTED` → `PET ASSIGNED`.
- Reject → status `VENDOR REJECTED`, admin notified, can reassign.

### Module H — Pickup & Inspection
- Admin assigns a delivery/ops agent to the order.
- Agent's access is scoped to **only this one order** (enforced server-side).
- Agent records: photos, short video, notes, physical condition → Accept/Fail.
- Fail → `INSPECTION FAILED`, reason + evidence stored, admin sees full detail, pet does not proceed.
- Pass → `PICKUP ACCEPTED`, moves to medical.

### Module I — Medical Examination
- Agent uploads medical docs against Pet ID + Order ID: report, test reports, vaccination info, certificates, other.
- Result: Approved / Failed.
- Approved → full docs stored internally; vendor sees status flag only, unless a doc is explicitly `Vendor Visible`.
- Failed → reason + proof required, admin sees everything, pet returned to vendor, vendor emailed, order becomes eligible for reassignment/replacement/cancel+refund.

### Module J — Document Visibility Engine
- Every document tagged with exactly one visibility level (§4.5).
- Central authorization check (middleware/service layer) — every document fetch passes through this check regardless of caller role.

### Module K — Customer Record & QR Certificate
- Post-medical-approval: build customer-facing record (only `Customer Visible` docs): pet info, photos, videos, parent info (if allowed), vaccination records, inspection info, medical reports, certificates, delivery info.
- Generate certificate per pet+order with QR → opens the secure online record page.

### Module L — Delivery
- Status → `READY FOR DELIVERY`.
- Agent uploads pet photo, short video, optional photo with customer.
- Agent collects customer ID, signed delivery report, acknowledgement.
- System auto-records order ID, pet ID, agent name, date/time, status.
- Final status: `DELIVERY COMPLETED`.

---

## 6. Key Business Rules

1. Every pet has a unique Pet ID. Every order has a unique Order ID.
2. Each order links to exactly one pet, permanently (reassignment only via Medical-Failed flow).
3. Access control is role-based and enforced server-side, never just UI-hidden.
4. Document visibility is enforced server-side.
5. No unnecessary complexity — resist adding fields/features not in this spec without a written decision.

---

## 7. Status Flow

### 7.1 Happy Path
```
ORDER RECEIVED
  → VENDOR ASSIGNED
  → VENDOR ACCEPTED
  → PET ASSIGNED
  → PICKUP ASSIGNED
  → PICKUP INSPECTION
  → PICKUP ACCEPTED
  → MEDICAL CHECK
  → MEDICAL APPROVED
  → READY FOR DELIVERY
  → DELIVERY COMPLETED
```

### 7.2 Failure Branches
- **Inspection Failed:** `PICKUP INSPECTION` → `INSPECTION FAILED` → Return (pet stays with vendor, order does not proceed on this pet).
- **Medical Failed:** `MEDICAL CHECK` → `MEDICAL FAILED` → Return → Vendor Notified (email) → Admin chooses: Reassign to different pet / Replace / Cancel & Refund.

---

## 8. Non-Functional Requirements

- **Security:** all authorization (role + document visibility) enforced at the API/service layer, with server-side tests for every role boundary in §3.
- **Auditability:** every status transition, inventory move, and document upload is timestamped and attributed to a user.
- **Data integrity:** Pet ID and Order ID formats are system-generated and immutable; order-pet link is a hard constraint.
- **Simplicity:** favor a straightforward relational schema over premature abstraction.

---

## 9. Suggested Build Phases (for incremental, one-by-one implementation)

Each phase should be built, tested, and confirmed working before starting the next. This keeps scope contained and makes progress easy to track (see the companion `Furora_PROGRESS.md`).

| Phase | Scope | Depends On |
|---|---|---|
| **1. Foundations** | DB schema, auth/roles skeleton, Category & Breed CRUD (Module A) | — |
| **2. Pet Core** | Pet ID generation, Pet Profile (Module B), Inventory + status machine (Module C) | Phase 1 |
| **3. Internal Views** | Sales Team view (Module D), Admin views for pets/inventory | Phase 2 |
| **4. Ordering** | Customer order flow (Module E), Order-Pet linking rule (Module F) | Phase 2 |
| **5. Vendor Flow** | Vendor assignment, accept/reject, pet selection (Module G) | Phase 4 |
| **6. Pickup & Inspection** | Agent scoped access, pickup inspection (Module H) | Phase 5 |
| **7. Medical & Visibility** | Medical examination (Module I), Document Visibility Engine (Module J) | Phase 6 |
| **8. Customer Record & Certificate** | Customer record page, QR certificate (Module K) | Phase 7 |
| **9. Delivery** | Delivery workflow, delivery report (Module L) | Phase 8 |
| **10. Hardening** | Full role-boundary security pass, audit trail review, edge cases (inspection/medical failure loops) | Phase 9 |

---

## 10. Open Questions (to confirm before/while building)

- Payment gateway / provider for `payment_status`?
- Notification channel(s) — email only, or also SMS/WhatsApp?
- Hosting/stack preference (this PRD is stack-agnostic by design)?
- Who can trigger "Cancel & Refund" after Medical Failed — Admin only?
