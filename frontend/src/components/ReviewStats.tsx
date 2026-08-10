import { useDarkMode } from '../hooks/useDarkMode';
import { Star } from 'lucide-react';

interface ReviewStatsProps {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

export default function ReviewStats({ averageRating, totalReviews, distribution }: ReviewStatsProps) {
  const isDark = useDarkMode();

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : (isDark ? 'text-gray-600' : 'text-gray-300')}`}
              />
            ))}
          </div>
          <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution?.[star] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center text-sm">
                <span className={`w-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{star}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                <div className={`flex-1 h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mx-2`}>
                  <div
                    className="h-2 bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={`w-8 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}