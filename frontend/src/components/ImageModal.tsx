import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  src: string | null;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export default function ImageModal({ isOpen, src, alt = 'Image preview', title, onClose }: ImageModalProps) {
  const [scale, setScale] = React.useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 transition-all duration-300">
      {/* Top Action Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <h4 className="text-white text-sm sm:text-base font-semibold truncate max-w-md drop-shadow">
          {title || 'Image Preview'}
        </h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            title="Zoom out"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom in"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <a
            href={src}
            download
            target="_blank"
            rel="noopener noreferrer"
            title="Download image"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            title="Close"
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-auto p-8">
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${scale})` }}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
}
