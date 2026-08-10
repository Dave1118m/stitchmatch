import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { tailorsAPI } from '../lib/api';
import PortfolioGallery from '../components/PortfolioGallery';
import { User, Scissors, Save, Image, Plus, Trash2 } from 'lucide-react';

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

export default function Profile() {
  const { user, updateUser } = useAuth();
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
    portfolioImages: [] as string[],
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [portfolioMessage, setPortfolioMessage] = useState('');

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
        basePricingMin: user.tailor.basePricingMin?.toString() || '',
        basePricingMax: user.tailor.basePricingMax?.toString() || '',
        portfolioImages: safeArray(user.tailor.portfolioImages),
      });
    }
  }, [user]);

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

  const addPortfolio = () => {
    if (portfolioInput) {
      const list = safeArray(tailorForm.portfolioImages);
      setTailorForm({ ...tailorForm, portfolioImages: [...list, portfolioInput] });
      setPortfolioInput('');
    }
  };

  const addPortfolioItem = async () => {
    if (!portfolioInput) return;
    setSaving(true);
    setPortfolioMessage('');
    try {
      const res = await tailorsAPI.addPortfolio({
        imageUrl: portfolioInput,
        title: portfolioTitle,
        description: portfolioDescription,
      });
      setTailorForm({ ...tailorForm, portfolioImages: safeArray(res.data.portfolio) });
      setPortfolioInput('');
      setPortfolioTitle('');
      setPortfolioDescription('');
      setPortfolioMessage('Image added to portfolio!');
    } catch (err: any) {
      setPortfolioMessage(err.response?.data?.error || 'Failed to add image');
    } finally {
      setSaving(false);
    }
  };

  const removePortfolioItem = async (index: number) => {
    try {
      const res = await tailorsAPI.removePortfolio(index);
      setTailorForm({ ...tailorForm, portfolioImages: safeArray(res.data.portfolio) });
    } catch (err: any) {
      setPortfolioMessage(err.response?.data?.error || 'Failed to remove image');
    }
  };

  const isDark = useDarkMode();

  const currentSpecialties = safeArray(tailorForm.specialties);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile Settings</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
          {message}
        </div>
      )}

      {/* Basic Profile */}
      <div className="card mb-6">
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
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Avatar URL</label>
            <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
            <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>

      {/* Tailor Profile */}
      {user?.role === 'tailor' && (
        <div className="card mb-6">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Min Price ($)</label>
                <input type="number" value={tailorForm.basePricingMin} onChange={(e) => setTailorForm({ ...tailorForm, basePricingMin: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Max Price ($)</label>
                <input type="number" value={tailorForm.basePricingMax} onChange={(e) => setTailorForm({ ...tailorForm, basePricingMax: e.target.value })} className="input-field" />
              </div>
            </div>
            {/* Portfolio Management */}
            <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
              <h3 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Image className="h-5 w-5 mr-2 text-primary-600" /> Portfolio Management
              </h3>

              {portfolioMessage && (
                <div className={`mb-3 p-2 rounded text-sm ${portfolioMessage.includes('success') ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
                  {portfolioMessage}
                </div>
              )}

              {/* Current Portfolio */}
              {tailorForm.portfolioImages.length > 0 && (
                <div className="mb-4">
                  <PortfolioGallery
                    items={tailorForm.portfolioImages}
                    editable
                    onDelete={removePortfolioItem}
                  />
                </div>
              )}

              {/* Add New Portfolio Item */}
              <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg space-y-3`}>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Add New Image</p>
                <div>
                  <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Image URL *</label>
                  <input
                    value={portfolioInput}
                    onChange={(e) => setPortfolioInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Title</label>
                  <input
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    placeholder="e.g. Custom Navy Suit"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Description</label>
                  <input
                    value={portfolioDescription}
                    onChange={(e) => setPortfolioDescription(e.target.value)}
                    placeholder="e.g. Three-piece suit with silk lining"
                    className="input-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPortfolioItem}
                  disabled={saving || !portfolioInput}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{saving ? 'Adding...' : 'Add to Portfolio'}</span>
                </button>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
              <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Tailor Profile'}</span>
            </button>
          </form>
        </div>
      )}

      <div className={`card text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>Role: <span className={`font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.role}</span></p>
        <p>Member since: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}