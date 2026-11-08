import React, { useState, useEffect, useRef } from 'react';
import { EXAM_PRESETS, type ExamPreset } from '../lib/presets';
import { processImage, type ProcessImageResult, type ResizerMode } from '../lib/image-processor';
import { convertPdfPageToImageFile } from '../lib/pdf-renderer';
import CropModal from './CropModal';
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
  Star,
  Crop,
  FileText,
  Fingerprint,
  Globe,
  ExternalLink
} from 'lucide-react';

export interface ResizerEngineProps {
  initialMode?: ResizerMode;
  initialPresetId?: string;
  initialAddDop?: boolean;
}

const translations = {
  en: {
    photoTab: 'Photo',
    sigTab: 'Signature',
    docTab: 'Doc to PDF',
    thumbTab: 'Thumb',
    targetExam: 'Target Exam',
    specHeader: 'Exam Specs & Custom Size',
    minKb: 'Min KB',
    maxKb: 'Max KB',
    widthPx: 'Width (px)',
    heightPx: 'Height (px)',
    addDop: 'Add Name & Date of Photo (DOP)',
    candidateName: 'Candidate Full Name',
    photoDate: 'Date of Photograph (DD-MM-YYYY)',
    cleanBg: 'Auto-Clean Background & Shadows',
    cleanBgDesc: 'Removes paper shadows and yellow tints to output crisp dark marks on white.',
    docInfo: 'Converts certificate photo or existing PDF into compliant single-page PDF (100 - 300 KB).',
    uploadHeading: (m: string) => `Upload ${m}`,
    uploadSub: 'Drag & drop image here, browse from device, or paste with Ctrl + V',
    chooseBtn: 'Choose File from Device',
    cropTool: 'Crop Tool',
    cropped: '✓ Cropped',
    reset: 'Reset',
    rotate: 'Rotate 90°',
    faceGuide: 'Face Guide',
    zoom: 'Zoom:',
    compressing: 'Compressing to exact KB...',
    compliantMsg: '100% compliant & ready to upload to official exam portals.',
    downloadBtn: (label: string, isPdf: boolean) => `Download Ready ${label} (${isPdf ? 'PDF' : 'JPG'})`,
    copyBtn: 'Copy to Clipboard',
    nextStepsHeading: 'Next Step: Upload directly to official recruitment portal:',
    ratingPrompt: 'How was your resizing experience?',
    ratingThankYou: 'Thank you for your rating! ⭐'
  },
  hi: {
    photoTab: 'फोटो',
    sigTab: 'हस्ताक्षर',
    docTab: 'दस्तावेज़ से PDF',
    thumbTab: 'अंगूठा',
    targetExam: 'परीक्षा चुनें',
    specHeader: 'परीक्षा साइज़ और कस्टम सेटिंग',
    minKb: 'न्यूनतम KB',
    maxKb: 'अधिकतम KB',
    widthPx: 'चौड़ाई (px)',
    heightPx: 'ऊंचाई (px)',
    addDop: 'नाम और फोटो की तारीख (DOP) जोड़ें',
    candidateName: 'उम्मीदवार का पूरा नाम',
    photoDate: 'फोटो खींचने की तारीख (DD-MM-YYYY)',
    cleanBg: 'बैकग्राउंड और छाया साफ करें',
    cleanBgDesc: 'मोबाइल कैमरे की छाया व पीलापन हटाकर सफेद कागज पर गहरा स्याही आउटपुट देता है।',
    docInfo: 'प्रमाणपत्र की फोटो या PDF फ़ाइल को मानक एकल-पृष्ठ 100 - 300 KB PDF में बदलता है।',
    uploadHeading: (m: string) => `${m} अपलोड करें`,
    uploadSub: 'यहाँ फ़ाइल खींचकर डालें, डिवाइस से चुनें, या Ctrl + V से पेस्ट करें',
    chooseBtn: 'डिवाइस से फ़ाइल चुनें',
    cropTool: 'क्रॉप टूल (Crop)',
    cropped: '✓ क्रॉप्ड',
    reset: 'रीसेट',
    rotate: '90° घुमाएं',
    faceGuide: 'चेहरा गाइड',
    zoom: 'ज़ूम:',
    compressing: 'सटीक KB में कंप्रेस हो रहा है...',
    compliantMsg: '100% सरकारी भर्ती पोर्टल के नियमों के अनुसार तैयार।',
    downloadBtn: (label: string, isPdf: boolean) => `तैयार ${label} डाउनलोड करें (${isPdf ? 'PDF' : 'JPG'})`,
    copyBtn: 'क्लिपबोर्ड में कॉपी करें',
    nextStepsHeading: 'अगला कदम: आधिकारिक भर्ती पोर्टल पर अपलोड करें:',
    ratingPrompt: 'आपका अनुभव कैसा रहा?',
    ratingThankYou: 'रेटिंग के लिए धन्यवाद! ⭐'
  }
};

