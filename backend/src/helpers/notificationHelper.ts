import { PrismaClient } from '@prisma/client';

export async function createNotification(
  prisma: PrismaClient,
  userId: string,
  title: string,
  message: string,
  type: 'request' | 'order' | 'message' | 'approval' | 'review'
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyRequestStatus(
  prisma: PrismaClient,
  requestId: string,
  status: string,
  recipientId: string
) {
  console.log('Creating notification:', { requestId, status, recipientId });
  
  const messages: Record<string, { title: string; message: string }> = {
    Pending: { title: 'New Request', message: 'You have a new service request.' },
    Under_Discussion: { title: 'Request Under Discussion', message: 'Your request is now under discussion.' },
    Agreed: { title: 'Request Agreed', message: 'Your request has been agreed upon.' },
    In_Progress: { title: 'Order In Progress', message: 'Your order is now in progress.' },
    Completed: { title: 'Order Completed', message: 'Your order has been completed.' },
    Rejected: { title: 'Request Rejected', message: 'Your request has been rejected.' },
  };

  const notification = messages[status] || { title: 'Status Update', message: `Request status: ${status}` };
  await createNotification(prisma, recipientId, notification.title, notification.message, 'request');
  
  console.log('Notification created successfully');
}

export async function notifyNewMessage(
  prisma: PrismaClient,
  requestId: string,
  senderId: string,
  recipientId: string
) {
  await createNotification(
    prisma,
    recipientId,
    'New Message',
    'You have a new message in your chat.',
    'message'
  );
}

export async function notifyTailorApproval(
  prisma: PrismaClient,
  tailorId: string,
  approved: boolean
) {
  await createNotification(
    prisma,
    tailorId,
    approved ? 'Account Approved' : 'Account Rejected',
    approved ? 'Your tailor account has been approved.' : 'Your tailor account has been rejected.',
    'approval'
  );
}

export async function notifyOrderStatus(
  prisma: PrismaClient,
  requestId: string,
  status: string,
  recipientId: string
) {
  await createNotification(
    prisma,
    recipientId,
    'Order Status Update',
    `Order status: ${status.replace(/_/g, ' ')}`,
    'order'
  );
}

export async function notifyNewReview(
  prisma: PrismaClient,
  tailorId: string,
  rating: number
) {
  await createNotification(
    prisma,
    tailorId,
    'New Review',
    `You recibed a ${rating}-star review from a customer.`,
    'review'
  );
}
