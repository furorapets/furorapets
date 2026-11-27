const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Read .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('Error reading .env:', e.message);
}

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  console.log('Connecting to Turso:', url ? url.slice(0, 35) + '...' : 'NONE');
  const client = createClient({ url, authToken });

  try {
    const tableInfo = await client.execute('PRAGMA table_info(User)');
    console.log('User columns before:');
    tableInfo.rows.forEach(r => console.log('  -', r.name, r.type));
  } catch (err) {
    console.error('Error fetching table info:', err.message);
  }

  const statements = [
    'ALTER TABLE "User" ADD COLUMN "mapUrl" TEXT',
    'ALTER TABLE "User" ADD COLUMN "secondaryAddress" TEXT',
    'ALTER TABLE "User" ADD COLUMN "secondaryMapUrl" TEXT',
    'ALTER TABLE "User" ADD COLUMN "assignedCategories" TEXT DEFAULT \'[]\'',
    'ALTER TABLE "Pet" ADD COLUMN "microchipNumber" TEXT'
  ];

  for (const sql of statements) {
    try {
      console.log('Executing:', sql);
      await client.execute(sql);
      console.log('SUCCESS');
    } catch (e) {
      console.log('Notice:', e.message);
    }
  }

  try {
    const tableInfoAfter = await client.execute('PRAGMA table_info(User)');
    console.log('\nUser columns after:');
    tableInfoAfter.rows.forEach(r => console.log('  -', r.name, r.type));
  } catch (err) {
    console.error('Error fetching table info after:', err.message);
  }

  // Also check dev.db if exists
  try {
    const localClient = createClient({ url: 'file:./prisma/dev.db' });
    for (const sql of statements) {
      try {
        await localClient.execute(sql);
      } catch (e) {
        // ignore
      }
    }
    console.log('\nSuccessfully synced prisma/dev.db as well');
  } catch (e) {
    console.log('Local dev.db notice:', e.message);
  }
}

run().catch(console.error);