export default function ResizerEngine({
  initialMode = 'photo',
  initialPresetId = 'ssc',
  initialAddDop
}: ResizerEngineProps = {}) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const t = translations[lang];

  const [mode, setMode] = useState<ResizerMode>(initialMode);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isCropped, setIsCropped] = useState<boolean>(false);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [showFaceGuidePreview, setShowFaceGuidePreview] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessImageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Preset settings
  const currentPreset = EXAM_PRESETS.find((p) => p.id === selectedPresetId) || EXAM_PRESETS[0];

  const getInitialConfig = () => {
    const preset = EXAM_PRESETS.find((p) => p.id === initialPresetId) || EXAM_PRESETS[0];
    if (initialMode === 'signature') return { w: preset.signature.widthPx, h: preset.signature.heightPx, min: preset.signature.minKb, max: preset.signature.maxKb };
    if (initialMode === 'document') return { w: 1200, h: 1600, min: 100, max: 300 };
    if (initialMode === 'thumb') return { w: 240, h: 240, min: 10, max: 50 };
    return { w: preset.photo.widthPx, h: preset.photo.heightPx, min: preset.photo.minKb, max: preset.photo.maxKb };
  };
  const init = getInitialConfig();

  // Custom adjustable parameters
  const [targetWidth, setTargetWidth] = useState<number>(init.w);
  const [targetHeight, setTargetHeight] = useState<number>(init.h);
  const [minKb, setMinKb] = useState<number>(init.min);
  const [maxKb, setMaxKb] = useState<number>(init.max);

  // Rotation & Zoom
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);

  // DOP (Date of Photo) parameters
  const [addDop, setAddDop] = useState<boolean>(
    initialAddDop !== undefined
      ? initialAddDop
      : Boolean(initialMode === 'photo' && currentPreset.photo.requiresDop)
  );
  const [candidateName, setCandidateName] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });

  // Signature / thumb enhancement
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
    if (mode === 'photo') {
      const config = currentPreset.photo;
      setTargetWidth(config.widthPx);
      setTargetHeight(config.heightPx);
      setMinKb(config.minKb);
      setMaxKb(config.maxKb);
      if (initialAddDop !== undefined && selectedPresetId === initialPresetId && mode === initialMode) {
        setAddDop(initialAddDop);
      } else {
        setAddDop(Boolean(currentPreset.photo.requiresDop));
      }
    } else if (mode === 'signature') {
      const config = currentPreset.signature;
      setTargetWidth(config.widthPx);
      setTargetHeight(config.heightPx);
      setMinKb(config.minKb);
      setMaxKb(config.maxKb);
      setAddDop(false);
    } else if (mode === 'document') {
      // Standard A4 document/certificate proportion (1200x1600 px), 100 KB to 300 KB PDF
      setTargetWidth(1200);
      setTargetHeight(1600);
      setMinKb(100);
      setMaxKb(300);
      setAddDop(false);
    } else if (mode === 'thumb') {
      // Left Thumb Impression (240x240 px), 10 KB to 50 KB JPG
      setTargetWidth(240);
      setTargetHeight(240);
      setMinKb(10);
      setMaxKb(50);
      setAddDop(false);
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
            setOriginalFile(pastedFile);
            setIsCropped(false);
            setPanX(0);
            setPanY(0);
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
          zoom,
          panX,
          panY
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
    zoom,
    panX,
    panY
  ]);

  const processIncomingFile = async (rawFile: File) => {
    try {
      if (rawFile.type === 'application/pdf' || rawFile.name.toLowerCase().endsWith('.pdf')) {
        setIsProcessing(true);
        setErrorMsg(
          lang === 'hi'
            ? 'PDF दस्तावेज़ पढ़ा जा रहा है...'
            : 'Reading certificate from PDF...'
        );
        const convertedFile = await convertPdfPageToImageFile(rawFile);
        setErrorMsg('');
        setFile(convertedFile);
        setOriginalFile(convertedFile);
        setIsCropped(false);
        setPanX(0);
        setPanY(0);
        setRotation(0);
        setZoom(1.0);
        setIsProcessing(false);
        return;
      }

      setErrorMsg('');
      setFile(rawFile);
      setOriginalFile(rawFile);
      setIsCropped(false);
      setPanX(0);
      setPanY(0);
      setRotation(0);
      setZoom(1.0);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(
        err?.message ||
          (lang === 'hi'
            ? 'फ़ाइल लोड करने में समस्या हुई। कृपया एक वैध इमेज या PDF अपलोड करें।'
            : 'Failed to process file. Please upload a standard JPG, PNG, or PDF file.')
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processIncomingFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processIncomingFile(dropped);
    }
  };

  const handleApplyCrop = (croppedFile: File) => {
    setFile(croppedFile);
    setIsCropped(true);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setZoom(1.0);
  };

  const handleResetOriginal = () => {
    if (originalFile) {
      setFile(originalFile);
      setIsCropped(false);
      setPanX(0);
      setPanY(0);
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
    const isPdf = result.format === 'application/pdf';
    const ext = isPdf ? 'pdf' : 'jpg';

    let prefix = 'Sarkari_Photo';
    if (mode === 'signature') prefix = 'Sarkari_Signature';
    else if (mode === 'document') prefix = 'Sarkari_Certificate';
    else if (mode === 'thumb') prefix = 'Sarkari_Thumb_LTI';

    a.download = `${prefix}_${cleanExam}_${result.sizeKb}KB.${ext}`;
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
    setOriginalFile(null);
    setIsCropped(false);
    setPanX(0);
    setPanY(0);
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
      {/* 1. Mode Switcher Bar + Language Toggle */}
      <div className="bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-800 space-y-2">
        {/* Top Mini-Header: Title + Language Toggle */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
              {lang === 'hi' ? 'अपलोड टूल चुनें' : 'Select Resizer Tool'}
            </span>
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors ${
                lang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('hi')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors ${
                lang === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* 4 Mode Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setMode('photo')}
            aria-label="Switch to Passport Photo Resizer mode"
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              mode === 'photo'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/70'
            }`}
          >
            <ImageIcon className={`w-4 h-4 shrink-0 ${mode === 'photo' ? 'text-white' : 'text-blue-400'}`} />
            <span>{lang === 'hi' ? 'फोटो' : 'Photo'}</span>
            <span className="text-[10px] font-medium opacity-85">(20-50K)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('signature')}
            aria-label="Switch to Signature Resizer mode"
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              mode === 'signature'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/70'
            }`}
          >
            <PenTool className={`w-4 h-4 shrink-0 ${mode === 'signature' ? 'text-white' : 'text-teal-400'}`} />
            <span>{lang === 'hi' ? 'हस्ताक्षर' : 'Signature'}</span>
            <span className="text-[10px] font-medium opacity-85">(10-20K)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('document')}
            aria-label="Switch to Doc to PDF Resizer mode"
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              mode === 'document'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/70'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${mode === 'document' ? 'text-white' : 'text-emerald-400'}`} />
            <span>{t.docTab}</span>
            <span className="text-[10px] font-medium opacity-85">(100-300K)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('thumb')}
            aria-label="Switch to Left Thumb Impression LTI mode"
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              mode === 'thumb'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/70'
            }`}
          >
            <Fingerprint className={`w-4 h-4 shrink-0 ${mode === 'thumb' ? 'text-white' : 'text-purple-400'}`} />
            <span>{lang === 'hi' ? 'अंगूठा' : 'Thumb'}</span>
            <span className="text-[10px] font-medium opacity-85">(10-50K)</span>
          </button>
        </div>
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

            {/* Signature & Thumb Mode Feature: Contrast Cleaner */}
            {(mode === 'signature' || mode === 'thumb') && (
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
                      {t.cleanBg}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      {t.cleanBgDesc}
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Document PDF Mode Note */}
            {mode === 'document' && (
              <div className="pt-2 border-t border-slate-100 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Document Standard</span>
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {t.docInfo}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upload, Processing & Download Deck (7 cols, order-1 on mobile for instant above-the-fold access) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 order-1 lg:order-2">
          {/* Mobile-Only Quick Exam Selector Bar */}
          <div className="lg:hidden flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">{t.targetExam}</span>
              <span className="text-xs font-black text-slate-900 block truncate max-w-[200px]">
                {currentPreset.name.split('(')[0]}
              </span>
              <span className="text-[10px] text-blue-600 font-bold block">
                {minKb} - {maxKb} KB {mode === 'document' ? 'PDF' : 'JPG'}
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

          {/* Error / Guidance Message when no file selected */}
          {!file && errorMsg && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone or Output View */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-3xl p-5 sm:p-12 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all flex flex-col items-center justify-center text-center shadow-xs min-h-[250px] sm:min-h-[380px]"
            >
              <input
                id="file-upload-input"
                ref={fileInputRef}
                type="file"
                aria-label="Upload photo, signature, or document file from device"
                accept={
                  mode === 'document'
                    ? '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*'
                    : '.jpg,.jpeg,.png,.webp,image/*'
                }
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 sm:mb-4 shadow-inner">
                {mode === 'document' ? (
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                ) : mode === 'thumb' ? (
                  <Fingerprint className="w-6 h-6 sm:w-8 sm:h-8" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 mb-1">
                {mode === 'document'
                  ? lang === 'hi'
                    ? 'मार्कशीट, प्रमाणपत्र या दस्तावेज़ अपलोड करें'
                    : 'Upload Marksheet, Certificate or Document'
                  : mode === 'thumb'
                  ? lang === 'hi'
                    ? 'अंगूठे का निशान (LTI) अपलोड करें'
                    : 'Upload Thumb Impression (LTI)'
                  : t.uploadHeading(mode === 'photo' ? t.photoTab : t.sigTab)}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-3 sm:mb-4 leading-relaxed">
                {mode === 'document'
                  ? lang === 'hi'
                    ? 'फोटो (JPG, PNG) या PDF फ़ाइल दोनों समर्थित हैं। स्वतः 100-300 KB PDF में बदल जाएगी।'
                    : 'Supports JPG, PNG photo or PDF document. Automatically resizes & locks to 100-300 KB PDF.'
                  : mode === 'thumb'
                  ? lang === 'hi'
                    ? 'सफेद कागज पर लगे अंगूठे के निशान की फोटो अपलोड करें।'
                    : 'Upload photo of your thumb impression on clean white paper.'
                  : t.uploadSub}
              </p>
              <button
                type="button"
                aria-label="Choose file from your phone or computer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t.chooseBtn}
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

              {/* Adjustments Toolbar: Crop, Rotate, Zoom & Face Guide */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Crop Tool Button */}
                  <button
                    type="button"
                    onClick={() => setIsCropModalOpen(true)}
                    aria-label="Crop and frame photo"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Crop Tool</span>
                  </button>

                  {/* Cropped Status Indicator & Reset */}
                  {isCropped && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-1 rounded-lg">
                      <span>✓ Cropped</span>
                      <button
                        type="button"
                        onClick={handleResetOriginal}
                        title="Revert back to uncropped original image"
                        className="text-blue-700 hover:text-blue-900 underline font-black ml-0.5 cursor-pointer"
                      >
                        Reset
                      </button>
                    </span>
                  )}

                  {/* Rotate Button */}
                  <button
                    type="button"
                    onClick={handleRotate}
                    aria-label="Rotate image 90 degrees clockwise"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rotate 90°</span>
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {rotation}°
                    </span>
                  )}

                  {/* Face Guide Toggle (in photo mode) */}
                  {mode === 'photo' && (
                    <button
                      type="button"
                      onClick={() => setShowFaceGuidePreview(!showFaceGuidePreview)}
                      aria-label="Toggle official 70-80% face guide overlay"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                        showFaceGuidePreview
                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Face Guide</span>
                    </button>
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
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-20 sm:w-28 accent-blue-600 cursor-pointer"
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
                        className="max-h-[280px] w-auto object-contain rounded-lg shadow-2xs block"
                      />

                      {/* Official 70-80% Face Guide Overlay */}
                      {mode === 'photo' && showFaceGuidePreview && (
                        <div className="absolute inset-2 pointer-events-none flex items-center justify-center">
                          <div className="w-[72%] h-[78%] rounded-full border-2 border-dashed border-amber-500 bg-amber-400/10 flex flex-col items-center justify-between py-2 shadow-inner">
                            <span className="text-[9px] font-black text-amber-950 bg-amber-200/90 px-1 rounded uppercase">
                              Head Top
                            </span>
                            <span className="text-[9px] font-black text-amber-950 bg-amber-200/90 px-1 rounded uppercase">
                              70-80% Face Zone
                            </span>
                            <span className="text-[9px] font-black text-amber-950 bg-amber-200/90 px-1 rounded uppercase">
                              Chin Line
                            </span>
                          </div>
                        </div>
                      )}
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
              {result && (() => {
                const isPdf = result.format === 'application/pdf';
                const modeLabel =
                  mode === 'photo'
                    ? lang === 'hi'
                      ? 'फोटो'
                      : 'Photo'
                    : mode === 'signature'
                    ? lang === 'hi'
                      ? 'हस्ताक्षर'
                      : 'Signature'
                    : mode === 'thumb'
                    ? lang === 'hi'
                      ? 'अंगूठे का निशान'
                      : 'Thumb Impression'
                    : lang === 'hi'
                    ? 'दस्तावेज़'
                    : 'Certificate';

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={handleDownload}
                        aria-label={`Download ready ${modeLabel}`}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
                      >
                        <Download className="w-5 h-5" />
                        <span>{t.downloadBtn(modeLabel, isPdf)}</span>
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
                      <span>✅ {t.compliantMsg}</span>
                    </div>

                    {/* Official Exam Portals Direct Link Bar */}
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200/90 space-y-2">
                      <span className="text-[11px] font-black text-slate-800 tracking-wide flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        {t.nextStepsHeading}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <a
                          href="https://ssc.gov.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                          <span>SSC Portal</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <a
                          href="https://upsconline.nic.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                          <span>UPSC OTR</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <a
                          href="https://rrbapply.gov.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                          <span>RRB Apply</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <a
                          href="https://ibps.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                          <span>IBPS Online</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <a
                          href="https://exams.nta.ac.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
                        >
                          <span>NTA Exams</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    </div>

                    {/* Genuine User Rating Feedback Widget */}
                    <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-center space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {ratingSubmitted ? t.ratingThankYou : t.ratingPrompt}
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
                );
              })()}
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

      {/* Interactive Aspect-Ratio Locked Crop Modal */}
      {file && (
        <CropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          file={originalFile || file}
          targetWidth={targetWidth}
          targetHeight={targetHeight}
          onApplyCrop={handleApplyCrop}
          mode={mode}
        />
      )}
    </div>
  );
}
