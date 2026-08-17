import { useState, useEffect } from 'react';
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
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tailor Settings</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Settings */}
        <div className="space-y-6 lg:col-span-1">
          {/* Basic Profile */}
          <div className="card">
            <h2 className={`font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <User className="h-5 w-5 mr-2 text-primary-600" /> Basic Information
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
                <input value={user?.email} className="input-field" disabled />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Profile Photo</label>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0 border dark:border-gray-600">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-full h-full text-gray-400 p-2" />
                    )}
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleAvatarUpload}
                    className={`flex-1 border-2 border-dashed rounded-lg p-2 text-center ${isDark ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} cursor-pointer transition-colors`}
                  >
                    <input type="file" id="avatarImageTailor" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <label htmlFor="avatarImageTailor" className="cursor-pointer flex items-center justify-center w-full">
                      <UploadCloud className={`h-5 w-5 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </span>
                    </label>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Or paste an image URL here..." 
                  value={form.avatarUrl} 
                  onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} 
                  className="input-field text-sm" 
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
                <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </form>
          </div>

          {/* Tailor Profile Details */}
          <div className="card">
            <h2 className={`font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Scissors className="h-5 w-5 mr-2 text-primary-600" /> Tailor Profile
            </h2>
            <form onSubmit={handleSaveTailorProfile} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Bio</label>
                <textarea value={tailorForm.bio} onChange={(e) => setTailorForm({ ...tailorForm, bio: e.target.value })}
                  className="input-field" rows={3} placeholder="Describe your expertise..." />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Specialties</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {safeArray(tailorForm.specialties).map((s) => (
                    <span key={s} className={`px-2 py-1 ${isDark ? 'bg-gray-700 text-primary-400' : 'bg-primary-50 text-primary-700'} rounded-full text-sm flex items-center`}>
                      {s}
                      <button type="button" onClick={() => removeSpecialty(s)} className="ml-1 text-primary-500 hover:text-primary-700">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input value={specialtyInput} onChange={(e) => setSpecialtyInput(e.target.value)}
                    placeholder="Add specialty" className="input-field flex-1" />
                  <button type="button" onClick={addSpecialty} className="btn-secondary">Add</button>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 mt-4">
                <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Tailor Profile'}</span>
              </button>
            </form>
          </div>

          <div className={`card text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Role: <span className={`font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.role}</span></p>
            <p>Member since: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Right Column: Product Manager */}
        <div className="lg:col-span-2">
          <div className={`card h-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <ProductManager />
          </div>
        </div>
      </div>
    </div>
  );
}
