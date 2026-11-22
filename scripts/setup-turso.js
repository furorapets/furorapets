const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@libsql/client');

// Simple .env parser without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoAuthToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.');
    process.exit(1);
  }

  console.log('Connecting to Turso Cloud Database:', tursoUrl);
  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  // Check if tables already exist
  const existingTables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  );
  const existingTableNames = existingTables.rows.map((r) => r.name);

  if (existingTableNames.length === 0) {
    console.log('Generating schema DDL from Prisma schema...');
    const ddl = execSync(
      'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
      { encoding: 'utf-8' }
    );

    console.log('Applying Prisma schema to Turso database...');
    await client.executeMultiple(ddl);
    console.log('Schema successfully applied to Turso!');
  } else {
    console.log(`Turso database already has ${existingTableNames.length} tables:`, existingTableNames);
  }

  // 4. Seed pristine data into Turso
  console.log('Seeding master admin and catalog data into Turso...');

  // Wipe any existing data to ensure pristine state
  await client.executeMultiple(`
    DELETE FROM "InspectionRecord";
    DELETE FROM "MedicalRecord";
    DELETE FROM "DeliveryRecord";
    DELETE FROM "Certificate";
    DELETE FROM "Document";
    DELETE FROM "AuditLog";
    DELETE FROM "Order";
    DELETE FROM "Pet";
    DELETE FROM "Breed";
    DELETE FROM "Category";
    DELETE FROM "SequenceCounter";
    DELETE FROM "User";
  `);

  // Insert Master Admin
  await client.execute({
    sql: `
      INSERT INTO "User" (
        id, email, username, password, tempPassword, name, role, phone, address, onboardingStatus, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      );
    `,
    args: [
      'usr_admin',
      'admin@furora.com',
      'admin',
      'Furora@2026',
      'Furora@2026',
      'Furora Admin',
      'ADMIN',
      '+91 9876543210',
      'Furora HQ, Bangalore',
      'APPROVED',
    ],
  });
  console.log('Seeded Master Admin: admin@furora.com (Furora@2026)');

  // Categories
  const categories = [
    { id: 'cat_dogs', name: 'Dogs' },
    { id: 'cat_cats', name: 'Cats' },
    { id: 'cat_fish', name: 'Fish' },
    { id: 'cat_birds', name: 'Birds' },
    { id: 'cat_small_animals', name: 'Small Animals' },
    { id: 'cat_reptiles', name: 'Reptiles' },
  ];

  for (const cat of categories) {
    await client.execute({
      sql: `INSERT INTO "Category" (id, name, active) VALUES (?, ?, 1);`,
      args: [cat.id, cat.name],
    });
  }
  console.log(`Seeded ${categories.length} base categories.`);

  // Breeds
  const breeds = [
    // Dogs
    { id: 'brd_golden', categoryId: 'cat_dogs', name: 'Golden Retriever', active: 1 },
    { id: 'brd_labrador', categoryId: 'cat_dogs', name: 'Labrador Retriever', active: 1 },
    { id: 'brd_beagle', categoryId: 'cat_dogs', name: 'Beagle', active: 1 },
    { id: 'brd_gsd', categoryId: 'cat_dogs', name: 'German Shepherd', active: 1 },
    { id: 'brd_bulldog_inactive', categoryId: 'cat_dogs', name: 'English Bulldog (Seasonal)', active: 0 },

    // Cats
    { id: 'brd_persian', categoryId: 'cat_cats', name: 'Persian Cat', active: 1 },
    { id: 'brd_siamese', categoryId: 'cat_cats', name: 'Siamese Cat', active: 1 },
    { id: 'brd_bengal', categoryId: 'cat_cats', name: 'Bengal Cat', active: 1 },

    // Fish
    { id: 'brd_betta', categoryId: 'cat_fish', name: 'Betta Fish', active: 1 },
    { id: 'brd_goldfish', categoryId: 'cat_fish', name: 'Oranda Goldfish', active: 1 },

    // Birds
    { id: 'brd_cockatiel', categoryId: 'cat_birds', name: 'Cockatiel', active: 1 },
    { id: 'brd_budgerigar', categoryId: 'cat_birds', name: 'Budgerigar', active: 1 },

    // Small Animals
    { id: 'brd_hamster', categoryId: 'cat_small_animals', name: 'Syrian Hamster', active: 1 },
    { id: 'brd_rabbit', categoryId: 'cat_small_animals', name: 'Holland Lop Rabbit', active: 1 },

    // Reptiles
    { id: 'brd_gecko', categoryId: 'cat_reptiles', name: 'Leopard Gecko', active: 1 },
    { id: 'brd_dragon', categoryId: 'cat_reptiles', name: 'Bearded Dragon', active: 1 },
  ];

  for (const b of breeds) {
    await client.execute({
      sql: `INSERT INTO "Breed" (id, categoryId, name, active) VALUES (?, ?, ?, ?);`,
      args: [b.id, b.categoryId, b.name, b.active],
    });
  }
  console.log(`Seeded ${breeds.length} base breeds.`);

  // 5. Verification queries
  const userCount = await client.execute('SELECT COUNT(*) as count FROM "User";');
  const catCount = await client.execute('SELECT COUNT(*) as count FROM "Category";');
  const breedCount = await client.execute('SELECT COUNT(*) as count FROM "Breed";');
  const orderCount = await client.execute('SELECT COUNT(*) as count FROM "Order";');
  const petCount = await client.execute('SELECT COUNT(*) as count FROM "Pet";');
  const docCount = await client.execute('SELECT COUNT(*) as count FROM "Document";');

  console.log('\n--- Turso Cloud Database Pristine State ---');
  console.log(`Users: ${userCount.rows[0].count} (Only usr_admin / admin@furora.com)`);
  console.log(`Categories: ${catCount.rows[0].count}`);
  console.log(`Breeds: ${breedCount.rows[0].count}`);
  console.log(`Orders: ${orderCount.rows[0].count}`);
  console.log(`Pets: ${petCount.rows[0].count}`);
  console.log(`Documents: ${docCount.rows[0].count}`);
  console.log('-------------------------------------------\n');
  console.log('Turso cloud database setup completed successfully!');
}

main().catch((err) => {
  console.error('Turso setup failed:', err);
  process.exit(1);
});
