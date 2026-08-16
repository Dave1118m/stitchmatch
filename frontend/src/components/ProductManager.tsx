import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { productsAPI, uploadsAPI } from '../lib/api';
import { Package, Plus, Trash2, Edit2, Image as ImageIcon, UploadCloud } from 'lucide-react';

export default function ProductManager() {
  const { user } = useAuth();
  const isDark = useDarkMode();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [colorHex, setColorHex] = useState('#000000');
  const [optName, setOptName] = useState('');
  const [optVals, setOptVals] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = (e as React.DragEvent).dataTransfer.files[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0] || null;
    }
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setForm({ ...form, images: [...form.images, { url: res.data.url, isPrimary: form.images.length === 0 }] });
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchProducts();
  }, [user?.id]);

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getByTailor(user!.id);
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        const payload = { ...form, basePrice: 0 };
        await productsAPI.update(editingProduct.id, payload);
      } else {
        if (form.colors.length > 0) {
          // Duplicate the product for each color
          for (const color of form.colors) {
            const payload = {
              ...form,
              name: `${form.name} - ${color.name}`,
              colors: [color], // Only attach this specific color to the duplicated product
              basePrice: 0,
            };
            await productsAPI.create(payload);
          }
        } else {
          // No colors added, just create the single product normally
          const payload = { ...form, basePrice: 0 };
          await productsAPI.create(payload);
        }
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const editProduct = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      images: p.images || [],
      colors: p.colors || [],
      options: p.options ? p.options.map((o: any) => ({ ...o, values: JSON.parse(o.values) })) : [],
    });
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
  };

  return (
    <div className={`mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <Package className="mr-2 h-5 w-5 text-primary-600" />
        Product Catalog Manager
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h4 className={`font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={2} />
            </div>
            
            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-1">Images</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageUpload}
                className={`border-2 border-dashed rounded-lg p-3 text-center ${isDark ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} cursor-pointer mb-3 transition-colors flex items-center justify-center gap-3`}
              >
                <input type="file" id="productImage" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <label htmlFor="productImage" className="cursor-pointer flex items-center justify-center w-full">
                  <UploadCloud className={`h-6 w-6 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {uploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 border rounded overflow-hidden">
                    <img src={img.url} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm({...form, images: form.images.filter((_, idx) => idx !== i)})} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium mb-1">Colors</label>
              <div className="flex gap-2 mb-2">
                <input value={colorName} onChange={e => setColorName(e.target.value)} placeholder="Name (e.g. Navy)" className="input-field flex-1" />
                <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className="h-10 w-10 border-none p-0 cursor-pointer" />
                <button type="button" onClick={() => {
                  if (colorName) {
                    setForm({...form, colors: [...form.colors, { name: colorName, hexCode: colorHex }]});
                    setColorName('');
                  }
                }} className="btn-secondary">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.colors.map((c, i) => (
                  <span key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hexCode }}></span> {c.name}
                    <button type="button" onClick={() => setForm({...form, colors: form.colors.filter((_, idx) => idx !== i)})} className="ml-1 text-red-500 hover:text-red-700">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium mb-1">Design Options</label>
              <div className="flex gap-2 mb-2">
                <input value={optName} onChange={e => setOptName(e.target.value)} placeholder="Option (e.g. Collar)" className="input-field flex-1" />
                <input value={optVals} onChange={e => setOptVals(e.target.value)} placeholder="Values (comma separated)" className="input-field flex-1" />
                <button type="button" onClick={() => {
                  if (optName && optVals) {
                    setForm({...form, options: [...form.options, { name: optName, values: optVals.split(',').map(s=>s.trim()) }]});
                    setOptName(''); setOptVals('');
                  }
                }} className="btn-secondary">Add</button>
              </div>
              <div className="space-y-1">
                {form.options.map((o, i) => (
                  <div key={i} className={`text-sm p-2 rounded flex justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <span><strong>{o.name}:</strong> {o.values.join(', ')}</span>
                    <button type="button" onClick={() => setForm({...form, options: form.options.filter((_, idx) => idx !== i)})} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Product'}</button>
              {editingProduct && (
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Product List */}
        <div>
          <h4 className={`font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Your Products</h4>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {products.length === 0 ? (
              <p className="text-sm text-gray-500">No products added yet.</p>
            ) : (
              products.map(p => (
                <div key={p.id} className={`flex items-start gap-4 p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images.find((i:any)=>i.isPrimary)?.url || p.images[0].url} alt={p.name} className="w-20 h-20 object-cover rounded" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 flex items-center justify-center rounded">
                      <ImageIcon className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm">{p.name}</h5>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => editProduct(p)} className="text-blue-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
