import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { messagesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { getSocket, joinConversationRoom, leaveConversationRoom, sendTyping } from '../lib/socket';
import { ArrowLeft, Send, Menu } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    loadMessages();
    joinConversationRoom(conversationId);

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('new_message', (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      leaveConversationRoom(conversationId);
      socket.off('connect_error');
      socket.off('new_message');
      socket.off('user_typing');
      sendTyping(conversationId, false);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await messagesAPI.getByConversation(conversationId!);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await messagesAPI.sendToConversation(conversationId!, { content: newMessage });
      setNewMessage('');
      sendTyping(conversationId!, false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    sendTyping(conversationId!, value.length > 0);
  };

  const otherUser = messages.find((m) => m.senderId !== user?.id);
  const isDark = useDarkMode();

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 lg:gap-6">
      {/* Chat Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0 h-full">
        <ChatSidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full rounded-2xl border p-4 sm:p-6 ${
        isDark ? 'chat-wallpaper border-gray-800/90 shadow-xl' : 'bg-slate-100/90 border-slate-200/90 shadow-sm'
      } min-w-0 overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center space-x-3 sm:space-x-4 pb-3 mb-3 border-b ${
          isDark ? 'border-gray-800/80 bg-black/40 backdrop-blur-md -mx-4 -mt-4 px-4 pt-4 rounded-t-2xl' : 'border-slate-200/80'
        }`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-xl lg:hidden transition-colors ${
              isDark ? 'hover:bg-gray-800/80 text-gray-300' : 'hover:bg-white text-slate-600'
            }`}
            title="Open conversations"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate('/messages')}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-gray-800/80 text-gray-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'
            }`}
            title="Back to conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className={`font-bold text-base sm:text-lg leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {otherUser?.sender?.name ? `Chat with ${otherUser.sender.name}` : 'Chat'}
            </h2>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Conversation #{conversationId?.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-1 py-2 mb-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className={`text-center py-20 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
                  msg.senderId === user?.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs'
                    : (isDark ? 'bg-gray-900/95 text-gray-100 rounded-tl-xs border border-gray-700/80 backdrop-blur-xs' : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/80 shadow-xs')
                }`}>
                  {msg.senderId !== user?.id && (
                    <p className={`text-xs font-bold mb-1 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{msg.sender.name}</p>
                  )}
                  {msg.messageType === 'image' ? (
                    <img src={msg.content} alt="Shared" className="max-w-full rounded-xl" />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className={`text-[11px] mt-1.5 text-right ${msg.senderId === user?.id ? 'text-purple-200' : (isDark ? 'text-gray-400' : 'text-slate-400')}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          {typingUsers.size > 0 && (
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-400'} italic`}>Someone is typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className={`pt-3 border-t flex items-center space-x-3 ${isDark ? 'border-gray-800/80 bg-black/40 backdrop-blur-md -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl' : 'border-slate-200/80'}`}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-5 py-3 rounded-xl flex items-center justify-center shadow-md disabled:opacity-50">
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>

      {/* Mobile Chat Sidebar */}
      {sidebarOpen && (
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}