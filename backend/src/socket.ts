import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function setupSocketHandlers(io: Server, prisma: PrismaClient) {
  // Authentication middleware for socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'fallback-secret') as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join request room for real-time chat
    socket.on('join_request', async (requestId: string) => {
      try {
        // Verify user has access to this request
        const serviceRequest = await prisma.serviceRequest.findUnique({
          where: { id: requestId },
        });

        if (!serviceRequest) {
          socket.emit('error', { message: 'Request not found' });
          return;
        }

        if (socket.userId !== serviceRequest.customerId && socket.userId !== serviceRequest.tailorId && socket.userRole !== 'admin') {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`request:${requestId}`);
        console.log(`User ${socket.userId} joined request room: ${requestId}`);
      } catch (error) {
        console.error('Join request error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // Leave request room
    socket.on('leave_request', (requestId: string) => {
      socket.leave(`request:${requestId}`);
    });

    // Join conversation room for real-time chat
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        if (socket.userId !== conversation.customerId && socket.userId !== conversation.tailorId && socket.userRole !== 'admin') {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation room: ${conversationId}`);
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing indicator
    socket.on('typing', ({ requestId, isTyping }) => {
      // Broadcast to both request room and conversation room (since requestId might be conversationId depending on where it's called)
      socket.to(`request:${requestId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping,
      });
      socket.to(`conversation:${requestId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping,
      });
    });

    // Mark messages as read
    socket.on('mark_read', async (requestId: string) => {
      try {
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
              senderId: { not: socket.userId },
              readAt: null,
            },
            data: { readAt: new Date() },
          });
        }

        io.to(`request:${requestId}`).emit('messages_read', {
          userId: socket.userId,
          requestId,
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
}