import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('token');
    const socketUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/';
    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRequestRoom = (requestId: string) => {
  const s = getSocket();
  s.emit('join_request', requestId);
};

export const leaveRequestRoom = (requestId: string) => {
  const s = getSocket();
  s.emit('leave_request', requestId);
};

export const joinConversationRoom = (conversationId: string) => {
  const s = getSocket();
  s.emit('join_conversation', conversationId);
};

export const leaveConversationRoom = (conversationId: string) => {
  const s = getSocket();
  s.emit('leave_conversation', conversationId);
};

export const sendTyping = (requestId: string, isTyping: boolean) => {
  const s = getSocket();
  s.emit('typing', { requestId, isTyping });
};

export const markMessagesRead = (requestId: string) => {
  const s = getSocket();
  s.emit('mark_read', requestId);
};