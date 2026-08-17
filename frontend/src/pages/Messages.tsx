import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { messagesAPI, uploadsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { showBrowserNotification } from '../lib/pushNotifications';
import { getSocket, joinConversationRoom, leaveConversationRoom, sendTyping, markMessagesRead } from '../lib/socket';
import { ArrowLeft, Send, Menu, Paperclip, MoreHorizontal, Reply, Edit2, Trash2, Smile, X, Image as ImageIcon, Check, CheckCheck, ChevronDown, MessageSquare, Video } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import { MessageListSkeleton } from '../components/SkeletonLoaders';
import VideoCallModal from '../components/VideoCallModal';

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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Video Call State
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);

  // New Telegram features state
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  
  // UI Polish state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    loadMessages();
    joinConversationRoom(conversationId);

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('new_message', (message: any) => {
      setMessages((prev) => {
        if (message.senderId !== user?.id) {
           markMessagesRead(conversationId);
        }
        return [...prev, message];
      });
      if (message.senderId !== user?.id) {
        playIncomingChime();
        // Web Push Notification if document is hidden/backgrounded
        if (document.hidden) {
          showBrowserNotification(`New message from ${message.sender?.name || 'Tailor'}`, {
            body: message.messageType === 'image' ? '📸 Sent an image' : message.content,
          });
        }
        if (!showScrollBottom) {
          setTimeout(scrollToBottom, 100);
        }
      } else {
        setTimeout(scrollToBottom, 100);
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

    socket.on('messages_read', ({ userId, requestId }: any) => {
      if (userId !== user?.id && requestId === conversationId) {
        setMessages((prev) => prev.map(m => (!m.readAt && m.senderId === user?.id) ? { ...m, readAt: new Date() } : m));
      }
    });

    socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on('incoming_call', (data: any) => {
      console.log('Incoming video call received:', data);
      setIncomingCallData(data);
    });

    return () => {
      leaveConversationRoom(conversationId);
      socket.off('connect_error');
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_reacted');
      socket.off('messages_read');
      socket.off('user_typing');
      socket.off('incoming_call');
      sendTyping(conversationId, false);
    };
  }, [conversationId, user?.id, showScrollBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [loading]); // Only auto-scroll on initial load

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Show button if we are scrolled up more than 150px
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  const loadMessages = async () => {
    try {
      const res = await messagesAPI.getByConversation(conversationId!);
      setMessages(res.data.messages);
      // Mark read when opening chat
      markMessagesRead(conversationId!);
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
      scrollToBottom();
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
      scrollToBottom();
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

  let lastDate = '';
  let lastSenderId = '';
  let lastMessageTime = 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 lg:gap-6 relative">
      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors" onClick={() => setLightboxImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxImage} alt="Fullscreen" className="max-w-[95vw] max-h-[95vh] object-contain cursor-zoom-out" />
        </div>
      )}

      {/* Chat Sidebar - Shown inline on mobile if no conversationId, or fixed on desktop */}
      <div className={`${!conversationId ? 'w-full block' : 'hidden lg:block w-80'} flex-shrink-0 h-full`}>
        <ChatSidebar isOpen={true} onClose={() => setSidebarOpen(false)} isInline={!conversationId} />
      </div>

      {/* Main Chat Area - Hidden on mobile if no conversationId selected */}
      {conversationId ? (
        <div className={`flex-1 flex flex-col h-full rounded-2xl border p-3 sm:p-6 ${
          isDark ? 'chat-wallpaper border-gray-800/90 shadow-xl' : 'bg-slate-100/90 border-slate-200/90 shadow-sm'
        } min-w-0 overflow-hidden relative`}>
          
          {/* Header */}
          <div className={`flex items-center space-x-2 sm:space-x-4 pb-3 mb-3 border-b ${
            isDark ? 'border-gray-800/80 bg-black/40 backdrop-blur-md -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3 pt-3 sm:px-6 sm:pt-4 rounded-t-2xl' : 'border-slate-200/80 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3 pt-3 sm:px-6 sm:pt-4 rounded-t-2xl bg-white/60 backdrop-blur-md'
          }`}>
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-xl lg:hidden transition-colors ${
                isDark ? 'hover:bg-gray-800/80 text-gray-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Open conversations"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/messages')}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-gray-800/80 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              title="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 flex justify-between items-center min-w-0">
              <div className="min-w-0">
                <h2 className={`font-bold text-sm sm:text-lg leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {otherUser?.sender?.name ? `Chat with ${otherUser.sender.name}` : 'Chat'}
                </h2>
                {/* Typing indicator in header for realism */}
                {typingUsers.size > 0 ? (
                  <p className="text-xs text-primary-500 dark:text-primary-400 italic">typing...</p>
                ) : (
                  <p className={`text-[10px] sm:text-xs truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    Conversation #{conversationId?.slice(0, 8)}
                  </p>
                )}
              </div>

              {/* 1-on-1 Live Video Fitting Call Button */}
              {otherUser?.sender?.id && (
                <button
                  onClick={() => setVideoCallActive(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  title="Start 1-on-1 Virtual Fitting Video Call"
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Video Fitting Call</span>
                </button>
              )}
            </div>
          </div>

        {/* Scroll To Bottom Button */}
        {showScrollBottom && (
          <button 
            onClick={scrollToBottom}
            className="absolute bottom-24 right-8 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-xl transition-transform hover:scale-110 z-20"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        {/* Messages */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-1 py-2 mb-3 space-y-3"
        >
          {loading ? (
            <MessageListSkeleton />
          ) : messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full text-center ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              <Smile className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Say Hello!</p>
              <p className="text-sm mt-1">Start the conversation by sending a message.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.senderId === user?.id;
              
              // Date logic
              const msgDate = new Date(msg.createdAt);
              const dateStr = msgDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
              const showDate = dateStr !== lastDate;
              if (showDate) lastDate = dateStr;

              // Sender Grouping logic (within 5 minutes)
              const msgTime = msgDate.getTime();
              const showSender = !isMine && (msg.senderId !== lastSenderId || msgTime - lastMessageTime > 5 * 60 * 1000 || showDate);
              
              lastSenderId = msg.senderId;
              lastMessageTime = msgTime;

              // Group reactions by emoji
              const reactionCounts = msg.reactions?.reduce((acc: any, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {});

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-6">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm border ${isDark ? 'bg-gray-800/80 border-gray-700 text-gray-300 backdrop-blur-sm' : 'bg-white border-slate-200 text-slate-500'}`}>
                        {dateStr}
                      </span>
                    </div>
                  )}

                  <div 
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${!showSender && !isMine ? '-mt-1.5' : ''}`}
                  >
                    <div 
                      className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 group relative`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => { setHoveredMessageId(null); setShowReactionsFor(null); }}
                    >
                      {hoveredMessageId === msg.id && !msg.deletedAt && (
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? 'right-full pr-1 sm:pr-3' : 'left-full pl-1 sm:pl-3'} z-10 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-md border dark:border-gray-700 px-2 py-1 space-x-1">
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
                              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex space-x-1.5 bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-700 rounded-full px-3 py-2">
                                {EMOJIS.map(emoji => (
                                  <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="hover:scale-125 transition-transform p-1 text-lg">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5`}>
                      {showSender && (
                        <p className={`text-[13px] font-bold mb-0.5 ml-1 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{msg.sender.name}</p>
                      )}
                      
                      {/* Reply Context */}
                      {msg.replyTo && (
                        <div className={`mb-1 pl-2 border-l-2 text-xs opacity-75 cursor-pointer hover:opacity-100 transition-opacity ${isMine ? 'border-primary-400' : 'border-gray-400'}`}>
                          <span className="font-bold">{msg.replyTo.sender.name}:</span> {msg.replyTo.messageType === 'image' ? '📸 Photo' : msg.replyTo.content?.slice(0, 50)}...
                        </div>
                      )}

                      {/* Message Content (No Backgrounds) */}
                      <div className={`relative ${msg.deletedAt ? 'italic opacity-50' : ''} ${isMine ? (isDark ? 'text-primary-300' : 'text-primary-800') : (isDark ? 'text-gray-300' : 'text-slate-800')}`}>
                        {msg.messageType === 'image' && !msg.deletedAt ? (
                          <img 
                            src={msg.content} 
                            alt="Shared" 
                            className="max-w-full rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-1 cursor-zoom-in hover:opacity-90 transition-opacity" 
                            onClick={() => setLightboxImage(msg.content)}
                          />
                        ) : (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                        )}
                      </div>

                      {/* Reactions */}
                      {reactionCounts && Object.keys(reactionCounts).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <span key={emoji} onClick={() => handleReact(msg.id, emoji)} className={`text-[12px] px-2 py-0.5 rounded-full cursor-pointer border ${isDark ? 'bg-gray-800/80 border-gray-700 hover:bg-gray-700' : 'bg-white border-slate-200 hover:bg-slate-50'} shadow-sm transition-colors`}>
                              {emoji} {count as number > 1 && <span className="font-bold ml-1 text-gray-500">{count as number}</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata (Time & Read Receipts) */}
                      <div className={`text-[11px] mt-1 flex items-center space-x-1 ${isMine ? 'justify-end' : 'justify-start'} ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                        {msg.isEdited && <span className="italic">edited</span>}
                        <span>{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        
                        {/* Read Receipts */}
                        {isMine && (
                          <span className={`ml-1 ${msg.readAt ? 'text-blue-500 dark:text-blue-400' : ''}`}>
                            {msg.readAt ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Animated Typing Indicator */}
          {typingUsers.size > 0 && (
             <div className={`flex justify-start`}>
               <div className={`max-w-[85%] px-4 py-3`}>
                 <div className="flex space-x-1 items-center h-4">
                   <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className={`pt-3 border-t flex flex-col ${isDark ? 'border-gray-800/80 bg-black/40 backdrop-blur-md -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl' : 'border-slate-200/80'}`}>
          {/* Reply/Edit Preview */}
          {(replyToMessage || editingMessage) && (
            <div className="flex items-center justify-between bg-primary-50/50 dark:bg-gray-800/80 px-4 py-3 rounded-t-xl border-b dark:border-gray-700">
              <div className="text-sm truncate pr-4 border-l-2 border-primary-500 pl-3">
                <span className="font-bold text-primary-600 dark:text-primary-400 block mb-0.5">
                  {editingMessage ? 'Edit Message' : `Reply to ${replyToMessage.sender.name}`}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {(editingMessage || replyToMessage).messageType === 'image' ? '📸 Photo' : (editingMessage || replyToMessage).content}
                </span>
              </div>
              <button 
                onClick={() => { setReplyToMessage(null); setEditingMessage(null); setNewMessage(''); }}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center space-x-2 mt-2">
            <div className="relative">
              <input type="file" id="chatImageUpload" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <label htmlFor="chatImageUpload" className={`p-2.5 rounded-full cursor-pointer transition-colors flex items-center justify-center ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                {uploadingImage ? <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </label>
            </div>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Message..."
              className="input-field flex-1 rounded-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary-500/50"
            />
            
            <button type="submit" disabled={!newMessage.trim()} className="btn-primary w-11 h-11 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 hover:scale-105 transition-transform flex-shrink-0">
              <Send className="h-5 w-5 -ml-1" />
            </button>
          </form>
        </div>
      </div>
    ) : (
      <div className={`hidden lg:flex flex-1 flex-col items-center justify-center h-full rounded-2xl border p-8 text-center ${
        isDark ? 'bg-gray-800/40 border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-primary-950/40 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Messages</h3>
        <p className="text-sm max-w-sm">Select a conversation from the list on the left to view past messages and chat in real-time.</p>
      </div>
    )}

      {/* Mobile Chat Sidebar Drawer when user clicks menu */}
      {sidebarOpen && (
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* 1-on-1 Live Video Fitting Call WebRTC Modal */}
      {(videoCallActive || incomingCallData) && (
        <VideoCallModal
          socket={getSocket()}
          currentUserId={user?.id!}
          currentUserName={user?.name || 'Customer'}
          currentUserAvatar={user?.avatarUrl}
          targetUserId={incomingCallData ? incomingCallData.from : (otherUser?.sender?.id || '')}
          targetUserName={incomingCallData ? incomingCallData.fromName : (otherUser?.sender?.name || 'Tailor')}
          targetUserAvatar={incomingCallData ? incomingCallData.fromAvatar : otherUser?.sender?.avatarUrl}
          conversationId={conversationId}
          isIncoming={!!incomingCallData}
          incomingSignal={incomingCallData?.signal}
          onClose={() => {
            setVideoCallActive(false);
            setIncomingCallData(null);
          }}
        />
      )}
    </div>
  );
}