import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { productsAPI, uploadsAPI } from '../lib/api';
import { validateImageFile } from '../utils/fileValidation';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  Image as ImageIcon, 
  UploadCloud, 
  X, 
  Check, 
  Tag, 
  Palette, 
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';

export default function ProductManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isDark = useDarkMode();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    images: [] as { url: string; isPrimary: boolean }[],
    colors: [] as { name: string; hexCode: string }[],
    options: [] as { name: string; values: string[] }[],
  });

  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#1e293b');
  const [optName, setOptName] = useState('');
  const [optVals, setOptVals] = useState('');

  useEffect(() => {
    if (user?.id) fetchProducts();
  }, [user?.id]);

  const fetchProducts = async () => {
    setFetching(true);
    try {
      const res = await productsAPI.getByTailor(user!.id);
      setProducts(res.data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      images: p.images || [],
      colors: p.colors || [],
      options: p.options ? p.options.map((o: any) => ({
        ...o,
        values: typeof o.values === 'string' ? JSON.parse(o.values) : o.values
      })) : [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      description: '',
      images: [],
      colors: [],
      options: [],
    });
    setColorName('');
    setColorHex('#1e293b');
    setOptName('');
    setOptVals('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
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
      toast.error(validation.error || 'Invalid product image');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, { url: res.data.url, isPrimary: prev.images.length === 0 }]
      }));
      toast.success('Product image uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index)
    }));
  };

  const handleAddColor = () => {
    if (!colorName.trim()) {
      toast.error('Please enter a color name (e.g., Midnight Blue)');
      return;
    }
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, { name: colorName.trim(), hexCode: colorHex }]
    }));
    setColorName('');
  };

  const handleRemoveColor = (index: number) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, idx) => idx !== index)
    }));
  };

  const handleAddOption = () => {
    if (!optName.trim() || !optVals.trim()) {
      toast.error('Please provide both an option name and values');
      return;
    }
    const parsedVals = optVals.split(',').map((s) => s.trim()).filter(Boolean);
    if (parsedVals.length === 0) return;

    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { name: optName.trim(), values: parsedVals }]
    }));
    setOptName('');
    setOptVals('');
  };

  const handleRemoveOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setLoading(true);
    try {
      if (editingProduct) {
        const payload = { ...form, basePrice: 0 };
        await productsAPI.update(editingProduct.id, payload);
        toast.success('Product updated successfully!');
      } else {
        if (form.colors.length > 0) {
          // Duplicate the product for each color
          for (const color of form.colors) {
            const payload = {
              ...form,
              name: `${form.name.trim()} - ${color.name}`,
              colors: [color],
              basePrice: 0,
            };
            await productsAPI.create(payload);
          }
          toast.success(`Created ${form.colors.length} color variants successfully!`);
        } else {
          const payload = { ...form, basePrice: 0 };
          await productsAPI.create(payload);
          toast.success('Product created successfully!');
        }
      }
      handleCloseModal();
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product removed');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  return (
    <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Package className="h-5 w-5" />
            </div>
            <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Product Catalog & Showcase
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              {products.length} {products.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Manage the bespoke garments and product styles displayed on your public tailor profile.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Product List Grid */}
      {fetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-48 rounded-2xl animate-pulse ${isDark ? 'bg-gray-800/60' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className={`p-8 sm:p-12 text-center rounded-2xl border border-dashed ${
          isDark ? 'border-gray-800 bg-gray-900/40' : 'border-slate-300 bg-slate-50/50'
        }`}>
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-gray-800 text-gray-500' : 'bg-white text-slate-400 shadow-sm'
          }`}>
            <Package className="w-7 h-7" />
          </div>
          <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            No products in your catalog yet
          </h4>
          <p className={`text-xs max-w-md mx-auto mb-5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Add suits, dresses, tuxedos, and bespoke attire to highlight your craftsmanship to prospective clients.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold inline-flex items-center space-x-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map((p) => {
            const primaryImg = p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url;
            return (
              <div
                key={p.id}
                className={`group rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg ${
                  isDark ? 'bg-gray-800/80 border-gray-700/80 hover:border-purple-500/50' : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                {/* Image Aspect Box */}
                <div className="aspect-[4/3] w-full bg-black/10 dark:bg-black/30 relative overflow-hidden">
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                      <span className="text-[10px] font-semibold">No Image</span>
                    </div>
                  )}

                  {/* Actions Bar Floating Overlay */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      title="Edit Product"
                      className="p-2 rounded-xl bg-white/90 dark:bg-gray-900/90 text-slate-800 dark:text-white shadow-md hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer backdrop-blur-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="Delete Product"
                      className="p-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all cursor-pointer backdrop-blur-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className={`font-bold text-sm sm:text-base leading-snug line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </h4>
                    {p.description && (
                      <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Colors & Options Badges */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    {p.colors && p.colors.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <Palette className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div className="flex items-center gap-1 overflow-hidden">
                          {p.colors.slice(0, 5).map((c: any, i: number) => (
                            <span
                              key={i}
                              title={c.name}
                              className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 flex-shrink-0"
                              style={{ backgroundColor: c.hexCode }}
                            />
                          ))}
                          {p.colors.length > 5 && (
                            <span className="text-[10px] text-gray-400 font-bold">
                              +{p.colors.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {p.options && p.options.length > 0 && (
                      <div className="flex items-center space-x-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <SlidersHorizontal className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {p.options.map((o: any) => o.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* POPUP MODAL: CREATE / EDIT PRODUCT */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
              isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-gray-800 bg-gray-950/50' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    {editingProduct ? 'Edit Product Item' : 'Create New Product Item'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {editingProduct ? 'Update product specifications and imagery' : 'Add a showcase item or customizable bespoke piece to your catalog'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body (Scrollable) */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Product Title */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bespoke 3-Piece Silk Lapel Tuxedo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Description & Fabric Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Handcrafted with Super 150s virgin wool, full canvas chest piece, and bespoke hand-stitched silk lining."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field text-sm leading-relaxed"
                />
              </div>

              {/* Image Upload Gallery */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Product Photography
                </label>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageUpload}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    isDark
                      ? 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/70 hover:border-purple-500/60'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-purple-400'
                  }`}
                >
                  <input
                    type="file"
                    id="modalProductImage"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <label
                    htmlFor="modalProductImage"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                  >
                    <UploadCloud className={`h-8 w-8 ${uploadingImage ? 'animate-bounce text-purple-500' : isDark ? 'text-gray-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {uploadingImage ? 'Uploading image...' : 'Click to browse image file or drag and drop'}
                    </span>
                    <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      PNG, JPG, or WebP up to 10MB
                    </span>
                  </label>
                </div>

                {/* Uploaded Thumbnails Preview */}
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {form.images.map((img, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group shadow-xs"
                      >
                        <img src={img.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow-md opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {img.isPrimary && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 backdrop-blur-xs">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Swatches */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-500" />
                    <span>Fabric Colors & Swatches</span>
                  </span>
                  <span className="text-[10px] font-normal lowercase opacity-70">optional</span>
                </label>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Color name (e.g., Midnight Blue)"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="input-field text-xs flex-1 py-2"
                  />
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-9 w-10 rounded-xl border border-gray-300 dark:border-gray-600 p-0.5 cursor-pointer bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="btn-secondary text-xs px-3.5 py-2 font-bold flex-shrink-0"
                  >
                    + Add Color
                  </button>
                </div>

                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.colors.map((c, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: c.hexCode }} />
                        <span>{c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(i)}
                          className="text-gray-400 hover:text-red-500 ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Design Customization Options */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" />
                    <span>Custom Design Options</span>
                  </span>
                  <span className="text-[10px] font-normal lowercase opacity-70">optional</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Option name (e.g., Collar Style)"
                    value={optName}
                    onChange={(e) => setOptName(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Values (e.g., Notch, Peak, Shawl)"
                      value={optVals}
                      onChange={(e) => setOptVals(e.target.value)}
                      className="input-field text-xs flex-1 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="btn-secondary text-xs px-3.5 py-2 font-bold flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {form.options.length > 0 && (
                  <div className="space-y-1.5">
                    {form.options.map((o, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200 shadow-2xs'
                        }`}
                      >
                        <span className="truncate">
                          <strong className="font-bold">{o.name}:</strong> {Array.isArray(o.values) ? o.values.join(', ') : o.values}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Action Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className="btn-primary text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
