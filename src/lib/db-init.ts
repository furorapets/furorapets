import { createClient } from '@libsql/client';

export const SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "tempPassword" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "assignedHub" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "kennelRegNumber" TEXT,
    "kennelRegDoc" TEXT,
    "govIdDoc" TEXT,
    "tradeLicenseDoc" TEXT,
    "vetAffiliationDoc" TEXT,
    "bankDetailsDoc" TEXT,
    "onboardingStatus" TEXT DEFAULT 'APPROVED',
    "onboardingNotes" TEXT,
    "assignedCategories" TEXT DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS "Breed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Breed_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "breedId" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "sex" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "microchipNumber" TEXT,
    "otherDetails" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "videos" TEXT NOT NULL DEFAULT '[]',
    "fatherName" TEXT,
    "fatherPhoto" TEXT,
    "fatherVideo" TEXT,
    "fatherDocs" TEXT DEFAULT '[]',
    "motherName" TEXT,
    "motherPhoto" TEXT,
    "motherVideo" TEXT,
    "motherDocs" TEXT DEFAULT '[]',
    "kciRegistered" BOOLEAN NOT NULL DEFAULT false,
    "kciDocuments" TEXT DEFAULT '[]',
    "inventoryOwner" TEXT NOT NULL DEFAULT 'FURORA',
    "vendorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pet_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pet_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "breedId" TEXT NOT NULL,
    "productOrPackage" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "orderSource" TEXT DEFAULT 'WEBSITE',
    "adCampaign" TEXT,
    "advancePaid" REAL,
    "paymentMode" TEXT DEFAULT 'FULL_PREPAID',
    "petId" TEXT,
    "vendorId" TEXT,
    "agentId" TEXT,
    "petPhotoAtPickup" TEXT,
    "vetClinicName" TEXT,
    "vetDoctorName" TEXT,
    "medicalCertUrl" TEXT,
    "deliveryDriverLat" REAL,
    "deliveryDriverLng" REAL,
    "estimatedDeliveryTime" TEXT,
    "procurementCost" REAL,
    "vendorPayoutStatus" TEXT DEFAULT 'UNASSIGNED',
    "vendorPayoutRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORDER_RECEIVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "InspectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "video" TEXT,
    "notes" TEXT NOT NULL,
    "physicalCondition" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "failureReason" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InspectionRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InspectionRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "MedicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason" TEXT,
    "proofDocs" TEXT DEFAULT '[]',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicalRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MedicalRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "DeliveryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "video" TEXT,
    "photoWithCustomer" TEXT,
    "customerIdCaptured" TEXT NOT NULL,
    "signedDeliveryReport" TEXT NOT NULL,
    "customerAcknowledgement" TEXT NOT NULL,
    "dateTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DELIVERY COMPLETED',
    CONSTRAINT "DeliveryRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "furoraDetails" TEXT NOT NULL DEFAULT '{}',
    "qrCodeUrl" TEXT NOT NULL,
    "verificationUrl" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Certificate_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "SequenceCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currentValue" INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Breed_categoryId_name_key" ON "Breed"("categoryId", "name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Pet_petId_key" ON "Pet"("petId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderId_key" ON "Order"("orderId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Order_petId_key" ON "Order"("petId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryRecord_orderId_key" ON "DeliveryRecord"("orderId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryRecord_petId_key" ON "DeliveryRecord"("petId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_petId_key" ON "Certificate"("petId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_orderId_key" ON "Certificate"("orderId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certificateId_key" ON "Certificate"("certificateId")`,
];

