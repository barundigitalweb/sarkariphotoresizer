import React, { useState, useEffect, useRef } from 'react';
import { EXAM_PRESETS, type ExamPreset } from '../lib/presets';
import { processImage, type ProcessImageResult } from '../lib/image-processor';
import {
  Upload,
  Download,
  Image as ImageIcon,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Settings,
  Calendar,
  User,
  Copy,
  ZoomIn,
  Check,
  Share2,
  ArrowRight,
  Star
} from 'lucide-react';

export interface ResizerEngineProps {
  initialMode?: 'photo' | 'signature';
  initialPresetId?: string;
  initialAddDop?: boolean;
}

export default function ResizerEngine({
  initialMode = 'photo',
  initialPresetId = 'ssc',
  initialAddDop
}: ResizerEngineProps = {}) {
  const [mode, setMode] = useState<'photo' | 'signature'>(initialMode);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessImageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Preset settings
  const currentPreset = EXAM_PRESETS.find((p) => p.id === selectedPresetId) || EXAM_PRESETS[0];
  const initialPresetConfig = EXAM_PRESETS.find((p) => p.id === initialPresetId) || EXAM_PRESETS[0];
  const startConfig = initialMode === 'photo' ? initialPresetConfig.photo : initialPresetConfig.signature;

  // Custom adjustable parameters
  const [targetWidth, setTargetWidth] = useState<number>(startConfig.widthPx);
  const [targetHeight, setTargetHeight] = useState<number>(startConfig.heightPx);
  const [minKb, setMinKb] = useState<number>(startConfig.minKb);
  const [maxKb, setMaxKb] = useState<number>(startConfig.maxKb);

  // Rotation & Zoom
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);

  // DOP (Date of Photo) parameters
  const [addDop, setAddDop] = useState<boolean>(
    initialAddDop !== undefined
      ? initialAddDop
      : Boolean(initialMode === 'photo' && initialPresetConfig.photo.requiresDop)
  );
  const [candidateName, setCandidateName] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });

  // Signature enhancement
  const [cleanSignature, setCleanSignature] = useState<boolean>(true);

  // User Interactive Rating State
  const [userRating, setUserRating] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spr_user_rating');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('spr_user_rating'));
    }
    return false;
  });

  const handleRate = (stars: number) => {
    setUserRating(stars);
    setRatingSubmitted(true);
    try {
      localStorage.setItem('spr_user_rating', String(stars));
    } catch {
      // localStorage fallback
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousDataUrlRef = useRef<string | null>(null);

  // Update dimensions and KB targets when preset or mode changes
  useEffect(() => {
    const config = mode === 'photo' ? currentPreset.photo : currentPreset.signature;
    setTargetWidth(config.widthPx);
    setTargetHeight(config.heightPx);
    setMinKb(config.minKb);
    setMaxKb(config.maxKb);
    if (initialAddDop !== undefined && selectedPresetId === initialPresetId && mode === initialMode) {
      setAddDop(initialAddDop);
    } else {
      setAddDop(Boolean(mode === 'photo' && currentPreset.photo.requiresDop));
    }
  }, [selectedPresetId, mode]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previousDataUrlRef.current) {
        URL.revokeObjectURL(previousDataUrlRef.current);
      }
    };
  }, []);

  // Global Ctrl+V clipboard paste support (Huge for Cyber Cafes & Desktop Users)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            setFile(pastedFile);
            setRotation(0);
            setZoom(1.0);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Re-process image when parameters change
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    setIsProcessing(true);
    setErrorMsg('');

    const timer = setTimeout(async () => {
      try {
        const res = await processImage({
          file,
          targetWidth: Number(targetWidth) || 350,
          targetHeight: Number(targetHeight) || 450,
          minKb: Number(minKb) || 20,
          maxKb: Number(maxKb) || 50,
          mode,
          addDop: mode === 'photo' && addDop,
          candidateName,
          photoDate,
          cleanSignatureBackground: mode === 'signature' && cleanSignature,
          rotation,
          zoom
        });

        if (isMounted) {
          if (previousDataUrlRef.current && previousDataUrlRef.current !== res.dataUrl) {
            URL.revokeObjectURL(previousDataUrlRef.current);
          }
          previousDataUrlRef.current = res.dataUrl;
          setResult(res);
          setIsProcessing(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error processing image.');
          setIsProcessing(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    file,
    targetWidth,
    targetHeight,
    minKb,
    maxKb,
    mode,
    addDop,
    candidateName,
    photoDate,
    cleanSignature,
    rotation,
    zoom
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setRotation(0);
      setZoom(1.0);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setRotation(0);
      setZoom(1.0);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Dynamic import of confetti to keep initial JS bundle ultra-lean
  const handleDownload = async () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.dataUrl;
    const cleanExam = selectedPresetId.toUpperCase();
    const prefix = mode === 'photo' ? 'Sarkari_Photo' : 'Sarkari_Signature';
    a.download = `${prefix}_${cleanExam}_${result.width}x${result.height}_${result.sizeKb}KB.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    try {
      const { default: confetti } = await import('canvas-confetti');
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Confetti fallback
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      const response = await fetch(result.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      '🔥 Free Sarkari Photo (20KB-50KB) & Signature (10KB-20KB) Resizer for SSC, Railway, UPSC & Banking: https://sarkariphotoresizer.com'
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleReset = () => {
    if (previousDataUrlRef.current) {
      URL.revokeObjectURL(previousDataUrlRef.current);
      previousDataUrlRef.current = null;
    }
    setFile(null);
    setResult(null);
    setRotation(0);
    setZoom(1.0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const originalSizeKb = file ? Math.round((file.size / 1024) * 10) / 10 : 0;
  const reductionPercent =
    file && result && originalSizeKb > 0 && originalSizeKb > result.sizeKb
      ? Math.round(((originalSizeKb - result.sizeKb) / originalSizeKb) * 100)
      : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 1. Mode Switcher Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl flex items-center justify-between shadow-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMode('photo')}
          aria-label="Switch to Passport Photo Resizer mode (20 KB to 50 KB)"
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
            mode === 'photo'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-5 h-5 text-blue-200" />
          <span>Passport Photo Resizer</span>
          <span className="hidden sm:inline-block text-[11px] font-bold bg-blue-900/60 border border-blue-400/40 text-blue-100 px-2 py-0.5 rounded-full">
            20 - 50 KB
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode('signature')}
          aria-label="Switch to Signature Resizer mode (10 KB to 20 KB)"
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
            mode === 'signature'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PenTool className="w-5 h-5 text-emerald-200" />
          <span>Signature Resizer</span>
          <span className="hidden sm:inline-block text-[11px] font-bold bg-emerald-900/60 border border-emerald-400/40 text-emerald-100 px-2 py-0.5 rounded-full">
            10 - 20 KB
          </span>
        </button>
      </div>

      {/* 2. Main Processing Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset & Parameter Controls (5 cols, order-2 on mobile so Upload box is first) */}
        <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
          {/* Preset Selector Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Select Target Exam</span>
              </span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                Official Spec
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {EXAM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  aria-label={`Select ${preset.name} specifications`}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    selectedPresetId === preset.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="pr-2">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{preset.name}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {mode === 'photo'
                        ? `${preset.photo.widthPx}x${preset.photo.heightPx} px • ${preset.photo.minKb}-${preset.photo.maxKb} KB`
                        : `${preset.signature.widthPx}x${preset.signature.heightPx} px • ${preset.signature.minKb}-${preset.signature.maxKb} KB`}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      selectedPresetId === preset.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Size & Dimension Fine-Tuning */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Exact Size &amp; Dimension Lock
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="target-width" className="block text-xs font-bold text-slate-700 mb-1">
                  Width (Pixels)
                </label>
                <input
                  id="target-width"
                  type="number"
                  aria-label="Target width in pixels"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="target-height" className="block text-xs font-bold text-slate-700 mb-1">
                  Height (Pixels)
                </label>
                <input
                  id="target-height"
                  type="number"
                  aria-label="Target height in pixels"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="min-kb" className="block text-xs font-bold text-slate-700 mb-1">
                  Min Size (KB)
                </label>
                <input
                  id="min-kb"
                  type="number"
                  aria-label="Minimum size in kilobytes"
                  value={minKb}
                  onChange={(e) => setMinKb(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="max-kb" className="block text-xs font-bold text-slate-700 mb-1">
                  Max Size (KB)
                </label>
                <input
                  id="max-kb"
                  type="number"
                  aria-label="Maximum size in kilobytes"
                  value={maxKb}
                  onChange={(e) => setMaxKb(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Photo Mode Feature: Name & Date of Photo (DOP) */}
            {mode === 'photo' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="add-dop-checkbox" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="add-dop-checkbox"
                      type="checkbox"
                      checked={addDop}
                      onChange={(e) => setAddDop(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Add Name &amp; Date of Photo (DOP)
                    </span>
                  </label>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                    UPSC / SSC
                  </span>
                </div>

                {addDop && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label htmlFor="candidate-name" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        Candidate Full Name
                      </label>
                      <input
                        id="candidate-name"
                        type="text"
                        placeholder="e.g. RAHUL SHARMA"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="photo-date" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Date of Photograph (DD-MM-YYYY)
                      </label>
                      <input
                        id="photo-date"
                        type="text"
                        placeholder="e.g. 15-10-2026"
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Signature Mode Feature: Contrast Cleaner */}
            {mode === 'signature' && (
              <div className="pt-2 border-t border-slate-100">
                <label htmlFor="clean-sig-checkbox" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="clean-sig-checkbox"
                    type="checkbox"
                    checked={cleanSignature}
                    onChange={(e) => setCleanSignature(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Auto-Clean Signature Background
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Filters shadows and yellow tints to output crisp dark ink on pure white.
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upload, Processing & Download Deck (7 cols, order-1 on mobile for instant above-the-fold access) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 order-1 lg:order-2">
          {/* Mobile-Only Quick Exam Selector Bar */}
          <div className="lg:hidden flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Exam</span>
              <span className="text-xs font-black text-slate-900 block truncate max-w-[200px]">
                {currentPreset.name.split('(')[0]}
              </span>
              <span className="text-[10px] text-blue-600 font-bold block">
                {mode === 'photo'
                  ? `${currentPreset.photo.minKb}-${currentPreset.photo.maxKb} KB`
                  : `${currentPreset.signature.minKb}-${currentPreset.signature.maxKb} KB`}
              </span>
            </div>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              aria-label="Change target examination preset"
              className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer shrink-0"
            >
              {EXAM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.badge} - {p.name.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Dropzone or Output View */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all flex flex-col items-center justify-center text-center shadow-xs min-h-[380px]"
            >
              <input
                id="file-upload-input"
                ref={fileInputRef}
                type="file"
                aria-label="Upload photo or signature file from device"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
                Upload {mode === 'photo' ? 'Passport Photo' : 'Signature'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-4 leading-relaxed">
                Drag and drop your image here, browse from device, or <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Ctrl + V</span> to paste from clipboard
              </p>
              <button
                type="button"
                aria-label="Choose file from your phone or computer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Choose File from Device
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Live Preview &amp; Output
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Upload a different photo or reset"
                  className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Upload Different Photo</span>
                </button>
              </div>

              {/* Adjustments Toolbar: Rotate & Zoom */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotate}
                    aria-label="Rotate image 90 degrees clockwise"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rotate 90°</span>
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {rotation}°
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-slate-600" />
                  <label htmlFor="zoom-slider-input" className="text-slate-700 font-bold">Zoom:</label>
                  <input
                    id="zoom-slider-input"
                    type="range"
                    aria-label="Adjust zoom level"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-24 sm:w-32 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono font-bold text-slate-700 w-9">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Image Preview Canvas */}
              <div className="flex flex-col items-center justify-center bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200/60 min-h-[260px]">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3 text-slate-600 py-12">
                    <Sparkles className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-bold">Compressing to exact KB...</span>
                  </div>
                ) : result ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-200">
                      <img
                        src={result.dataUrl}
                        alt="Resized Sarkari Photo Preview"
                        className="max-h-[280px] w-auto object-contain rounded-lg shadow-2xs"
                      />
                    </div>

                    {/* Compression Savings Comparison */}
                    {originalSizeKb > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-700 font-medium bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                        <span>Original: <strong>{originalSizeKb} KB</strong></span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-blue-700 font-bold">New: {result.sizeKb} KB</span>
                        {reductionPercent > 0 && (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                            -{reductionPercent}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quality & Size Compliance Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                        result.isValid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {result.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                      )}
                      <span>
                        Size: {result.sizeKb} KB (Target: {minKb} - {maxKb} KB) • {result.width}x
                        {result.height} px
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Download Action Box */}
              {result && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownload}
                      aria-label="Download resized image in JPG format"
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Ready {mode === 'photo' ? 'Photo' : 'Signature'} (JPG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Copy resized image to clipboard"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Copy image to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span className="text-emerald-800">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      aria-label="Share tool with friends on WhatsApp"
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm py-3 px-3.5 rounded-2xl border border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Share with friends on WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 font-semibold text-center">
                    <span>✅ 100% compliant &amp; ready to upload to official exam portals.</span>
                  </div>

                  {/* Genuine User Rating Feedback Widget */}
                  <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      {ratingSubmitted ? 'Thank you for your rating! ⭐' : 'How was your resizing experience?'}
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRate(star)}
                          aria-label={`Rate ${star} out of 5 stars`}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= userRating
                                ? 'text-amber-400 fill-current'
                                : 'text-slate-300 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {ratingSubmitted && (
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        Your rating helps keep this tool free &amp; up-to-date for all applicants.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Privacy & Trust Guarantee */}
          <div className="bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                100% Secure &amp; On-Device Processing
              </h3>
              <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                Your photos, signatures, and identity documents are processed completely inside your
                browser using local client-side Canvas memory. Nothing is ever uploaded to any cloud
                server. Safe for all candidates and cyber cafes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
