import React, { useState, useEffect, useRef } from 'react';
import { EXAM_PRESETS, type ExamPreset } from '../lib/presets';
import { processImage, type ProcessImageResult } from '../lib/image-processor';
import confetti from 'canvas-confetti';
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
  Check
} from 'lucide-react';

export default function ResizerEngine() {
  const [mode, setMode] = useState<'photo' | 'signature'>('photo');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ssc');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessImageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Preset settings
  const currentPreset = EXAM_PRESETS.find((p) => p.id === selectedPresetId) || EXAM_PRESETS[0];

  // Custom adjustable parameters
  const [targetWidth, setTargetWidth] = useState<number>(350);
  const [targetHeight, setTargetHeight] = useState<number>(450);
  const [minKb, setMinKb] = useState<number>(20);
  const [maxKb, setMaxKb] = useState<number>(50);

  // Rotation & Zoom
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);

  // DOP (Date of Photo) parameters
  const [addDop, setAddDop] = useState<boolean>(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousDataUrlRef = useRef<string | null>(null);

  // Update dimensions and KB targets when preset or mode changes
  useEffect(() => {
    const config = mode === 'photo' ? currentPreset.photo : currentPreset.signature;
    setTargetWidth(config.widthPx);
    setTargetHeight(config.heightPx);
    setMinKb(config.minKb);
    setMaxKb(config.maxKb);
    setAddDop(Boolean(mode === 'photo' && currentPreset.photo.requiresDop));
  }, [selectedPresetId, mode]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previousDataUrlRef.current) {
        URL.revokeObjectURL(previousDataUrlRef.current);
      }
    };
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

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.dataUrl;
    const cleanExam = selectedPresetId.toUpperCase();
    const prefix = mode === 'photo' ? 'Sarkari_Photo' : 'Sarkari_Signature';
    a.download = `${prefix}_${cleanExam}_${result.width}x${result.height}_${result.sizeKb}KB.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      // In modern browsers, write PNG/JPEG to clipboard
      const response = await fetch(result.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: alert
      setCopied(false);
    }
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 1. Mode Switcher Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl flex items-center justify-between shadow-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMode('photo')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
            mode === 'photo'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ImageIcon className="w-5 h-5 text-blue-300" />
          <span>Passport Photo Resizer</span>
          <span className="hidden sm:inline-block text-[11px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">
            20 - 50 KB
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode('signature')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${
            mode === 'signature'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <PenTool className="w-5 h-5 text-emerald-300" />
          <span>Signature Resizer</span>
          <span className="hidden sm:inline-block text-[11px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full">
            10 - 20 KB
          </span>
        </button>
      </div>

      {/* 2. Main Processing Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset & Parameter Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Preset Selector Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Select Target Exam</span>
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Official Spec
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {EXAM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    selectedPresetId === preset.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="pr-2">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{preset.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {mode === 'photo'
                        ? `${preset.photo.widthPx}x${preset.photo.heightPx} px • ${preset.photo.minKb}-${preset.photo.maxKb} KB`
                        : `${preset.signature.widthPx}x${preset.signature.heightPx} px • ${preset.signature.minKb}-${preset.signature.maxKb} KB`}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      selectedPresetId === preset.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
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
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Exact Size &amp; Dimension Lock
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Width (Pixels)</label>
                <input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Height (Pixels)</label>
                <input
                  type="number"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Min Size (KB)</label>
                <input
                  type="number"
                  value={minKb}
                  onChange={(e) => setMinKb(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Max Size (KB)</label>
                <input
                  type="number"
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addDop}
                      onChange={(e) => setAddDop(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Add Name &amp; Date of Photo (DOP)
                    </span>
                  </label>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    UPSC / SSC
                  </span>
                </div>

                {addDop && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        Candidate Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RAHUL SHARMA"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Date of Photograph (DD-MM-YYYY)
                      </label>
                      <input
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanSignature}
                    onChange={(e) => setCleanSignature(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Auto-Clean Signature Background
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Filters shadows and yellow tints to output crisp dark ink on pure white.
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upload, Processing & Download Deck (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Upload Dropzone or Output View */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all flex flex-col items-center justify-center text-center shadow-xs min-h-[380px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
                Upload {mode === 'photo' ? 'Passport Photo' : 'Signature'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-4">
                Drag and drop your image here, or browse from device (JPG, PNG, WebP supported)
              </p>
              <button
                type="button"
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
                  className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rotate 90°</span>
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {rotation}°
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 font-semibold">Zoom:</span>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-24 sm:w-32 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono font-bold text-slate-600 w-9">
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
                  <div className="flex flex-col items-center gap-3 text-slate-500 py-12">
                    <Sparkles className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-bold">Compressing to exact KB...</span>
                  </div>
                ) : result ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-200">
                      <img
                        src={result.dataUrl}
                        alt="Resized Sarkari Photo"
                        className="max-h-[280px] w-auto object-contain rounded-lg shadow-2xs"
                      />
                    </div>

                    {/* Quality & Size Compliance Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                        result.isValid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {result.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
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
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Ready {mode === 'photo' ? 'Photo' : 'Signature'} (JPG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-semibold text-center">
                    <span>✅ Ready to upload to SSC, Railway, UPSC, NTA, Police &amp; Banking portals.</span>
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
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                100% Secure &amp; On-Device Processing
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
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
