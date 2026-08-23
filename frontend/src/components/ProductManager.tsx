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
  Sparkles,
  Search,
  DollarSign,
  Layers,
  Star,
  Eye,
  CheckCircle2
} from 'lucide-react';

const CATEGORIES = [
  'All Garments',
  'Bespoke Suits',
  'Tuxedos & Formal',
  'Evening Gowns',
  'Traditional Habesha',
  'Blazers & Jackets',
  'Shirts & Trousers',
  'Custom Alterations',
];

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

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Garments');

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: 'Bespoke Suits',
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
      basePrice: p.basePrice ? String(p.basePrice) : '',
      category: p.category || 'Bespoke Suits',
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
      basePrice: '',
      category: 'Bespoke Suits',
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

  const handleSetPrimaryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      })),
    }));
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => {
      const remaining = prev.images.filter((_, idx) => idx !== index);
      if (remaining.length > 0 && !remaining.some((i) => i.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return { ...prev, images: remaining };
    });
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
      toast.error('Product title is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: form.basePrice ? parseFloat(form.basePrice) : 0,
        images: form.images,
        colors: form.colors,
        options: form.options,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, payload);
        toast.success('Product updated successfully!');
      } else {
        await productsAPI.create(payload);
        toast.success('Product added to your catalog showcase!');
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
    if (!confirm(`Are you sure you want to delete "${name}" from your catalog showcase?`)) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product removed from catalog');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalColorsCount = products.reduce((acc, p) => acc + (p.colors?.length || 0), 0);
  const totalOptionsCount = products.reduce((acc, p) => acc + (p.options?.length || 0), 0);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. Header & Live E-Commerce Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-gray-700/80">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Product Catalog & E-Commerce Showcase
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                  {products.length} Products
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Curate your luxury bespoke styles, swatches, and customization options displayed to customers.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary text-sm px-5 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:shadow-primary-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Showcase Product</span>
        </button>
      </div>

      {/* 2. Storefront Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Active Garments
          </p>
          <p className={`text-2xl font-extrabold font-serif mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {products.length}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Fabric Swatches
          </p>
          <p className="text-2xl font-extrabold font-serif mt-1 text-primary-600 dark:text-primary-400">
            {totalColorsCount}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Bespoke Options
          </p>
          <p className="text-2xl font-extrabold font-serif mt-1 text-amber-500">
            {totalOptionsCount}
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by garment name, description, fabric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. E-Commerce Product Cards Grid */}
      {fetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-72 rounded-3xl animate-pulse ${isDark ? 'bg-gray-800/60' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border-2 border-dashed ${
          isDark ? 'border-gray-800 bg-gray-900/40' : 'border-slate-300 bg-slate-50/50'
        }`}>
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDark ? 'bg-gray-800 text-gray-500' : 'bg-white text-slate-400 shadow-sm'
          }`}>
            <Package className="w-8 h-8" />
          </div>
          <h4 className={`text-lg font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {searchQuery ? 'No products matched your search' : 'No products in your showcase catalog yet'}
          </h4>
          <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {searchQuery 
              ? 'Try changing your search term or clearing the filter.' 
              : 'Add suits, dresses, tuxedos, and bespoke attire to highlight your craftsmanship to prospective clients.'}
          </p>
          <button
            onClick={searchQuery ? () => setSearchQuery('') : handleOpenCreateModal}
            className="btn-primary text-xs sm:text-sm px-6 py-3 rounded-2xl font-bold inline-flex items-center space-x-2 shadow-lg"
          >
            {searchQuery ? <span>Clear Search Filter</span> : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Your First Product</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const primaryImg = p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url;
            const price = Number(p.basePrice) > 0 ? `$${Number(p.basePrice).toFixed(2)}` : 'Starting from inquiry';

            return (
              <div
                key={p.id}
                className={`group rounded-3xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  isDark ? 'bg-gray-800/90 border-gray-700/80 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                {/* Product Image Stage */}
                <div>
                  <div className="aspect-[4/3] w-full bg-slate-950 relative overflow-hidden">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-slate-900">
                        <ImageIcon className="w-10 h-10 mb-1 opacity-30" />
                        <span className="text-xs font-semibold">No Image Uploaded</span>
                      </div>
                    )}

                    {/* Gradient Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                    {/* Price Tag Floating Badge */}
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white font-extrabold text-xs shadow-lg">
                      {price}
                    </div>

                    {/* Image Count Badge */}
                    {p.images && p.images.length > 1 && (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        📸 {p.images.length} photos
                      </div>
                    )}

                    {/* Quick Edit & Delete Actions (Floating Overlay) */}
                    <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        title="Edit Product"
                        className="p-2.5 rounded-xl bg-white/95 dark:bg-gray-900/95 text-slate-800 dark:text-white shadow-lg hover:scale-105 transition-all cursor-pointer backdrop-blur-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Delete Product"
                        className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg hover:scale-105 transition-all cursor-pointer backdrop-blur-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Product Details Body */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className={`font-bold text-base sm:text-lg leading-snug line-clamp-1 group-hover:text-amber-500 transition-colors ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {p.description}
                        </p>
                      )}
                    </div>

                    {/* Color Palette Swatches */}
                    {p.colors && p.colors.length > 0 && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-gray-700/60">
                        <Palette className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {p.colors.map((c: any, i: number) => (
                            <span
                              key={i}
                              title={`${c.name} (${c.hexCode})`}
                              className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30 shadow-2xs flex-shrink-0"
                              style={{ backgroundColor: c.hexCode }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bespoke Customization Options */}
                    {p.options && p.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.options.map((opt: any, i: number) => {
                          const vals = typeof opt.values === 'string' ? JSON.parse(opt.values) : opt.values;
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                isDark ? 'bg-gray-700/60 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {opt.name}: {Array.isArray(vals) ? vals.join(', ') : vals}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Edit Button */}
                <div className="px-5 pb-5 pt-0">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      isDark 
                        ? 'border-gray-700 hover:border-amber-500 hover:text-amber-400 text-slate-300 bg-gray-800' 
                        : 'border-slate-200 hover:border-amber-400 hover:text-amber-700 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Garment Specs</span>
                  </button>
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
              isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-gray-800 bg-gray-950/60' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    {editingProduct ? 'Edit Showcase Garment' : 'Create New Showcase Garment'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    Define product pricing, fabric swatches, and customization attributes for clients.
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
              
              {/* Product Title & Base Price Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}>
                    Garment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bespoke 3-Piece Silk Lapel Tuxedo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}>
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 350.00"
                    value={form.basePrice}
                    onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              {/* Description & Fabric Details */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Description & Fabric Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Handcrafted with Super 150s virgin Italian wool, full canvas chest piece, horn buttons, and hand-stitched silk lining."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field text-sm leading-relaxed"
                />
              </div>

              {/* Photo Gallery Manager */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Product Photography Gallery
                </label>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageUpload}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    isDark
                      ? 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/70 hover:border-amber-500/60'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-amber-400'
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
                    <UploadCloud className={`h-8 w-8 ${uploadingImage ? 'animate-bounce text-amber-500' : isDark ? 'text-gray-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {uploadingImage ? 'Uploading image...' : 'Click to browse image or drag and drop'}
                    </span>
                    <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      PNG, JPG, or WebP up to 10MB
                    </span>
                  </label>
                </div>

                {/* Uploaded Thumbnails Preview with Primary Selector */}
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {form.images.map((img, i) => (
                      <div
                        key={i}
                        className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 group shadow-sm transition-all ${
                          img.isPrimary ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <img src={img.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow-md opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(i)}
                          className={`absolute bottom-0 inset-x-0 text-[9px] font-bold text-center py-0.5 backdrop-blur-xs transition-colors ${
                            img.isPrimary ? 'bg-amber-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                        >
                          {img.isPrimary ? '★ Primary' : 'Set Primary'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Palette Swatches */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fabric Colors & Swatches</span>
                  </span>
                  <span className="text-[10px] font-normal lowercase opacity-70">optional</span>
                </label>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Color name (e.g. Midnight Navy)"
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
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs" style={{ backgroundColor: c.hexCode }} />
                        <span>{c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(i)}
                          className="text-gray-400 hover:text-red-500 ml-1 font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bespoke Customization Options */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                    <span>Customization Options</span>
                  </span>
                  <span className="text-[10px] font-normal lowercase opacity-70">optional</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Option name (e.g. Lapel Style)"
                    value={optName}
                    onChange={(e) => setOptName(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Values (e.g. Peak, Notch, Shawl)"
                      value={optVals}
                      onChange={(e) => setOptVals(e.target.value)}
                      className="input-field text-xs flex-1 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="btn-secondary text-xs px-3 py-2 font-bold flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {form.options.length > 0 && (
                  <div className="space-y-1.5">
                    {form.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs ${
                          isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-amber-500">{opt.name}: </span>
                          <span>{opt.values.join(', ')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="text-gray-400 hover:text-red-500 ml-2 font-bold"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary text-xs sm:text-sm px-5 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs sm:text-sm px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Saving Garment...' : editingProduct ? 'Save Changes' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
