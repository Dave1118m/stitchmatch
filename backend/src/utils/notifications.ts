import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { enqueueEmail } from '../services/emailQueue';

export async function sendNotification(prisma: PrismaClient, io: Server | undefined, userId: string, title: string, message: string, type = 'general', sendEmail = true) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });

  // Emit socket notification if io provided
  try {
    if (io) io.to(`user:${userId}`).emit('notification', notification);
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  // Queue email send asynchronously
  if (sendEmail) {
    // Load user email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.email) {
      enqueueEmail({ to: user.email, subject: title, text: message });
    }
  }

  return notification;
}
