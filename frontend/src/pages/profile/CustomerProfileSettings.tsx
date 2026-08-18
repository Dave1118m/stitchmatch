import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useToast } from '../../context/ToastContext';
import { uploadsAPI, measurementsAPI } from '../../lib/api';
import { validateImageFile } from '../../utils/fileValidation';
import { 
  User, 
  Save, 
  UploadCloud, 
  Ruler, 
  Sparkles, 
  CheckCircle2, 
  Edit3, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import ThreeBodyAvatar from '../../components/ThreeBodyAvatar';

export default function CustomerProfileSettings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const isDark = useDarkMode();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');

  // Measurement Vault State
  const [vaultMeasurement, setVaultMeasurement] = useState<any | null>(null);
  const [loadingVault, setLoadingVault] = useState(true);
  const [savingVault, setSavingVault] = useState(false);
  const [isEditingVault, setIsEditingVault] = useState(false);
  const [vaultForm, setVaultForm] = useState({
    chest: '98.0',
    waist: '84.0',
    hip: '102.0',
    inseam: '78.0',
    shoulderWidth: '44.0',
    armLength: '62.0',
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      avatarUrl: user?.avatarUrl || '',
    });
    loadVaultMeasurement();
  }, [user]);

  const loadVaultMeasurement = async () => {
    setLoadingVault(true);
    try {
      const res = await measurementsAPI.getVaultLatest();
      if (res.data?.measurement) {
        const m = res.data.measurement;
        setVaultMeasurement(m);
        setVaultForm({
          chest: m.chest ? String(m.chest) : '98.0',
          waist: m.waist ? String(m.waist) : '84.0',
          hip: m.hip ? String(m.hip) : '102.0',
          inseam: m.inseam ? String(m.inseam) : '78.0',
          shoulderWidth: m.shoulderWidth ? String(m.shoulderWidth) : '44.0',
          armLength: m.armLength ? String(m.armLength) : '62.0',
        });
      }
    } catch (err) {
      console.error('Failed to load vault measurement:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = (e as React.DragEvent).dataTransfer.files[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0] || null;
    }
    if (!file) return;

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
      toast.success('Profile updated successfully!');
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to update profile');
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVault(true);
    try {
      const res = await measurementsAPI.updateVaultManual(vaultForm);
      setVaultMeasurement(res.data?.measurement || vaultForm);
      setIsEditingVault(false);
      toast.success('3D body measurements vault updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save vault measurements');
    } finally {
      setSavingVault(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Customer Profile & Measurements</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage your personal profile and saved 3D body measurement vault for 1-click orders.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-sm font-medium ${
          message.includes('success') 
            ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200') 
            : (isDark ? 'bg-red-950/40 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200')
        }`}>
          {message}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SAVED 3D BODY MEASUREMENTS VAULT */}
      {/* ========================================================= */}
      <div className="card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/80 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`font-bold text-base sm:text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>3D Body Measurements Vault</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  1-Click Ready
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Verified anatomical dimensions automatically applied to your bespoke tailoring orders.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingVault(!isEditingVault)}
            className="btn-secondary text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingVault ? 'Cancel' : 'Edit Dimensions'}</span>
          </button>
        </div>

        {isEditingVault ? (
          /* Editing Form */
          <form onSubmit={handleSaveVault} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Chest (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.chest}
                  onChange={(e) => setVaultForm({ ...vaultForm, chest: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Natural Waist (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.waist}
                  onChange={(e) => setVaultForm({ ...vaultForm, waist: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Hip & Seat (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.hip}
                  onChange={(e) => setVaultForm({ ...vaultForm, hip: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Inseam (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.inseam}
                  onChange={(e) => setVaultForm({ ...vaultForm, inseam: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Shoulders (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.shoulderWidth}
                  onChange={(e) => setVaultForm({ ...vaultForm, shoulderWidth: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Arm Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vaultForm.armLength}
                  onChange={(e) => setVaultForm({ ...vaultForm, armLength: e.target.value })}
                  className="input-field text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingVault(false)}
                className="btn-secondary text-xs px-4 py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingVault}
                className="btn-primary text-xs px-5 py-2 font-bold shadow-md"
              >
                {savingVault ? 'Saving...' : 'Save Vault Dimensions'}
              </button>
            </div>
          </form>
        ) : (
          /* View Mode: Metrics Cards Grid */
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Chest', val: vaultForm.chest, sub: `${(Number(vaultForm.chest) / 2.54).toFixed(1)} in` },
                { label: 'Waist', val: vaultForm.waist, sub: `${(Number(vaultForm.waist) / 2.54).toFixed(1)} in` },
                { label: 'Hip & Seat', val: vaultForm.hip, sub: `${(Number(vaultForm.hip) / 2.54).toFixed(1)} in` },
                { label: 'Inseam', val: vaultForm.inseam, sub: `${(Number(vaultForm.inseam) / 2.54).toFixed(1)} in` },
                { label: 'Shoulders', val: vaultForm.shoulderWidth, sub: `${(Number(vaultForm.shoulderWidth) / 2.54).toFixed(1)} in` },
                { label: 'Arm Length', val: vaultForm.armLength, sub: `${(Number(vaultForm.armLength) / 2.54).toFixed(1)} in` },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border text-center ${
                    isDark ? 'bg-gray-800/60 border-gray-700/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {item.label}
                  </p>
                  <p className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.val} <span className="text-xs font-normal text-gray-400">cm</span>
                  </p>
                  <p className="text-[10px] text-gray-400">{item.sub}</p>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-xl flex items-center justify-between text-xs ${
              isDark ? 'bg-purple-950/20 border border-purple-900/40 text-purple-300' : 'bg-purple-50 border border-purple-100 text-purple-800'
            }`}>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Saved measurements automatically pre-fill new tailor service requests for rapid 1-click commissioning.</span>
              </div>
              {vaultMeasurement?.createdAt && (
                <span className="text-[10px] opacity-70 hidden sm:inline">
                  Last calibrated: {new Date(vaultMeasurement.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. BASIC PROFILE INFORMATION */}
      {/* ========================================================= */}
      <div className="card">
        <h2 className={`font-bold text-base sm:text-lg mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <User className="h-5 w-5 mr-2 text-primary-600" /> Basic Account Information
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Full Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field text-sm" required />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Email (Read-Only)</label>
              <input value={user?.email} className="input-field text-sm opacity-75 cursor-not-allowed" disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Phone Number</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="input-field text-sm" />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>City / Region</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="New York, NY" className="input-field text-sm" />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Profile Photo</label>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleAvatarUpload}
                className={`flex-1 border-2 border-dashed rounded-2xl p-3 text-center ${isDark ? 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/80' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'} cursor-pointer transition-colors`}
              >
                <input type="file" id="avatarImage" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <label htmlFor="avatarImage" className="cursor-pointer flex items-center justify-center space-x-2 w-full">
                  <UploadCloud className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    {uploadingAvatar ? 'Uploading...' : 'Click to Upload Photo or Drag and Drop'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-md">
              <Save className="h-4 w-4" /><span>{saving ? 'Saving...' : 'Save Profile Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
