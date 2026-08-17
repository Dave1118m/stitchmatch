import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const isDark = useDarkMode();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending':
        return t('dashboard.filterPending');
      case 'Under_Discussion':
        return t('dashboard.filterAccepted');
      case 'In_Progress':
        return t('dashboard.filterInProgress');
      case 'Completed':
        return t('dashboard.filterCompleted');
      default:
        return status;
    }
  };

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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('dashboard.title')}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('auth.signInTitle')}, {user?.name}</p>
        </div>
        {user?.role === 'customer' && (
          <Link to="/tailors" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" /><span>{t('dashboard.newRequestBtn')}</span>
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
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{getStatusLabel(status)}</div>
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
          <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('dashboard.emptyTitle')}</h3>
          {user?.role === 'customer' ? (
            <Link to="/tailors" className="btn-primary mt-4 inline-block">{t('home.getStartedBtn')}</Link>
          ) : (
            <p className={isDark ? 'text-gray-500 mt-2' : 'text-gray-400 mt-2'}>{t('dashboard.emptyDesc')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <Link key={request.id} to={`/requests/${request.id}`} className="card block hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${isDark ? 'bg-gray-700' : 'bg-primary-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Scissors className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.garmentType}</h3>
                    <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.role === 'customer' ? `${t('dashboard.card.tailor')}: ${request.tailor.name}` : `${t('dashboard.card.client')}: ${request.customer.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4 self-start sm:self-auto">
                  <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${isDark ? statusColorsDark[request.status] : statusColors[request.status]}`}>
                    {getStatusLabel(request.status)}
                  </span>
                  <div className={`flex items-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">{request.conversation?._count?.messages || 0}</span>
                  </div>
                </div>
              </div>
              {request.deadline && (
                <div className={`mt-2 flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{t('dashboard.card.deadline')}: {new Date(request.deadline).toLocaleDateString()}</span>
                </div>
              )}
              {/* Agreement Status */}
              {request.status === 'Under_Discussion' && (
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Agreement:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`flex items-center ${request.customerConfirmed ? 'text-green-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('dashboard.card.client')}
                      </span>
                      <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>/</span>
                      <span className={`flex items-center ${request.tailorConfirmed ? 'text-green-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('dashboard.card.tailor')}
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