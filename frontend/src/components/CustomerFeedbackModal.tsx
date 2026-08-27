import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { settingsAPI } from '../lib/api';
import { 
  MessageSquareHeart, X, Send, CheckCircle2, ChevronDown 
} from 'lucide-react';

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerFeedbackModal({ isOpen, onClose }: CustomerFeedbackModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDark = useDarkMode();

  const TOPIC_OPTIONS = [
    { value: 'general', label: t('feedback.categories.general') },
    { value: 'bug', label: t('feedback.categories.bug') },
    { value: 'feature', label: t('feedback.categories.feature') },
    { value: 'tailoring', label: t('feedback.categories.tailorExperience') },
    { value: 'ai_measurement', label: t('feedback.categories.fitting') },
  ];

  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter your feedback message');
      return;
    }

    setSubmitting(true);
    try {
      await settingsAPI.submitFeedback({
        category,
        message: message.trim(),
        email: email.trim() || user?.email || undefined,
        name: user?.name || undefined,
        userId: user?.id || undefined,
      });

      setSubmitted(true);
      toast.success(t('feedback.success'));
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Feedback submit error:', err);
      toast.error(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden transition-all transform scale-100 ${
          isDark 
            ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-gray-800 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${
          isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-100 bg-gray-50/80'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('feedback.title')}</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('feedback.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9 animate-bounce" />
            </div>
            <h4 className="text-xl font-bold">{t('common.success')}!</h4>
            <p className={`text-sm max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('feedback.success')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Topic Select Dropdown */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {t('feedback.categoryLabel')} *
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all appearance-none cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none pr-10 ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                >
                  {TOPIC_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className={isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Message Textarea */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {t('feedback.messageLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className={`w-full p-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none ${
                  isDark 
                    ? 'bg-gray-800/80 border-gray-700 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Contact Email (if guest or custom) */}
            {!user && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isDark 
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('feedback.submitBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
