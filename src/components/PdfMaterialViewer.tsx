import React, { useState, useEffect, useRef } from 'react';
import { PdfMaterial, addMaterialStudyTime } from '../lib/db';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { renderPdfPages, revokeObjectUrls } from '../lib/pdfRenderer';

interface Props {
  material: PdfMaterial;
  onClose: () => void;
}

export const PdfMaterialViewer: React.FC<Props> = ({ material, onClose }) => {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const startTimeRef = useRef<number>(Date.now());

  const handleExit = async () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (material.id && elapsed > 0) {
      try {
        await addMaterialStudyTime(material.id, elapsed);
      } catch (error) {
        console.error('Failed to save material study time:', error);
      }
    }
    onClose();
  };

  useEffect(() => {
    loadPdf();
    startTimeRef.current = Date.now();
    const appWindow = getCurrentWindow();
    appWindow.setFullscreen(true).catch(console.error);

    return () => {
      appWindow.setFullscreen(false).catch(console.error);
    };
  }, [material]);

  useEffect(() => {
    return () => revokeObjectUrls(pageImages);
  }, [pageImages]);

  const loadPdf = async () => {
    if (!material.sourcePdfPath) return;
    setLoadingPages(true);
    try {
      const images = await renderPdfPages(material.sourcePdfPath);
      setPageImages(currentImages => {
        revokeObjectUrls(currentImages);
        return images;
      });
    } catch (error) {
      console.error('Failed to load material images:', error);
      alert('Failed to load material: ' + error);
    } finally {
      setLoadingPages(false);
    }
  };

  const adjustZoom = (amount: number) => {
    setPdfZoom(current => Math.min(180, Math.max(60, current + amount)));
  };

  const updateZoom = (value: number) => {
    setPdfZoom(Math.min(180, Math.max(60, value)));
  };

  return (
    <div className="fixed inset-0 bg-sky-50 flex overflow-hidden z-50">
      <div className="relative flex-1 min-w-0 bg-sky-50 border-r border-sky-200 overflow-hidden">
        <div className="absolute top-4 left-4 z-20 flex gap-4 items-center">
          <button
            onClick={handleExit}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black border border-red-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            ← EXIT MATERIAL
          </button>
          <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-sky-200 text-zinc-900 text-xs font-black">
            {material.name} • {loadingPages ? 'Loading...' : `${pageImages.length} Pages`}
          </div>
        </div>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-full border border-sky-200">
          <button
            type="button"
            onClick={() => adjustZoom(-2)}
            className="w-8 h-8 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-lg leading-none font-black"
            title="Zoom out"
          >
            -
          </button>
          <input
            type="number"
            min="60"
            max="180"
            step="2"
            value={pdfZoom}
            onChange={(e) => updateZoom(Number(e.target.value) || 100)}
            className="w-16 h-8 rounded-full bg-white text-zinc-900 text-center text-[11px] font-black outline-none border border-sky-200 focus:border-blue-500"
            title="Zoom percentage"
          />
          <button
            type="button"
            onClick={() => adjustZoom(2)}
            className="w-8 h-8 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-lg leading-none font-black"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setPdfZoom(100)}
            className="h-8 px-3 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-[11px] font-black"
            title="Reset zoom"
          >
            100%
          </button>
        </div>

        <div className="h-full overflow-auto p-8 pt-20 custom-scrollbar">
          {loadingPages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-zinc-500 font-black animate-pulse tracking-widest uppercase">Rendering Pages...</div>
            </div>
          ) : (
            <div
              className="mx-auto space-y-8"
              style={{
                width: `${pdfZoom}%`,
                maxWidth: pdfZoom <= 100 ? '56rem' : 'none',
                minWidth: pdfZoom >= 100 ? '56rem' : '32rem'
              }}
            >
              {pageImages.map((src, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-2xl overflow-hidden relative">
                  <img 
                    src={src} 
                    alt={`Page ${idx + 1}`} 
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
