import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StitchMatch database seeding...');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 12);

  // 1. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stitchmatch.com' },
    update: {},
    create: {
      email: 'admin@stitchmatch.com',
      passwordHash: defaultPasswordHash,
      name: 'System Administrator',
      role: 'admin',
      phone: '+251 911 000 001',
      location: 'Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
  });
  console.log('✅ Admin user ready:', admin.email);

  // 2. Create Master Tailor 1: Master Alazar
  const tailorUser1 = await prisma.user.upsert({
    where: { email: 'alazar.tailor@stitchmatch.com' },
    update: {},
    create: {
      email: 'alazar.tailor@stitchmatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Master Alazar Tadesse',
      role: 'tailor',
      phone: '+251 911 234 567',
      location: 'Bole, Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  });

  const tailorProfile1 = await prisma.tailor.upsert({
    where: { id: tailorUser1.id },
    update: {},
    create: {
      id: tailorUser1.id,
      bio: 'Master artisan tailor with over 18 years of experience in high-end bespoke suits, tuxedos, and authentic hand-embroidered Habesha Kemis. Trained in classic Italian tailoring and Ethiopian heritage craftsmanship.',
      specialties: JSON.stringify(['Bespoke Suits', 'Habesha Kemis', 'Tuxedos', 'Overcoats', 'Silk Lining']),
      basePricingMin: 250,
      basePricingMax: 1800,
      approvalStatus: 'approved',
    },
  });
  console.log('✅ Tailor 1 ready:', tailorUser1.name);

  // 3. Create Master Tailor 2: Selamawit Couture
  const tailorUser2 = await prisma.user.upsert({
    where: { email: 'selam.atelier@stitchmatch.com' },
    update: {},
    create: {
      email: 'selam.atelier@stitchmatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Selamawit Couture',
      role: 'tailor',
      phone: '+251 922 888 999',
      location: 'Kazanchis, Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
  });

  await prisma.tailor.upsert({
    where: { id: tailorUser2.id },
    update: {},
    create: {
      id: tailorUser2.id,
      bio: 'Award-winning bridal couturier specializing in contemporary wedding dresses, custom evening gowns, and hand-beaded lace gala silhouettes with precise silhouette sculpting.',
      specialties: JSON.stringify(['Bridal Wear', 'Evening Gowns', 'Cocktail Dresses', 'Silk Garments']),
      basePricingMin: 400,
      basePricingMax: 3200,
      approvalStatus: 'approved',
    },
  });
  console.log('✅ Tailor 2 ready:', tailorUser2.name);

  // 4. Create Sample Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@stitchmatch.com' },
    update: {},
    create: {
      email: 'customer@stitchmatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Dawit Mekonnen',
      role: 'customer',
      phone: '+251 944 555 666',
      location: 'CMC, Addis Ababa, Ethiopia',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
  });
  console.log('✅ Customer ready:', customer.name);

  // 5. Seed Showcase Products for Tailor 1
  const existingProducts = await prisma.product.count({ where: { tailorId: tailorUser1.id } });
  if (existingProducts === 0) {
    const product1 = await prisma.product.create({
      data: {
        tailorId: tailorUser1.id,
        name: 'Executive Midnight Blue 3-Piece Bespoke Suit',
        description: 'Custom tailored wool-cashmere blend suit with hand-stitched pick lapels and custom silk interior.',
        basePrice: 850,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
              isPrimary: true,
            },
          ],
        },
      },
    });

    const product2 = await prisma.product.create({
      data: {
        tailorId: tailorUser1.id,
        name: 'Royal Heritage Hand-Embroidered Habesha Kemis',
        description: 'Pure organic cotton Shemane woven dress with gold and emerald Tilet embroidery patterns.',
        basePrice: 650,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
              isPrimary: true,
            },
          ],
        },
      },
    });
    console.log('✅ Showcase products created for tailor 1:', product1.name, ',', product2.name);
  }

  console.log('\n🎉 StitchMatch database seed completed successfully!');
  console.log('🔑 Credentials Summary:');
  console.log('   - Admin:    admin@stitchmatch.com / Password123!');
  console.log('   - Tailor 1: alazar.tailor@stitchmatch.com / Password123!');
  console.log('   - Tailor 2: selam.atelier@stitchmatch.com / Password123!');
  console.log('   - Customer: customer@stitchmatch.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
