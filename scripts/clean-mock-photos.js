const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  console.log('Cleaning mock Unsplash URLs from database...');
  try {
    const updatedOrders = await prisma.order.updateMany({
      where: { petPhotoAtPickup: { contains: 'unsplash.com' } },
      data: { petPhotoAtPickup: null },
    });
    console.log('Cleaned orders with unsplash petPhotoAtPickup:', updatedOrders.count);

    const deletedDocs = await prisma.document.deleteMany({
      where: { fileUrl: { contains: 'unsplash.com' } },
    });
    console.log('Deleted document records with unsplash URLs:', deletedDocs.count);
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

clean()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
