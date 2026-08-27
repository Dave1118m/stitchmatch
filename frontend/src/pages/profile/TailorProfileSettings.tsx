import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useToast } from '../../context/ToastContext';
import { tailorsAPI, uploadsAPI } from '../../lib/api';
import ProductManager from '../../components/ProductManager';
import { validateImageFile } from '../../utils/fileValidation';
import { User, Scissors, Save, UploadCloud } from 'lucide-react';

const safeArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export default function TailorProfileSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [tailorForm, setTailorForm] = useState({
    bio: '',
    specialties: [] as string[],
    basePricingMin: '',
    basePricingMax: '',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const isDark = useDarkMode();

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      avatarUrl: user?.avatarUrl || '',
    });
    if (user?.role === 'tailor' && user.tailor) {
      setTailorForm({
        bio: user.tailor.bio || '',
        specialties: safeArray(user.tailor.specialties),
        basePricingMin: user.tailor.basePricingMin ? String(user.tailor.basePricingMin) : '',
        basePricingMax: user.tailor.basePricingMax ? String(user.tailor.basePricingMax) : '',
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = (e as React.DragEvent).dataTransfer.files[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0] || null;
    }
    if (!file) return;

    // Client-side pre-validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid image file');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      const newAvatarUrl = res.data.url;
      setForm({ ...form, avatarUrl: newAvatarUrl });
      
      await updateUser({ ...form, avatarUrl: newAvatarUrl });
      toast.success('Profile photo updated successfully!');
      setMessage('Profile photo updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to upload avatar image');
      setMessage('Failed to upload avatar image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateUser(form);
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTailorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await tailorsAPI.updateProfile(tailorForm);
      setMessage('Tailor profile updated successfully!');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to update tailor profile');
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    const list = safeArray(tailorForm.specialties);
    if (specialtyInput && !list.includes(specialtyInput)) {
      setTailorForm({ ...tailorForm, specialties: [...list, specialtyInput] });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (s: string) => {
    const list = safeArray(tailorForm.specialties);
    setTailorForm({ ...tailorForm, specialties: list.filter((x) => x !== s) });
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('profile.tailor.title')}</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
          {message}
        </div>
      )}

      {/* Top Section: Side-by-Side Basic Information and Tailor Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Card: Basic Information */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className={`font-semibold mb-4 flex items-center text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <User className="h-5 w-5 mr-2 text-primary-600" /> {t('profile.tailor.basicInfo')}
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.nameLabel')}</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.emailLabel')}</label>
                  <input value={user?.email} className="input-field opacity-75 cursor-not-allowed" disabled />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.phoneLabel')}</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('profile.tailor.location')}</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('profile.tailor.photo')}</label>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 overflow-hidden shrink-0 border-2 dark:border-gray-600 shadow-sm">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <label className="btn-secondary text-xs flex items-center space-x-1.5 cursor-pointer">
                    <UploadCloud className="h-4 w-4" />
                    <span>{uploadingAvatar ? t('common.loading') : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                  </label>
                </div>
                <input 
                  type="text" 
                  value={form.avatarUrl} 
                  onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} 
                  className="input-field text-xs" 
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 pt-2.5">
                <Save className="h-4 w-4" /><span>{saving ? t('common.loading') : t('common.save')}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Card: Tailor Profile */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className={`font-semibold mb-4 flex items-center text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Scissors className="h-5 w-5 mr-2 text-primary-600" /> {t('profile.tailor.title')}
            </h2>
            <form onSubmit={handleSaveTailorProfile} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Tailor Bio & Experience</label>
                <textarea 
                  value={tailorForm.bio} 
                  onChange={(e) => setTailorForm({ ...tailorForm, bio: e.target.value })}
                  className="input-field" 
                  rows={3} 
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Specialties & Tags</label>
                <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                  {safeArray(tailorForm.specialties).map((s) => (
                    <span key={s} className={`px-3 py-1 ${isDark ? 'bg-primary-950/60 text-primary-300 border border-primary-800/40' : 'bg-primary-50 text-primary-700 border border-primary-200'} rounded-lg text-xs font-semibold flex items-center shadow-2xs`}>
                      {s}
                      <button type="button" onClick={() => removeSpecialty(s)} className="ml-1.5 text-primary-500 hover:text-red-500 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input 
                    value={specialtyInput} 
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    className="input-field flex-1 text-xs" 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(); } }}
                  />
                  <button type="button" onClick={addSpecialty} className="btn-secondary text-xs px-4">Add</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Min Base Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tailorForm.basePricingMin}
                    onChange={(e) => setTailorForm({ ...tailorForm, basePricingMin: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Max Base Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tailorForm.basePricingMax}
                    onChange={(e) => setTailorForm({ ...tailorForm, basePricingMax: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 mt-4">
                <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Tailor Profile'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Section: Independent Full-Width Product Catalog & E-Commerce Showcase */}
      <div className="w-full">
        <div className={`card ${isDark ? 'bg-gray-800/90' : 'bg-white'} border border-slate-200/80 dark:border-gray-700 shadow-xl rounded-3xl p-6 sm:p-8`}>
          <ProductManager />
        </div>
      </div>
    </div>
  );
}
