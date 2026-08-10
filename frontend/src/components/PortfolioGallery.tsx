import { useState } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PortfolioItem {
  imageUrl: string;
  title?: string;
  description?: string;
}

interface PortfolioGalleryProps {
  items: string[] | PortfolioItem[];
  onDelete?: (index: number) => void;
  editable?: boolean;
}

function parsePortfolioItems(items: string[] | PortfolioItem[]): PortfolioItem[] {
  return items.map((item) => {
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        return { imageUrl: parsed.imageUrl || item, title: parsed.title || '', description: parsed.description || '' };
      } catch {
        return { imageUrl: item, title: '', description: '' };
      }
    }
    return item;
  });
}

function getImageUrl(item: PortfolioItem | string): string {
  if (typeof item === 'string') return item;
  return item.imageUrl;
}

export default function PortfolioGallery({ items, onDelete, editable }: PortfolioGalleryProps) {
  const isDark = useDarkMode();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const portfolioItems = parsePortfolioItems(items);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null && lightboxIndex < portfolioItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  if (!portfolioItems.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {portfolioItems.map((item, i) => (
          <div key={i} className="relative group">
            <button
              onClick={() => openLightbox(i)}
              className="w-full h-48 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <img
                src={getImageUrl(item)}
                alt={item.title || `Portfolio ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </button>
            {(item.title || item.description) && (
              <div className={`absolute bottom-0 left-0 right-0 p-2 ${isDark ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-sm rounded-b-lg`}>
                {item.title && <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>}
                {item.description && <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>}
              </div>
            )}
            {editable && onDelete && (
              <button
                onClick={() => onDelete(i)}
                className={`absolute top-2 right-2 p-1.5 rounded-full ${isDark ? 'bg-red-900/80 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'} opacity-0 group-hover:opacity-100 transition-opacity`}
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 p-2 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {lightboxIndex < portfolioItems.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 p-2 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          <div className="max-w-4xl max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={getImageUrl(portfolioItems[lightboxIndex])}
              alt={portfolioItems[lightboxIndex].title || `Portfolio ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {(portfolioItems[lightboxIndex].title || portfolioItems[lightboxIndex].description) && (
              <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {portfolioItems[lightboxIndex].title && (
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{portfolioItems[lightboxIndex].title}</h3>
                )}
                {portfolioItems[lightboxIndex].description && (
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{portfolioItems[lightboxIndex].description}</p>
                )}
              </div>
            )}
          </div>

          <div className={`absolute bottom-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lightboxIndex + 1} / {portfolioItems.length}
          </div>
        </div>
      )}
    </>
  );
}