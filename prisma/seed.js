const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting and seeding pristine Furora database...');

  // 1. Wipe all transactional / demo records
  await prisma.inspectionRecord.deleteMany({});
  await prisma.medicalRecord.deleteMany({});
  await prisma.deliveryRecord.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.pet.deleteMany({});
  await prisma.sequenceCounter.deleteMany({});

  // Remove all demo users except Furora Admin
  await prisma.user.deleteMany({
    where: { id: { not: 'usr_admin' } },
  });

  // 2. Primary System Administrator Account (Password: Furora@2026)
  const adminUser = {
    id: 'usr_admin',
    email: 'admin@furora.com',
    username: 'admin',
    password: 'Furora@2026',
    tempPassword: 'Furora@2026',
    name: 'Furora Admin',
    role: 'ADMIN',
    phone: '+91 9876543210',
    address: 'Furora HQ, Chennai',
    onboardingStatus: 'APPROVED',
  };

  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: adminUser,
    create: adminUser,
  });
  console.log('Master Admin account verified: admin@furora.com');

  // 3. Fixed 6 Top-Level Categories (PRD §4.1)
  const categories = [
    { id: 'cat_dogs', name: 'Dogs' },
    { id: 'cat_cats', name: 'Cats' },
    { id: 'cat_fish', name: 'Fish' },
    { id: 'cat_birds', name: 'Birds' },
    { id: 'cat_small_animals', name: 'Small Animals' },
    { id: 'cat_reptiles', name: 'Reptiles' },
  ];

  const coreCategoryIds = categories.map((c) => c.id);
  await prisma.category.deleteMany({
    where: { id: { notIn: coreCategoryIds } },
  });

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, active: true },
      create: { id: cat.id, name: cat.name, active: true },
    });
  }
  console.log(`Seeded ${categories.length} base categories.`);

  // 4. Fixed 16 Breeds under Categories (PRD §4.2)
  const breeds = [
    // Dogs
    { id: 'brd_golden', categoryId: 'cat_dogs', name: 'Golden Retriever', active: true },
    { id: 'brd_labrador', categoryId: 'cat_dogs', name: 'Labrador Retriever', active: true },
    { id: 'brd_beagle', categoryId: 'cat_dogs', name: 'Beagle', active: true },
    { id: 'brd_gsd', categoryId: 'cat_dogs', name: 'German Shepherd', active: true },
    { id: 'brd_bulldog_inactive', categoryId: 'cat_dogs', name: 'English Bulldog (Seasonal)', active: false },

    // Cats
    { id: 'brd_persian', categoryId: 'cat_cats', name: 'Persian Cat', active: true },
    { id: 'brd_siamese', categoryId: 'cat_cats', name: 'Siamese Cat', active: true },
    { id: 'brd_bengal', categoryId: 'cat_cats', name: 'Bengal Cat', active: true },

    // Fish
    { id: 'brd_betta', categoryId: 'cat_fish', name: 'Betta Fish', active: true },
    { id: 'brd_goldfish', categoryId: 'cat_fish', name: 'Oranda Goldfish', active: true },

    // Birds
    { id: 'brd_cockatiel', categoryId: 'cat_birds', name: 'Cockatiel', active: true },
    { id: 'brd_budgerigar', categoryId: 'cat_birds', name: 'Budgerigar', active: true },

    // Small Animals
    { id: 'brd_hamster', categoryId: 'cat_small_animals', name: 'Syrian Hamster', active: true },
    { id: 'brd_rabbit', categoryId: 'cat_small_animals', name: 'Holland Lop Rabbit', active: true },

    // Reptiles
    { id: 'brd_gecko', categoryId: 'cat_reptiles', name: 'Leopard Gecko', active: true },
    { id: 'brd_dragon', categoryId: 'cat_reptiles', name: 'Bearded Dragon', active: true },
  ];

  const coreBreedIds = breeds.map((b) => b.id);
  await prisma.breed.deleteMany({
    where: { id: { notIn: coreBreedIds } },
  });

  for (const b of breeds) {
    await prisma.breed.upsert({
      where: { id: b.id },
      update: { name: b.name, active: b.active, categoryId: b.categoryId },
      create: b,
    });
  }
  console.log(`Seeded ${breeds.length} base breeds.`);

  console.log('Database reset complete: 0 demo staff, 0 demo vendors, 0 demo customers, 0 demo orders, 0 demo pets.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
