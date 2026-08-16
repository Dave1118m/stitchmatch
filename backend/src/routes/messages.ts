import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { notifyNewMessage } from '../helpers/notificationHelper';

const router = Router();

// Get messages for a conversation
router.get('/conversation/:conversationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { conversationId } = req.params;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.userId !== conversation.customerId && req.userId !== conversation.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
        replyTo: { select: { id: true, content: true, messageType: true, sender: { select: { name: true } } } },
        reactions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message to a conversation
router.post('/conversation/:conversationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { conversationId } = req.params;
    const { messageType, content, fileName, fileSize, replyToId } = req.body;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.userId !== conversation.customerId && req.userId !== conversation.tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!content && messageType === 'text') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId!,
        messageType: messageType || 'text',
        content,
        fileName,
        fileSize: fileSize ? BigInt(fileSize) : null,
        replyToId,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
        replyTo: { select: { id: true, content: true, messageType: true, sender: { select: { name: true } } } },
        reactions: true,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', message);
    }

    // Notify recipient
    const recipientId = req.userId === conversation.customerId ? conversation.tailorId : conversation.customerId;
    await notifyNewMessage(prisma, conversationId, req.userId!, recipientId);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit a message
router.put('/conversation/:conversationId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { conversationId, messageId } = req.params;
    const { content } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.userId) return res.status(403).json({ error: 'You can only edit your own messages' });
    if (message.deletedAt) return res.status(400).json({ error: 'Cannot edit deleted message' });
    if (message.messageType !== 'text') return res.status(400).json({ error: 'Only text messages can be edited' });

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
        replyTo: { select: { id: true, content: true, messageType: true, sender: { select: { name: true } } } },
        reactions: true,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_edited', updatedMessage);
    }

    res.json({ message: updatedMessage });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/conversation/:conversationId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { conversationId, messageId } = req.params;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.userId) return res.status(403).json({ error: 'You can only delete your own messages' });

    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: 'This message was deleted' },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_deleted', { messageId, deletedAt: deletedMessage.deletedAt });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// React to a message
router.post('/conversation/:conversationId/messages/:messageId/react', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Toggle reaction
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId: req.userId, emoji }
    });

    let reaction;
    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      reaction = await prisma.messageReaction.create({
        data: { messageId, userId: req.userId!, emoji }
      });
    }

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
        replyTo: { select: { id: true, content: true, messageType: true, sender: { select: { name: true } } } },
        reactions: true,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_reacted', updatedMessage);
    }

    res.json({ message: updatedMessage });
  } catch (error) {
    console.error('React message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark messages as read by requestId or conversationId
router.put('/:requestId/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;

    // Find conversation by requestId or id
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { requestId },
          { id: requestId },
        ],
      },
    });

    if (conversation) {
      await prisma.message.updateMany({
        where: {
          conversationId: conversation.id,
          senderId: { not: req.userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all conversations for current user
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { customerId: req.userId },
          { tailorId: req.userId },
        ],
      },
      include: {
        customer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        tailor: {
          select: { id: true, name: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Count unread messages for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: req.userId },
            readAt: null,
          },
        });

        const otherUser = req.userId === conv.customerId
          ? conv.tailor
          : conv.customer;

        return {
          id: conv.id,
          requestId: conv.requestId,
          otherUser,
          lastMessage: conv.messages[0] || {
            content: 'No messages yet',
            createdAt: conv.createdAt,
          },
          unreadCount,
        };
      })
    );

    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new conversation (customer starting chat with tailor)
router.post('/conversations', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tailorId } = req.body;

    if (!tailorId) {
      return res.status(400).json({ error: 'Tailor ID is required' });
    }

    // Check if tailor exists and is approved
    const tailor = await prisma.tailor.findUnique({
      where: { id: tailorId },
      include: { user: true },
    });

    if (!tailor || tailor.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Tailor not found or not approved' });
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        customerId: req.userId,
        tailorId,
      },
    });

    if (existingConversation) {
      return res.json({ conversation: existingConversation });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        customerId: req.userId!,
        tailorId,
      },
      include: {
        customer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        tailor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Start direct conversation with any user
router.post('/admin/direct', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target User ID is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    // Find existing conversation between admin and target user
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { customerId: req.userId, tailorId: targetUserId },
          { customerId: targetUserId, tailorId: req.userId },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: req.userId!,
          tailorId: targetUserId,
        },
      });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Admin direct conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;