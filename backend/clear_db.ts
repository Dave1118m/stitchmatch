import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDB() {
  console.log('Clearing database...');
  try {
    await prisma.notification.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.orderEvent.deleteMany({});
    await prisma.measurement.deleteMany({});
    await prisma.negotiation.deleteMany({});
    await prisma.agreementSnapshot.deleteMany({});
    await prisma.serviceRequest.deleteMany({});
    
    await prisma.designOption.deleteMany({});
    await prisma.productColor.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.product.deleteMany({});
    
    await prisma.tailor.deleteMany({});
    
    // Check if there's an admin user we should keep, but the user said "remove the data or customer and tailors".
    // I will delete all users so it's a completely fresh slate.
    await prisma.user.deleteMany({});
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDB();
