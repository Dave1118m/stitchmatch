import { useDarkMode } from '../hooks/useDarkMode';
import { Star, User } from 'lucide-react';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    feedback?: string | null;
    tailorReply?: string | null;
    replyAt?: string | null;
    createdAt: string;
    customer: {
      id: string;
      name: string;
      avatarUrl?: string | null;
    };
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const isDark = useDarkMode();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center flex-shrink-0`}>
          {review.customer.avatarUrl ? (
            <img src={review.customer.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{review.customer.name}</span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(review.createdAt)}</span>
          </div>
          <div className="flex items-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : (isDark ? 'text-gray-600' : 'text-gray-300')}`}
              />
            ))}
          </div>
          {review.feedback && (
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{review.feedback}</p>
          )}
          {review.tailorReply && (
            <div className={`mt-3 ml-4 p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border-l-2 border-primary-500`}>
              <p className={`text-xs font-medium text-primary-600 mb-1`}>Tailor's Reply</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{review.tailorReply}</p>
              {review.replyAt && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(review.replyAt)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}