import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { messagesAPI, uploadsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { getSocket, joinConversationRoom, leaveConversationRoom, sendTyping } from '../lib/socket';
import { ArrowLeft, Send, Menu, Paperclip, MoreHorizontal, Reply, Edit2, Trash2, Smile, X, Image as ImageIcon } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import { MessageListSkeleton } from '../components/SkeletonLoaders';

const playIncomingChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Graceful fallback
  }
};

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Telegram features state
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);

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
      if (message.senderId !== user?.id) {
        playIncomingChime();
      }
    });

    socket.on('message_edited', (updatedMsg: any) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    });

    socket.on('message_deleted', ({ messageId, deletedAt }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deletedAt, content: 'This message was deleted' } : m))
      );
    });

    socket.on('message_reacted', (updatedMsg: any) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
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
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_reacted');
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
      if (editingMessage) {
        await messagesAPI.editMessage(conversationId!, editingMessage.id, newMessage);
        setEditingMessage(null);
      } else {
        await messagesAPI.sendToConversation(conversationId!, {
          content: newMessage,
          replyToId: replyToMessage?.id,
        });
        setReplyToMessage(null);
      }
      setNewMessage('');
      sendTyping(conversationId!, false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadRes = await uploadsAPI.uploadImage(file);
      await messagesAPI.sendToConversation(conversationId!, {
        messageType: 'image',
        content: uploadRes.data.url,
        replyToId: replyToMessage?.id,
      });
      setReplyToMessage(null);
    } catch (err: any) {
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Delete this message?')) {
      try {
        await messagesAPI.deleteMessage(conversationId!, messageId);
      } catch (err: any) {
        alert('Failed to delete message');
      }
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await messagesAPI.reactToMessage(conversationId!, messageId, emoji);
      setShowReactionsFor(null);
    } catch (err: any) {
      alert('Failed to react');
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
            <MessageListSkeleton />
          ) : messages.length === 0 ? (
            <div className={`text-center py-20 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              
              // Group reactions by emoji
              const reactionCounts = msg.reactions?.reduce((acc: any, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {});

              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => { setHoveredMessageId(null); setShowReactionsFor(null); }}
                >
                  {/* Hover Actions (Left of message if mine, right if theirs) */}
                  {hoveredMessageId === msg.id && !msg.deletedAt && (
                    <div className={`absolute top-0 ${isMine ? 'right-full mr-2' : 'left-full ml-2'} flex items-center bg-white dark:bg-gray-800 rounded-full shadow-md border dark:border-gray-700 px-2 py-1 space-x-1 z-10`}>
                      <button onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-yellow-500 transition-colors" title="React">
                        <Smile className="w-4 h-4" />
                      </button>
                      <button onClick={() => setReplyToMessage(msg)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-blue-500 transition-colors" title="Reply">
                        <Reply className="w-4 h-4" />
                      </button>
                      {isMine && msg.messageType === 'text' && (
                        <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.content); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-green-500 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isMine && (
                        <button onClick={() => handleDelete(msg.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reaction Picker Popup */}
                      {showReactionsFor === msg.id && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex space-x-1 bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-700 rounded-full px-2 py-1">
                          {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="hover:scale-125 transition-transform p-1">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[70%] px-2 py-1`}>
                    {!isMine && (
                      <p className={`text-[13px] font-bold mb-0.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{msg.sender.name}</p>
                    )}
                    
                    {/* Reply Context */}
                    {msg.replyTo && (
                      <div className={`mb-1 pl-2 border-l-2 text-xs opacity-75 ${isMine ? 'border-primary-400' : 'border-gray-400'}`}>
                        <span className="font-bold">{msg.replyTo.sender.name}:</span> {msg.replyTo.messageType === 'image' ? '📸 Photo' : msg.replyTo.content?.slice(0, 50)}...
                      </div>
                    )}

                    {/* Message Content (No Backgrounds) */}
                    <div className={`relative ${msg.deletedAt ? 'italic opacity-50' : ''} ${isMine ? (isDark ? 'text-primary-300' : 'text-primary-700') : (isDark ? 'text-gray-300' : 'text-slate-800')}`}>
                      {msg.messageType === 'image' && !msg.deletedAt ? (
                        <img src={msg.content} alt="Shared" className="max-w-full rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-1" />
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      )}
                    </div>

                    {/* Reactions */}
                    {reactionCounts && Object.keys(reactionCounts).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <span key={emoji} onClick={() => handleReact(msg.id, emoji)} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors`}>
                            {emoji} {count as number > 1 && count}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <p className={`text-[10px] mt-1 flex items-center ${isMine ? 'justify-end' : 'justify-start'} ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {msg.isEdited && <span className="mr-1 italic">edited</span>}
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {typingUsers.size > 0 && (
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-400'} italic`}>Someone is typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`pt-3 border-t flex flex-col ${isDark ? 'border-gray-800/80 bg-black/40 backdrop-blur-md -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl' : 'border-slate-200/80'}`}>
          {/* Reply/Edit Preview */}
          {(replyToMessage || editingMessage) && (
            <div className="flex items-center justify-between bg-primary-50 dark:bg-gray-800/80 px-3 py-2 rounded-t-xl border-b dark:border-gray-700">
              <div className="text-sm truncate pr-4">
                <span className="font-bold text-primary-600 dark:text-primary-400 mr-2">
                  {editingMessage ? 'Editing message' : `Replying to ${replyToMessage.sender.name}`}
                </span>
                <span className="text-gray-600 dark:text-gray-400 italic">
                  {(editingMessage || replyToMessage).messageType === 'image' ? '📸 Photo' : (editingMessage || replyToMessage).content}
                </span>
              </div>
              <button 
                onClick={() => { setReplyToMessage(null); setEditingMessage(null); setNewMessage(''); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center space-x-2 mt-2">
            <div className="relative">
              <input type="file" id="chatImageUpload" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <label htmlFor="chatImageUpload" className={`p-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                {uploadingImage ? <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </label>
            </div>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Type your message..."
              className="input-field flex-1"
            />
            
            <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-4 py-2 sm:px-5 sm:py-3 rounded-xl flex items-center justify-center shadow-md disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Chat Sidebar */}
      {sidebarOpen && (
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}