import { PrismaClient } from '@prisma/client';

export function schedulePhotoDeletion(prisma: PrismaClient, requestId: string, days = Number(process.env.PHOTO_RETENTION_DAYS || 30)) {
  const ms = days * 24 * 60 * 60 * 1000;
  // Use a persistent job queue in production for reliable cleanup.
  setTimeout(async () => {
    try {
      const measurement = await prisma.measurement.findUnique({ where: { requestId } });
      if (!measurement) return;
      // Here you would delete files from storage (S3, etc.). We clear URLs to revoke access.
      await prisma.measurement.update({ where: { requestId }, data: { frontPhotoUrl: null, sidePhotoUrl: null, backPhotoUrl: null } });
      console.log(`Cleared measurement photos for request ${requestId} after ${days} days`);
    } catch (err) {
      console.error('Photo deletion error:', err);
    }
  }, ms);
}
