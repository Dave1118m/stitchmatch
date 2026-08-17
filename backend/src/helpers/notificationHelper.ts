import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

export async function createNotification(
  prisma: PrismaClient,
  userId: string,
  title: string,
  message: string,
  type: 'request' | 'order' | 'message' | 'approval' | 'review',
  io?: Server
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    if (io) {
      try {
        io.to(`user:${userId}`).emit('notification', notification);
        console.log(`[Socket Notification] Emitted '${type}' notification to user:${userId}`);
      } catch (socketErr) {
        console.error('Failed to emit socket notification:', socketErr);
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function notifyRequestStatus(
  prisma: PrismaClient,
  requestId: string,
  status: string,
  recipientId: string,
  io?: Server
) {
  console.log('Creating notification:', { requestId, status, recipientId });
  
  const messages: Record<string, { title: string; message: string }> = {
    Pending: { title: 'New Service Request', message: 'You have received a new custom tailoring request.' },
    Under_Discussion: { title: 'Request Under Discussion', message: 'Your service request has been accepted for discussion.' },
    Agreed: { title: 'Terms Agreed', message: 'Agreement reached! Both parties confirmed project specifications.' },
    In_Progress: { title: 'Order In Progress', message: 'Your garment crafting is now officially in progress.' },
    Completed: { title: 'Order Completed', message: 'Your bespoke order has been completed.' },
    Rejected: { title: 'Request Declined', message: 'Your service request could not be accepted at this time.' },
  };

  const notification = messages[status] || { title: 'Status Update', message: `Request status updated to: ${status.replace(/_/g, ' ')}` };
  await createNotification(prisma, recipientId, notification.title, notification.message, 'request', io);
}

export async function notifyNewMessage(
  prisma: PrismaClient,
  conversationId: string,
  senderName: string,
  recipientId: string,
  io?: Server
) {
  await createNotification(
    prisma,
    recipientId,
    `New Message from ${senderName || 'Tailor / Client'}`,
    'You have received a new message in your chat conversation.',
    'message',
    io
  );
}

export async function notifyTailorApproval(
  prisma: PrismaClient,
  tailorId: string,
  approved: boolean,
  io?: Server
) {
  await createNotification(
    prisma,
    tailorId,
    approved ? 'Atelier Account Approved' : 'Application Update',
    approved ? 'Congratulations! Your tailor atelier profile has been verified and published.' : 'Your tailor application was reviewed and could not be approved at this time.',
    'approval',
    io
  );
}

export async function notifyOrderStatus(
  prisma: PrismaClient,
  requestId: string,
  status: string,
  recipientId: string,
  io?: Server
) {
  await createNotification(
    prisma,
    recipientId,
    'Order Stage Updated',
    `Your order progress stage is now: ${status.replace(/_/g, ' ')}`,
    'order',
    io
  );
}

export async function notifyNewReview(
  prisma: PrismaClient,
  tailorId: string,
  rating: number,
  customerName?: string,
  io?: Server
) {
  await createNotification(
    prisma,
    tailorId,
    'New Atelier Review',
    `${customerName || 'A customer'} left you a ${rating}-star review on your completed order.`,
    'review',
    io
  );
}

export async function notifyReviewReply(
  prisma: PrismaClient,
  customerId: string,
  tailorName?: string,
  io?: Server
) {
  await createNotification(
    prisma,
    customerId,
    'Tailor Replied to Your Review',
    `${tailorName || 'The tailor'} responded to your feedback on StitchMatch.`,
    'review',
    io
  );
}
