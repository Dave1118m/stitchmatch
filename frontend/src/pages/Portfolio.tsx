import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tailorsAPI, productsAPI } from '../lib/api';
import { useDarkMode } from '../hooks/useDarkMode';
import { ArrowLeft, Scissors, Package, X, Download } from 'lucide-react';
export default function Portfolio() {
  const { id } = useParams();
  const isDark = useDarkMode();
  const [tailor, setTailor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customColor, setCustomColor] = useState<string>('#000000');
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTailor();
  }, [id]);

  const loadTailor = async () => {
    try {
      const [resTailor, resProducts] = await Promise.all([
        tailorsAPI.getById(id!),
        productsAPI.getByTailor(id!)
      ]);
      if (resTailor.data?.tailor) {
        setTailor(resTailor.data.tailor);
        setProducts(resProducts.data?.products || []);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load portfolio.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-red-500 p-4 text-center">{error}</div></div>;
  if (!tailor) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"><p>Tailor not found</p></div>;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/tailors/${id}`} className={`flex items-center space-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-4 w-4" /><span>Back to Profile</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Scissors className={`h-5 w-5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-3 mb-6">
          <Package className={`h-6 w-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Products Catalog</h1>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({products.length} {products.length === 1 ? 'item' : 'items'})</span>
        </div>

        {products.length === 0 ? (
          <div className="card text-center py-16">
            <Package className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No products yet</h3>
            <p className={`mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This tailor hasn't added any products to their catalog.</p>
            <Link to={`/tailors/${id}`} className="btn-primary mt-6 inline-block">Back to Profile</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p: any) => (
              <div key={p.id} onClick={() => setSelectedProduct(p)} className={`cursor-pointer overflow-hidden rounded-lg shadow-sm border ${isDark ? 'border-gray-700 bg-gray-800 hover:border-primary-500' : 'border-gray-200 bg-white hover:border-primary-400'} transition-colors`}>
                <div className="aspect-square relative">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images.find((i:any)=>i.isPrimary)?.url || p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Package className="text-gray-400 w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className={`font-semibold text-lg mb-1 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                  {p.colors && p.colors.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {p.colors.slice(0,5).map((c: any, i: number) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: c.hexCode }} title={c.name}></div>
                      ))}
                      {p.colors.length > 5 && <span className="text-xs text-gray-500 ml-1">+{p.colors.length - 5}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <button onClick={() => setSelectedProduct(null)} className={`absolute top-4 right-4 z-10 p-2 rounded-full ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <X className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="bg-gray-100 dark:bg-gray-900 relative group">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <>
                    <img src={selectedProduct.images.find((i:any)=>i.isPrimary)?.url || selectedProduct.images[0].url} alt={selectedProduct.name} className="w-full h-full object-cover min-h-[300px]" />
                    <a 
                      href={selectedProduct.images.find((i:any)=>i.isPrimary)?.url || selectedProduct.images[0].url} 
                      download={`${selectedProduct.name.replace(/\s+/g, '_')}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 p-2.5 rounded-full shadow hover:bg-white dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center text-gray-800 dark:text-gray-200"
                      title="Download Image for Reference"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </>
                ) : (
                  <div className="w-full h-full min-h-[300px] flex items-center justify-center">
                    <Package className="text-gray-400 w-20 h-20" />
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8">
                <h2 className="text-3xl font-bold mb-4">{selectedProduct.name}</h2>
                <p className={`mb-6 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{selectedProduct.description}</p>
                
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Available Colors</h4>
                    <div className="flex flex-wrap gap-2 items-center">
                      {selectedProduct.colors.map((c: any, i: number) => (
                        <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="w-3 h-3 rounded-full border border-gray-400" style={{ backgroundColor: c.hexCode }}></div>
                          {c.name}
                        </div>
                      ))}

                      <button onClick={() => setShowCustomColor(!showCustomColor)} className="text-xs text-primary-600 hover:underline">
                        + Custom Color
                      </button>
                      
                      {showCustomColor && (
                        <div className="flex items-center gap-2 ml-2">
                          <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                          <span className="text-xs">Your Choice</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedProduct.options && selectedProduct.options.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Design Options</h4>
                    <ul className="space-y-2">
                      {selectedProduct.options.map((o: any, i: number) => {
                        const vals = typeof o.values === 'string' ? JSON.parse(o.values) : o.values;
                        return (
                          <li key={i} className={`text-sm p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <strong className="block mb-1">{o.name}</strong>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{vals.join(', ')}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}