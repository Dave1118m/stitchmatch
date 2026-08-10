import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle, Scissors } from 'lucide-react';
import { RequestCardSkeleton } from '../components/SkeletonLoaders';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Under_Discussion: 'bg-blue-100 text-blue-800',
  Agreed: 'bg-green-100 text-green-800',
  In_Progress: 'bg-purple-100 text-purple-800',
  Completed: 'bg-gray-100 text-gray-800',
};

const statusColorsDark: Record<string, string> = {
  Pending: 'bg-yellow-900/30 text-yellow-300',
  Under_Discussion: 'bg-blue-900/30 text-blue-300',
  Agreed: 'bg-green-900/30 text-green-300',
  In_Progress: 'bg-purple-900/30 text-purple-300',
  Completed: 'bg-gray-700 text-gray-300',
};

const statusLabels: Record<string, string> = {
  Pending: 'Pending',
  Under_Discussion: 'Under Discussion',
  Agreed: 'Agreed',
  In_Progress: 'In Progress',
  Completed: 'Completed',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const isDark = useDarkMode();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const res = await requestsAPI.getAll(params);
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Welcome back, {user?.name}</p>
        </div>
        {user?.role === 'customer' && (
          <Link to="/tailors" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" /><span>New Request</span>
          </Link>
        )}
      </div>

      {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {['Pending', 'Under_Discussion', 'In_Progress', 'Completed'].map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(filter === status ? '' : status); loadRequests(); }}
            className={`card text-center p-4 hover:shadow-md transition-shadow ${filter === status ? 'ring-2 ring-primary-500' : ''}`}
          >
            <div className={`text-2xl font-bold ${status === 'Completed' ? 'text-green-600' : 'text-primary-600'}`}>
              {requests.filter((r: any) => r.status === status).length}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{statusLabels[status]}</div>
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <Scissors className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
          <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No requests yet</h3>
          {user?.role === 'customer' ? (
            <Link to="/tailors" className="btn-primary mt-4 inline-block">Find a Tailor</Link>
          ) : (
            <p className={isDark ? 'text-gray-500 mt-2' : 'text-gray-400 mt-2'}>You'll see customer requests here</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <Link key={request.id} to={`/requests/${request.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-primary-100'} rounded-full flex items-center justify-center`}>
                    <Scissors className={`h-6 w-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.garmentType}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.role === 'customer' ? `Tailor: ${request.tailor.name}` : `Customer: ${request.customer.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? statusColorsDark[request.status] : statusColors[request.status]}`}>
                    {statusLabels[request.status]}
                  </span>
                  <div className={`flex items-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-xs">{request.conversation?._count?.messages || 0}</span>
                  </div>
                </div>
              </div>
              {request.deadline && (
                <div className={`mt-2 flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
                </div>
              )}
              {/* Agreement Status */}
              {request.status === 'Under_Discussion' && (
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Agreement Status:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`flex items-center ${request.customerConfirmed ? 'text-green-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        You
                      </span>
                      <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>/</span>
                      <span className={`flex items-center ${request.tailorConfirmed ? 'text-green-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Tailor
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}