export async function ensureDatabaseSchema(libsqlClient: ReturnType<typeof createClient>) {
  for (const ddl of SCHEMA_DDL) {
    try {
      await libsqlClient.execute(ddl);
    } catch (err: any) {
      console.error(`[db-init] Error executing DDL: ${ddl.slice(0, 40)}:`, err.message);
    }
  }

  // Ensure assignedCategories column exists on User table for older databases
  try {
    await libsqlClient.execute(`ALTER TABLE "User" ADD COLUMN "assignedCategories" TEXT DEFAULT '[]'`);
  } catch (err: any) {
    // Column already exists or table freshly created
  }

  // Ensure microchipNumber column exists on Pet table for older databases
  try {
    await libsqlClient.execute(`ALTER TABLE "Pet" ADD COLUMN "microchipNumber" TEXT`);
  } catch (err: any) {
    // Column already exists or table freshly created
  }

  // Seed default admin and categories if not present
  try {
    const now = new Date().toISOString();
    // 1. Admin account
    await libsqlClient.execute({
      sql: `INSERT OR IGNORE INTO "User" ("id", "email", "username", "password", "tempPassword", "name", "role", "phone", "address", "createdAt", "updatedAt", "onboardingStatus")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'usr_admin',
        'admin@furora.com',
        'admin',
        'Furora@2026',
        'Furora@2026',
        'Furora Admin',
        'ADMIN',
        '+91 9876543210',
        'Furora HQ, Chennai',
        now,
        now,
        'APPROVED',
      ],
    });

    // 2. Breeder Admin account (breeder@furora.in)
    await libsqlClient.execute({
      sql: `INSERT OR IGNORE INTO "User" ("id", "email", "username", "password", "tempPassword", "name", "role", "phone", "address", "createdAt", "updatedAt", "onboardingStatus")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'usr_breeder_admin',
        'breeder@furora.in',
        'breeder_admin',
        'Furora@2026',
        'Furora@2026',
        'Furora Breeder Admin',
        'ADMIN',
        '+91 9876543210',
        'Furora Operations, India',
        now,
        now,
        'APPROVED',
      ],
    });

    // 3. 6 Core Categories
    const categories = [
      { id: 'cat_dogs', name: 'Dogs' },
      { id: 'cat_cats', name: 'Cats' },
      { id: 'cat_fish', name: 'Fish' },
      { id: 'cat_birds', name: 'Birds' },
      { id: 'cat_small_animals', name: 'Small Animals' },
      { id: 'cat_reptiles', name: 'Reptiles' },
    ];
    for (const cat of categories) {
      await libsqlClient.execute({
        sql: `INSERT OR IGNORE INTO "Category" ("id", "name", "active") VALUES (?, ?, true)`,
        args: [cat.id, cat.name],
      });
    }

    // 4. 16 Breeds
    const breeds = [
      { id: 'brd_golden', categoryId: 'cat_dogs', name: 'Golden Retriever', active: 1 },
      { id: 'brd_labrador', categoryId: 'cat_dogs', name: 'Labrador Retriever', active: 1 },
      { id: 'brd_beagle', categoryId: 'cat_dogs', name: 'Beagle', active: 1 },
      { id: 'brd_gsd', categoryId: 'cat_dogs', name: 'German Shepherd', active: 1 },
      { id: 'brd_bulldog_inactive', categoryId: 'cat_dogs', name: 'English Bulldog (Seasonal)', active: 0 },
      { id: 'brd_persian', categoryId: 'cat_cats', name: 'Persian Cat', active: 1 },
      { id: 'brd_siamese', categoryId: 'cat_cats', name: 'Siamese Cat', active: 1 },
      { id: 'brd_bengal', categoryId: 'cat_cats', name: 'Bengal Cat', active: 1 },
      { id: 'brd_betta', categoryId: 'cat_fish', name: 'Betta Fish', active: 1 },
      { id: 'brd_goldfish', categoryId: 'cat_fish', name: 'Oranda Goldfish', active: 1 },
      { id: 'brd_cockatiel', categoryId: 'cat_birds', name: 'Cockatiel', active: 1 },
      { id: 'brd_budgerigar', categoryId: 'cat_birds', name: 'Budgerigar', active: 1 },
      { id: 'brd_hamster', categoryId: 'cat_small_animals', name: 'Syrian Hamster', active: 1 },
      { id: 'brd_rabbit', categoryId: 'cat_small_animals', name: 'Holland Lop Rabbit', active: 1 },
      { id: 'brd_gecko', categoryId: 'cat_reptiles', name: 'Leopard Gecko', active: 1 },
      { id: 'brd_dragon', categoryId: 'cat_reptiles', name: 'Bearded Dragon', active: 1 },
    ];
    for (const b of breeds) {
      await libsqlClient.execute({
        sql: `INSERT OR IGNORE INTO "Breed" ("id", "categoryId", "name", "active") VALUES (?, ?, ?, ?)`,
        args: [b.id, b.categoryId, b.name, b.active],
      });
    }

    console.log('[db-init] Schema verification and core seed completed successfully.');
    return { success: true };
  } catch (seedErr: any) {
    console.error('[db-init] Seed error:', seedErr.message);
    return { success: false, error: seedErr.message };
  }
}
