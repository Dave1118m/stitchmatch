const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich sample data for StitchMatch...');

  const passwordHash = await bcrypt.hash('password123', 12);
  const adminPasswordHash = await bcrypt.hash('admin123', 12);

  // 1. Ensure Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stitchmatch.com' },
    update: { role: 'admin' },
    create: {
      email: 'admin@stitchmatch.com',
      passwordHash: adminPasswordHash,
      name: 'Elena Rostova (Admin)',
      role: 'admin',
      authProvider: 'email',
      phone: '+1 (555) 019-2831',
      location: 'New York, NY',
    },
  });
  console.log('✔ Admin user ready:', admin.email);

  // 2. Customer User
  const customer = await prisma.user.upsert({
    where: { email: 'customer@stitchmatch.com' },
    update: { role: 'customer' },
    create: {
      email: 'customer@stitchmatch.com',
      passwordHash,
      name: 'Sophia Montgomery',
      role: 'customer',
      authProvider: 'email',
      phone: '+1 (555) 234-5678',
      location: 'Manhattan, New York',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    },
  });
  console.log('✔ Customer user ready:', customer.email);

  // 3. Tailor User 1 (Master Suitmaker - Ethiopian Habesha Master)
  const tailorUser1 = await prisma.user.upsert({
    where: { email: 'tailor@stitchmatch.com' },
    update: { 
      name: 'Abebe Tessema',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=300&auto=format&fit=crop&q=80',
      role: 'tailor' 
    },
    create: {
      email: 'tailor@stitchmatch.com',
      passwordHash,
      name: 'Abebe Tessema',
      role: 'tailor',
      authProvider: 'email',
      phone: '+251 91 123 4567',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=300&auto=format&fit=crop&q=80',
    },
  });

  const tailor1 = await prisma.tailor.upsert({
    where: { id: tailorUser1.id },
    update: {
      approvalStatus: 'approved',
      bio: 'Master Ethiopian & Bespoke Suit Tailor with 18+ years experience. Specializing in handcrafted suits, tuxedos, custom Habesha attire, and luxury alterations.',
      specialties: JSON.stringify(['Bespoke Suits', 'Tuxedos', 'Habesha Suits', 'Overcoats', 'Silk Shirts']),
      basePricingMin: 350.00,
      basePricingMax: 1800.00,
      portfolioImages: JSON.stringify([
        { imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80', title: 'Navy Bespoke Suit', description: 'Super 150s Wool 3-piece tuxedo' },
        { imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80', title: 'Classic Double-Breasted Blazer', description: 'Hand-stitched lapels with horn buttons' },
        { imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80', title: 'Charcoal Executive Suit', description: 'Tailored fit for executive wardrobe' }
      ]),
    },
    create: {
      id: tailorUser1.id,
      approvalStatus: 'approved',
      bio: 'Master Ethiopian & Bespoke Suit Tailor with 18+ years experience. Specializing in handcrafted suits, tuxedos, custom Habesha attire, and luxury alterations.',
      specialties: JSON.stringify(['Bespoke Suits', 'Tuxedos', 'Habesha Suits', 'Overcoats', 'Silk Shirts']),
      basePricingMin: 350.00,
      basePricingMax: 1800.00,
      portfolioImages: JSON.stringify([
        { imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80', title: 'Navy Bespoke Suit', description: 'Super 150s Wool 3-piece tuxedo' },
        { imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80', title: 'Classic Double-Breasted Blazer', description: 'Hand-stitched lapels with horn buttons' },
        { imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80', title: 'Charcoal Executive Suit', description: 'Tailored fit for executive wardrobe' }
      ]),
    },
  });
  console.log('✔ Tailor 1 ready:', tailorUser1.name);

  // 4. Tailor User 2 (Haute Couture & Habesha Kemis Designer)
  const tailorUser2 = await prisma.user.upsert({
    where: { email: 'tailor2@stitchmatch.com' },
    update: { 
      name: 'Bethlehem Tilahun',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
      role: 'tailor' 
    },
    create: {
      email: 'tailor2@stitchmatch.com',
      passwordHash,
      name: 'Bethlehem Tilahun',
      role: 'tailor',
      authProvider: 'email',
      phone: '+251 91 987 6543',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
    },
  });

  await prisma.tailor.upsert({
    where: { id: tailorUser2.id },
    update: {
      approvalStatus: 'approved',
      bio: 'Award-winning Habesha fashion designer & master seamstress. Creating bespoke Habesha Kemis, silk evening gowns, and custom wedding attire.',
      specialties: JSON.stringify(['Habesha Kemis', 'Evening Gowns', 'Bridal Wear', 'Silk Dresses', 'Custom Corsets']),
      basePricingMin: 500.00,
      basePricingMax: 3000.00,
      portfolioImages: JSON.stringify([
        { imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80', title: 'Silk Satin Evening Gown', description: 'Emerald green bias-cut evening gown' },
        { imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80', title: 'Custom Red Carpet Dress', description: 'Hand-beaded corset & train' }
      ]),
    },
    create: {
      id: tailorUser2.id,
      approvalStatus: 'approved',
      bio: 'Award-winning Habesha fashion designer & master seamstress. Creating bespoke Habesha Kemis, silk evening gowns, and custom wedding attire.',
      specialties: JSON.stringify(['Habesha Kemis', 'Evening Gowns', 'Bridal Wear', 'Silk Dresses', 'Custom Corsets']),
      basePricingMin: 500.00,
      basePricingMax: 3000.00,
      portfolioImages: JSON.stringify([
        { imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80', title: 'Silk Satin Evening Gown', description: 'Emerald green bias-cut evening gown' },
        { imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80', title: 'Custom Red Carpet Dress', description: 'Hand-beaded corset & train' }
      ]),
    },
  });
  console.log('✔ Tailor 2 ready:', tailorUser2.name);

  // 5. Sample Pending Tailor for Admin Approval Testing
  const pendingUser = await prisma.user.upsert({
    where: { email: 'pendingtailor@stitchmatch.com' },
    update: { 
      name: 'Dawit Yohannes',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
      role: 'tailor' 
    },
    create: {
      email: 'pendingtailor@stitchmatch.com',
      passwordHash,
      name: 'Dawit Yohannes',
      role: 'tailor',
      authProvider: 'email',
      phone: '+251 91 555 0199',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    },
  });

  await prisma.tailor.upsert({
    where: { id: pendingUser.id },
    update: { approvalStatus: 'pending' },
    create: {
      id: pendingUser.id,
      approvalStatus: 'pending',
      bio: 'Craftsman specializing in denim & casual tailored jackets.',
      specialties: JSON.stringify(['Custom Denim', 'Jackets']),
      basePricingMin: 200,
      basePricingMax: 800,
    },
  });
  console.log('✔ Pending tailor created for admin verification:', pendingUser.email);

  // 6. Sample Active Service Request with AI Measurements & Negotiations
  const existingReq = await prisma.serviceRequest.findFirst({
    where: { customerId: customer.id, tailorId: tailorUser1.id },
  });

  let requestId = existingReq ? existingReq.id : undefined;

  if (!existingReq) {
    const req = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        tailorId: tailorUser1.id,
        garmentType: 'Bespoke 3-Piece Navy Tuxedo',
        fabricPreference: 'Italian Super 150s Virgin Wool with Silk Lapels',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budget: 950.00,
        finalPrice: 880.00,
        notes: 'Need this for a gala event on the 15th. Slim modern cut.',
        status: 'In_Progress',
        customerConfirmed: true,
        tailorConfirmed: true,
        agreedAt: new Date(),
      },
    });
    requestId = req.id;
    console.log('✔ Sample service request created ID:', req.id);
  }

  if (requestId) {
    // Add AI Measurement
    await prisma.measurement.upsert({
      where: { requestId },
      update: {},
      create: {
        requestId,
        customerId: customer.id,
        frontPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        sidePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        backPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        aiStatus: 'completed',
        aiConfidence: 94.50,
        chest: 102.50,
        waist: 84.00,
        hip: 98.00,
        inseam: 81.50,
        shoulderWidth: 46.00,
        armLength: 64.00,
        adjustments: JSON.stringify([
          { fieldName: 'Chest', originalValue: '100.5', adjustedValue: '102.5', reason: 'Added 2cm ease for comfort', timestamp: new Date().toISOString() }
        ]),
      },
    });

    // Add Order Events
    const existingEvents = await prisma.orderEvent.count({ where: { requestId } });
    if (existingEvents === 0) {
      await prisma.orderEvent.createMany({
        data: [
          { requestId, status: 'cutting', notes: 'Fabric inspected and precision patterns cut', createdBy: tailorUser1.id },
          { requestId, status: 'sewing', notes: 'Chest canvas padded & shoulder structure sewn', createdBy: tailorUser1.id }
        ],
      });
    }

    // Add Conversation & Messages
    const conv = await prisma.conversation.upsert({
      where: { requestId },
      update: {},
      create: {
        customerId: customer.id,
        tailorId: tailorUser1.id,
        requestId,
      },
    });

    const msgCount = await prisma.message.count({ where: { conversationId: conv.id } });
    if (msgCount === 0) {
      await prisma.message.createMany({
        data: [
          { conversationId: conv.id, senderId: customer.id, content: 'Hi Abebe! Looking forward to starting this tuxedo order.' },
          { conversationId: conv.id, senderId: tailorUser1.id, content: 'Greetings Sophia! Fabric has been prepared. We are on schedule for fitting next week.' }
        ],
      });
    }

    // Add Sample Review for completed order demo
    const completedReq = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        tailorId: tailorUser1.id,
        garmentType: 'Tailored Cashmere Overcoat',
        fabricPreference: '100% Mongolian Cashmere - Camel Color',
        deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        budget: 1200.00,
        finalPrice: 1200.00,
        notes: 'Classic winter overcoat',
        status: 'Completed',
        customerConfirmed: true,
        tailorConfirmed: true,
        agreedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.review.upsert({
      where: { requestId: completedReq.id },
      update: {},
      create: {
        requestId: completedReq.id,
        customerId: customer.id,
        tailorId: tailorUser1.id,
        rating: 5,
        feedback: 'Abebe is a true master artisan! The cashmere coat fits like a glove and the hand-stitched detailing is magnificent.',
        tailorReply: 'Thank you Sophia! It was a delight tailoring this piece for you.',
        replyAt: new Date(),
      },
    });
  }

  console.log('\n✅ All sample data seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Customer Credentials: customer@stitchmatch.com / password123');
  console.log('Tailor Credentials:   tailor@stitchmatch.com   / password123');
  console.log('Admin Credentials:    admin@stitchmatch.com    / admin123');
  console.log('----------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
