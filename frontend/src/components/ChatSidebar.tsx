import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../lib/api';
import { MessageSquare, X, Search } from 'lucide-react';

interface Conversation {
  id: string;
  requestId: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

export default function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] ${
          isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-slate-100/90 border-slate-200/90'
        } shadow-2xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:w-full lg:h-full lg:shadow-none lg:rounded-2xl lg:border ${
          isDark ? 'lg:border-slate-700/60' : 'lg:border-slate-200/90'
        } flex flex-col overflow-hidden p-2 sm:p-3`}
      >
        {/* Header */}
        <div className={`p-3 border-b ${isDark ? 'border-slate-700/60' : 'border-slate-200/80'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Messages
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-white text-slate-600'} lg:hidden`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className={`relative ${isDark ? 'bg-slate-800/80 border border-slate-700/60' : 'bg-white border border-slate-200/80 shadow-2xs'} rounded-xl`}>
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 bg-transparent border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm ${
                isDark ? 'text-white placeholder-gray-400' : 'text-slate-900 placeholder-slate-500'
              }`}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto mt-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start a conversation with a tailor</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <Link
                  key={conv.id}
                  to={`/messages/${conv.id}`}
                  onClick={() => onClose()}
                  className={`block p-3 rounded-xl transition-all ${
                    location.pathname === `/messages/${conv.id}`
                      ? (isDark ? 'bg-slate-800 text-white border border-slate-700/80 shadow-xs' : 'bg-purple-600 text-white shadow-md')
                      : (isDark ? 'hover:bg-slate-800/50 text-gray-300' : 'hover:bg-white/80 text-slate-700 hover:shadow-2xs')
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold`}>
                      {conv.otherUser.avatarUrl ? (
                        <img
                          src={conv.otherUser.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        conv.otherUser.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {conv.otherUser.name}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`text-sm truncate mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {conv.lastMessage.content}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="flex-shrink-0 h-5 w-5 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
