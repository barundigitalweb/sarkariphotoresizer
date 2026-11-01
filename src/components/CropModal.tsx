import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Crop, RotateCcw, User } from 'lucide-react';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  targetWidth: number;
  targetHeight: number;
  onApplyCrop: (croppedFile: File) => void;
  mode: 'photo' | 'signature' | 'document' | 'thumb';
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'se' | 'sw';

export default function CropModal({
  isOpen,
  onClose,
  file,
  targetWidth,
  targetHeight,
  onApplyCrop,
  mode
}: CropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, width: 100, height: 100 });
  const [aspectLock, setAspectLock] = useState<'locked' | 'square' | 'free'>('locked');
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(mode === 'photo');

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: DragHandle | null;
    startX: number;
    startY: number;
    startCrop: CropBox;
  }>({
    handle: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 0, height: 0 }
  });

  // Calculate desired aspect ratio
  const getAspectRatio = () => {
    if (aspectLock === 'square') return 1.0;
    if (aspectLock === 'free') return null;
    return targetWidth / targetHeight;
  };

  // Load image object URL
  useEffect(() => {
    if (!file || !isOpen) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize or re-center crop box when image finishes rendering
  const initializeCrop = (dispW: number, dispH: number) => {
    const aspect = getAspectRatio();
    let w = dispW * 0.85;
    let h = aspect ? w / aspect : dispH * 0.85;

    if (aspect && h > dispH * 0.85) {
      h = dispH * 0.85;
      w = h * aspect;
    }

    const x = Math.max(0, (dispW - w) / 2);
    const y = Math.max(0, (dispH - h) / 2);

    setCrop({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h)
    });
  };

  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setImgDimensions({ width: rect.width, height: rect.height });
    initializeCrop(rect.width, rect.height);
  };

  // Re-adjust crop when aspectLock changes
  useEffect(() => {
    if (imgDimensions.width > 0 && imgDimensions.height > 0) {
      initializeCrop(imgDimensions.width, imgDimensions.height);
    }
  }, [aspectLock]);

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop }
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { handle, startX, startY, startCrop } = dragRef.current;
    if (!handle || imgDimensions.width === 0 || imgDimensions.height === 0) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxW = imgDimensions.width;
    const maxH = imgDimensions.height;
    const aspect = getAspectRatio();

    let newCrop = { ...startCrop };

    if (handle === 'move') {
      newCrop.x = Math.max(0, Math.min(startCrop.x + dx, maxW - startCrop.width));
      newCrop.y = Math.max(0, Math.min(startCrop.y + dy, maxH - startCrop.height));
    } else if (handle === 'se') {
      // Bottom-Right
      let nw = Math.max(40, Math.min(startCrop.width + dx, maxW - startCrop.x));
      let nh = aspect ? nw / aspect : Math.max(40, Math.min(startCrop.height + dy, maxH - startCrop.y));

      if (aspect && startCrop.y + nh > maxH) {
        nh = maxH - startCrop.y;
        nw = nh * aspect;
      }
      newCrop.width = Math.round(nw);
      newCrop.height = Math.round(nh);
    } else if (handle === 'sw') {
      // Bottom-Left
      let nw = Math.max(40, Math.min(startCrop.width - dx, startCrop.x + startCrop.width));
      let nh = aspect ? nw / aspect : Math.max(40, Math.min(startCrop.height + dy, maxH - startCrop.y));

      if (aspect && startCrop.y + nh > maxH) {
        nh = maxH - startCrop.y;
        nw = nh * aspect;
      }
      newCrop.x = Math.round(startCrop.x + (startCrop.width - nw));
      newCrop.width = Math.round(nw);
      newCrop.height = Math.round(nh);
    } else if (handle === 'ne') {
      // Top-Right
      let nw = Math.max(40, Math.min(startCrop.width + dx, maxW - startCrop.x));
      let nh = aspect ? nw / aspect : Math.max(40, Math.min(startCrop.height - dy, startCrop.y + startCrop.height));

      if (aspect && startCrop.y + startCrop.height - nh < 0) {
        nh = startCrop.y + startCrop.height;
        nw = nh * aspect;
      }
      newCrop.y = Math.round(startCrop.y + (startCrop.height - nh));
      newCrop.width = Math.round(nw);
      newCrop.height = Math.round(nh);
    } else if (handle === 'nw') {
      // Top-Left
      let nw = Math.max(40, Math.min(startCrop.width - dx, startCrop.x + startCrop.width));
      let nh = aspect ? nw / aspect : Math.max(40, Math.min(startCrop.height - dy, startCrop.y + startCrop.height));

      if (aspect && startCrop.y + startCrop.height - nh < 0) {
        nh = startCrop.y + startCrop.height;
        nw = nh * aspect;
      }
      newCrop.x = Math.round(startCrop.x + (startCrop.width - nw));
      newCrop.y = Math.round(startCrop.y + (startCrop.height - nh));
      newCrop.width = Math.round(nw);
      newCrop.height = Math.round(nh);
    }

    setCrop(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current.handle = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // release fallback
    }
  };

  // Perform actual crop using HTML5 Canvas and emit File
  const handleApply = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / imgDimensions.width;
    const scaleY = img.naturalHeight / imgDimensions.height;

    const naturalCropX = Math.max(0, Math.round(crop.x * scaleX));
    const naturalCropY = Math.max(0, Math.round(crop.y * scaleY));
    const naturalCropW = Math.min(img.naturalWidth - naturalCropX, Math.round(crop.width * scaleX));
    const naturalCropH = Math.min(img.naturalHeight - naturalCropY, Math.round(crop.height * scaleY));

    if (naturalCropW <= 0 || naturalCropH <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = naturalCropW;
    canvas.height = naturalCropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white first
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, naturalCropW, naturalCropH);

    ctx.drawImage(
      img,
      naturalCropX,
      naturalCropY,
      naturalCropW,
      naturalCropH,
      0,
      0,
      naturalCropW,
      naturalCropH
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `cropped_${file.name}`, { type: 'image/jpeg' });
        onApplyCrop(croppedFile);
        onClose();
      },
      'image/jpeg',
      0.98
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 id="crop-modal-title" className="text-base font-black text-slate-900 leading-tight">
                Crop &amp; Frame {mode === 'photo' ? 'Photo' : mode === 'signature' ? 'Signature' : mode === 'document' ? 'Certificate' : 'Thumb Impression'}
              </h2>
              <p className="text-[11px] text-slate-600">
                Aspect ratio locked to {targetWidth} × {targetHeight} px official exam requirement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close crop modal"
            className="w-8 h-8 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Center Stage: Interactive Crop Canvas */}
        <div className="flex-1 bg-slate-900 p-4 flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[360px] relative select-none">
          {imageSrc && (
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative max-w-full max-h-[55vh] flex items-center justify-center touch-none select-none"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Source for cropping"
                onLoad={handleImageLoad}
                className="max-h-[52vh] max-w-full object-contain pointer-events-none rounded-lg"
              />

              {/* Crop Box & Mask Overlays */}
              {imgDimensions.width > 0 && (
                <>
                  {/* Dark Mask Top */}
                  <div
                    className="absolute bg-black/65 pointer-events-none"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${crop.y}px`
                    }}
                  />
                  {/* Dark Mask Bottom */}
                  <div
                    className="absolute bg-black/65 pointer-events-none"
                    style={{
                      top: `${crop.y + crop.height}px`,
                      left: 0,
                      right: 0,
                      bottom: 0
                    }}
                  />
                  {/* Dark Mask Left */}
                  <div
                    className="absolute bg-black/65 pointer-events-none"
                    style={{
                      top: `${crop.y}px`,
                      left: 0,
                      width: `${crop.x}px`,
                      height: `${crop.height}px`
                    }}
                  />
                  {/* Dark Mask Right */}
                  <div
                    className="absolute bg-black/65 pointer-events-none"
                    style={{
                      top: `${crop.y}px`,
                      left: `${crop.x + crop.width}px`,
                      right: 0,
                      height: `${crop.height}px`
                    }}
                  />

                  {/* Active Crop Box */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                    className="absolute border-2 border-blue-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0)] cursor-move"
                    style={{
                      top: `${crop.y}px`,
                      left: `${crop.x}px`,
                      width: `${crop.width}px`,
                      height: `${crop.height}px`
                    }}
                  >
                    {/* Rule of Thirds Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-b border-white/25"></div>
                      <div className="border-r border-b border-white/25"></div>
                      <div className="border-b border-white/25"></div>
                      <div className="border-r border-b border-white/25"></div>
                      <div className="border-r border-b border-white/25"></div>
                      <div className="border-b border-white/25"></div>
                      <div className="border-r border-white/25"></div>
                      <div className="border-r border-white/25"></div>
                      <div></div>
                    </div>

                    {/* Official 70-80% Face Guide Oval Overlay (For Photo Mode) */}
                    {mode === 'photo' && showFaceGuide && (
                      <div className="absolute inset-x-[15%] inset-y-[10%] rounded-full border-2 border-dashed border-amber-300/80 pointer-events-none flex flex-col items-center justify-between p-2 shadow-inner">
                        <span className="text-[9px] font-bold text-amber-200 bg-black/60 px-1 rounded uppercase tracking-wider">
                          Top of Head
                        </span>
                        <div className="w-full border-t border-dashed border-amber-300/40 my-auto"></div>
                        <span className="text-[9px] font-bold text-amber-200 bg-black/60 px-1 rounded uppercase tracking-wider">
                          Chin Level
                        </span>
                      </div>
                    )}

                    {/* Corner Handles */}
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'nw')}
                      className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                    />
                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'ne')}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                    />
                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'sw')}
                      className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                    />
                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'se')}
                      className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Aspect Ratio Options */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Aspect:</span>
            <button
              type="button"
              onClick={() => setAspectLock('locked')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                aspectLock === 'locked'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Exam Ratio ({targetWidth}:{targetHeight})
            </button>
            <button
              type="button"
              onClick={() => setAspectLock('square')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                aspectLock === 'square'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              1:1 Square
            </button>
            <button
              type="button"
              onClick={() => setAspectLock('free')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                aspectLock === 'free'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Freeform
            </button>
          </div>

          {/* Quick Helpers: Face Guide Toggle & Reset */}
          <div className="flex items-center gap-2">
            {mode === 'photo' && (
              <button
                type="button"
                onClick={() => setShowFaceGuide(!showFaceGuide)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  showFaceGuide
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Face Guide (80%)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => initializeCrop(imgDimensions.width, imgDimensions.height)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Crop</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Tip: Drag inside the frame to move; drag corners to expand or shrink.
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop &amp; Resize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
