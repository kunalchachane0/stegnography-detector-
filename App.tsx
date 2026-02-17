
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Download,
  Upload,
  RefreshCcw,
  AlertCircle,
  FileText,
  ImageIcon,
  Copy,
  Github,
  Search,
  Activity,
  CheckCircle2,
  Key,
  Eye,
  EyeOff,
  ScanSearch,
  FileSearch,
  Music,
  Volume2,
  Mic,
  BarChart3,
  Fingerprint,
  Terminal,
  Cpu,
  ShieldAlert,
  Zap,
  ChevronRight,
  Binary,
  Type,
  File as FileIcon
} from 'lucide-react';
import { calculateCapacity, encodeMessage, decodeMessage } from './utils/stegoEngine';
import { encryptData, decryptData } from './utils/crypto';
import { analyzeImageWithAI } from './services/geminiService';
import { getMetadataInfo, calculateForensicStats, ForensicStats } from './utils/imageProcessing';
import { encodeAudioLSB, decodeAudioLSB, calculateAudioCapacity } from './utils/audioStego';
import AnalysisDashboard from './components/AnalysisDashboard';
import { AnalysisResult } from './types';

// Hacking Intro Sequence Component
const HackingIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<'logging' | 'authorizing' | 'granted'>('logging');
  
  const bootMessages = [
    "INITIALIZING STEGNOSAFE KERNEL V4.0.2...",
    "CONNECTING TO SECURE NODE [127.8.4.1]...",
    "BYPASSING METADATA FIREWALLS...",
    "INJECTING LSB MODULATION MODULES...",
    "SCATTERING BIT-PLANE INDICES...",
    "MOUNTING AES-256 GCM SHIELDS...",
    "SCANNING LOCAL CLUSTERS...",
    "ESTABLISHING SECURE PROTOCOL...",
    "CLEANING TEMPORARY REGISTRIES...",
    "READY TO BREACH."
  ];

  useEffect(() => {
    let currentLog = 0;
    const logInterval = setInterval(() => {
      if (currentLog < bootMessages.length) {
        setLogs(prev => [...prev, `[SYSTEM] ${bootMessages[currentLog]}`]);
        currentLog++;
      } else {
        clearInterval(logInterval);
        setTimeout(() => setPhase('authorizing'), 800);
      }
    }, 250);

    return () => clearInterval(logInterval);
  }, []);

  useEffect(() => {
    if (phase === 'authorizing') {
      setTimeout(() => setPhase('granted'), 1500);
    }
    if (phase === 'granted') {
      setTimeout(onComplete, 1200);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center font-mono overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#4f46e5_0%,_transparent_70%)] animate-pulse" />
      </div>

      <div className="w-full max-w-2xl px-12 space-y-8 relative z-10">
        {phase === 'logging' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {logs.map((log, i) => (
                <span className="text-indigo-500">{'>>'}</span>
            ))}
            <div className="flex gap-4 text-xs font-black animate-pulse">
              <span className="text-indigo-500">{'>>'}</span>
              <span className="text-white">_</span>
            </div>
          </div>
        )}

        {phase === 'authorizing' && (
          <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-3xl border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                <Fingerprint className="w-16 h-16 animate-pulse" />
              </div>
              <div className="absolute inset-x-0 -bottom-4 h-0.5 bg-indigo-500 animate-[bounce_2s_infinite]" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.4em]">Biometric Auth</h2>
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Verifying Access Keys...</p>
            </div>
          </div>
        )}

        {phase === 'granted' && (
          <div className="flex flex-col items-center gap-8 animate-in scale-110 duration-700">
             <div className="w-32 h-32 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-20 h-20" />
             </div>
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-[0.5em] italic">Access Granted</h2>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-[0.3em]">Protocol Unlocked</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
         <div className="h-px w-full bg-white/5 animate-[glitch_4s_infinite]" />
         <div className="h-px w-full bg-indigo-500/10 animate-[glitch_7s_infinite_reverse]" />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [modality, setModality] = useState<'image' | 'audio'>('image');
  const [view, setView] = useState<'hub' | 'forensics'>('hub');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  
  // Image State
  const [image, setImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [stegoImage, setStegoImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [capacity, setCapacity] = useState(0);

  // Audio State
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null);
  const [stegoAudio, setStegoAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Shared State
  const [payloadType, setPayloadType] = useState<'text' | 'file'>('text');
  const [message, setMessage] = useState('');
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string; raw?: Uint8Array } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [stats, setStats] = useState<ForensicStats | null>(null);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'bg-[#0f172a] text-slate-100 transition-colors duration-500' : 'bg-slate-50 text-slate-900 transition-colors duration-500';
  }, [theme]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleFile = async (file: File) => {
    setResult(null);
    setRawFile(file);
    const meta = await getMetadataInfo(file);
    setMetadata(meta);

    if (file.type.startsWith('image/')) {
      setModality('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImage(base64);
          setCapacity(calculateCapacity(img.width, img.height));
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          setStats(calculateForensicStats(canvas));

          setStegoImage(null);
          setAudioBuffer(null);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/') || file.name.endsWith('.wav')) {
      setModality('audio');
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = e.target?.result as ArrayBuffer;
        setAudioBuffer(buf);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
        setCapacity(calculateAudioCapacity(buf));
        setStegoAudio(null);
        setImage(null);
        setStegoImage(null);
        setStats(null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setResult({ type: 'error', text: 'Unsupported file type. Use Image or WAV.' });
    }
  };

  const handleEncode = async () => {
    if (payloadType === 'text' && !message) return;
    if (payloadType === 'file' && !secretFile) return;

    setIsProcessing(true);
    setResult(null);
    try {
      let finalPayload: Uint8Array;
      if (payloadType === 'text') {
        finalPayload = new TextEncoder().encode(message);
      } else {
        const buf = await secretFile!.arrayBuffer();
        finalPayload = new Uint8Array(buf);
      }

      if (password) {
        finalPayload = await encryptData(finalPayload, password);
      }

      if (modality === 'image' && image) {
        const img = new Image();
        img.src = image;
        await new Promise((res) => (img.onload = res));
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const encoded = encodeMessage(imageData, finalPayload, password);
        ctx.putImageData(encoded, 0, 0);
        setStegoImage(canvas.toDataURL('image/png'));
        setResult({ type: 'success', text: `Scattered LSB seal active. ${finalPayload.length} bytes hidden.` });
        setStats(calculateForensicStats(canvas));
      } else if (modality === 'audio' && audioBuffer) {
        const encodedBuf = encodeAudioLSB(audioBuffer, finalPayload);
        const blob = new Blob([encodedBuf], { type: 'audio/wav' });
        setStegoAudio(blob);
        setResult({ type: 'success', text: `Audio modulated. ${finalPayload.length} bytes hidden in PCM stream.` });
      }
    } catch (err: any) {
      setResult({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecode = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      let decodedBytes: Uint8Array;
      if (modality === 'image' && image) {
        const img = new Image();
        img.src = image;
        await new Promise((res) => (img.onload = res));
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        decodedBytes = decodeMessage(imageData, password);
      } else if (modality === 'audio' && audioBuffer) {
        decodedBytes = decodeAudioLSB(audioBuffer);
      } else {
        throw new Error("No carrier loaded.");
      }

      const finalBytes = password ? await decryptData(decodedBytes, password) : decodedBytes;
      
      let textPreview = "";
      try {
        textPreview = new TextDecoder().decode(finalBytes);
      } catch {
        textPreview = "[Binary Stream - Download to Recover]";
      }

      setResult({ type: 'success', text: textPreview, raw: finalBytes });
    } catch (err: any) {
      setResult({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForensicsTrigger = async () => {
    if (!image || !rawFile) return;
    setView('forensics');
    setIsProcessing(true);
    try {
      const result = await analyzeImageWithAI(image, rawFile.type);
      setAiResult(result);
    } catch (err: any) {
      console.error("AI Forensic analysis reported error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadRecovered = () => {
    if (!result?.raw) return;
    const blob = new Blob([result.raw], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recovered_payload_${Date.now()}.bin`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setImage(null); setAudioBuffer(null); setRawFile(null); setMetadata(null);
    setMessage(''); setSecretFile(null); setPassword(''); setStegoImage(null); setStegoAudio(null);
    setResult(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null);
    setCapacity(0); setStats(null);
  };

  if (isBooting) {
    return <HackingIntro onComplete={() => setIsBooting(false)} />;
  }

  if (view === 'forensics' && image) {
    return <AnalysisDashboard 
      imageSrc={image} 
      rawBuffer={null} 
      mimeType={rawFile?.type || ''} 
      result={aiResult} 
      onReset={() => { setView('hub'); setAiResult(null); }} 
    />;
  }

  return (
    <div className={`min-h-screen transition-all duration-500 font-sans ${theme === 'dark' ? 'dark text-slate-100 bg-[#020617]' : 'text-slate-900 bg-slate-50'}`}>
      <header className="border-b border-slate-200 dark:border-slate-800/50 backdrop-blur-xl sticky top-0 z-50 px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Stegno<span className="text-indigo-500">Safe</span></h1>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase">Digital Forensics Suite</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => { setModality('image'); resetAll(); }} className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-xs font-black uppercase transition-all ${modality === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
              <ImageIcon className="w-4 h-4" /> Image
            </button>
            <button onClick={() => { setModality('audio'); resetAll(); }} className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-xs font-black uppercase transition-all ${modality === 'audio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
              <Music className="w-4 h-4" /> Audio
            </button>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3.5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
            {theme === 'dark' ? <Sun className="w-5.5 h-5.5 text-amber-400" /> : <Moon className="w-5.5 h-5.5 text-indigo-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 space-y-12">
        <div className="flex flex-col items-center gap-8">
          <div className="flex bg-white dark:bg-slate-900/40 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            {['encode', 'decode'].map((t: any) => (
              <button key={t} onClick={() => { setActiveTab(t); setResult(null); setStegoImage(null); setStegoAudio(null); }} className={`px-14 py-4 rounded-xl font-black text-sm uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${activeTab === t ? 'bg-indigo-600 text-white shadow-2xl' : 'text-slate-500 hover:text-indigo-400'}`}>
                {t === 'encode' ? <Lock className="w-4.5 h-4.5" /> : <Unlock className="w-4.5 h-4.5" />} {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* LEFT COLUMN: Input Control & Stats */}
          <section className="lg:col-span-4 space-y-8">
            {/* Stats Panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-md shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                  <BarChart3 className="w-32 h-32" />
               </div>
               <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Forensic Console</h2>
               </div>

               <div className="space-y-6 relative z-10">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Entropy Level</span>
                        <div className="text-2xl font-mono font-black text-indigo-400">{stats ? stats.entropy : '---'} <span className="text-xs opacity-40">sh</span></div>
                     </div>
                     <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">LSB Variance</span>
                        <div className="text-2xl font-mono font-black text-emerald-400">{stats ? (stats.lsbVariance * 100).toFixed(2) : '---'}%</div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                        <span>Structural Integrity</span>
                        <span className={`text-sm ${stats && stats.integrityScore < 90 ? 'text-amber-500' : 'text-emerald-500'}`}>{stats ? `${stats.integrityScore}%` : 'SECURE'}</span>
                     </div>
                     <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${stats && stats.integrityScore < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${stats ? stats.integrityScore : 100}%` }} 
                        />
                     </div>
                  </div>

                  <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-4">
                     <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Live Diagnostics</span>
                     </div>
                     <div className="font-mono text-xs space-y-2.5 text-slate-500">
                        <div className="flex justify-between"><span>MODULATION:</span> <span className="text-slate-300">SCATTERED LSB</span></div>
                        <div className="flex justify-between"><span>ECC STATUS:</span> <span className="text-emerald-500">ACTIVE</span></div>
                        <div className="flex justify-between"><span>SEEDING:</span> <span className={password ? 'text-emerald-500' : 'text-amber-500'}>{password ? 'LOCKED' : 'WEAK'}</span></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Password Panel */}
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[3rem] p-10 shadow-2xl backdrop-blur-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="p-4 bg-indigo-600/10 rounded-2xl text-indigo-500"><Key className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Protocol Seeding</h3>
                  <h2 className="text-base font-black">Cryptographic Keys</h2>
                </div>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password for encryption..."
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl py-6 px-8 text-sm font-mono outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors">
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </section>

          {/* MIDDLE COLUMN: Carrier Preview */}
          <section className="lg:col-span-5 space-y-8">
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[3rem] p-10 shadow-2xl backdrop-blur-sm relative group overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-indigo-500" /> Carrier Hub
                </h2>
                {modality === 'image' && image && (
                  <button onClick={handleForensicsTrigger} className="px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center gap-2 group/btn">
                    <ScanSearch className="w-5 h-5 group-hover/btn:scale-110 transition-transform" /> Depth Scan
                  </button>
                )}
              </div>
              
              <div 
                className={`flex-1 min-h-[400px] border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-8 transition-all cursor-pointer overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('mainFile')?.click()}
              >
                {modality === 'image' && image ? (
                  <img src={image} className="w-full max-h-[400px] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95" />
                ) : modality === 'audio' && audioUrl ? (
                  <div className="w-full px-12 space-y-8 flex flex-col items-center">
                    <div className="w-28 h-28 bg-indigo-600/10 rounded-full flex items-center justify-center animate-pulse">
                      <Volume2 className="w-12 h-12 text-indigo-500" />
                    </div>
                    <audio src={audioUrl} controls className="w-full filter invert opacity-80" />
                  </div>
                ) : (
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Upload className="w-10 h-10 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-base font-black uppercase tracking-widest opacity-80">Load {modality} Source</p>
                      <p className="text-sm text-slate-500 mt-3 font-medium">Drag & drop or browse local storage</p>
                    </div>
                  </div>
                )}
                <input type="file" id="mainFile" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {metadata && (
                <div className="mt-8 grid grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-black/40 rounded-3xl border border-slate-200 dark:border-white/5 font-mono text-xs uppercase font-bold">
                  <div className="flex flex-col gap-2"><span className="opacity-40 text-indigo-500">FORMAT</span><span className="truncate">{metadata.type.split('/')[1] || 'RAW'}</span></div>
                  <div className="flex flex-col gap-2"><span className="opacity-40 text-indigo-500">CAPACITY</span><span className="">{capacity ? `${capacity.toLocaleString()} B` : 'SCANNING...'}</span></div>
                  <div className="flex flex-col gap-2"><span className="opacity-40 text-indigo-500">RESOLVE</span><span className="text-emerald-500">VALIDATED</span></div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Signal Terminal */}
          <section className="lg:col-span-3 flex flex-col gap-8">
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-[3rem] p-10 shadow-2xl backdrop-blur-sm flex-1 flex flex-col gap-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-600/10 rounded-2xl text-indigo-500"><FileText className="w-6 h-6" /></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Payload</h3>
                </div>
                {activeTab === 'encode' && (
                  <div className="flex bg-black/40 rounded-xl p-1 border border-slate-800">
                    <button onClick={() => setPayloadType('text')} className={`p-2 rounded-lg transition-all ${payloadType === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`} title="Text Mode"><Type className="w-4 h-4" /></button>
                    <button onClick={() => setPayloadType('file')} className={`p-2 rounded-lg transition-all ${payloadType === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`} title="File Mode"><Binary className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col">
                {activeTab === 'encode' ? (
                  payloadType === 'text' ? (
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter secret message to hide..."
                      className="flex-1 w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-sm font-mono outline-none focus:border-indigo-500/50 resize-none custom-scrollbar leading-relaxed shadow-inner"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-all cursor-pointer" onClick={() => document.getElementById('payloadFileInput')?.click()}>
                      <input type="file" id="payloadFileInput" className="hidden" onChange={(e) => setSecretFile(e.target.files?.[0] || null)} />
                      {secretFile ? (
                        <div className="flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
                          <FileIcon className="w-12 h-12 text-indigo-500" />
                          <div>
                            <p className="text-xs font-black uppercase text-white truncate max-w-[150px]">{secretFile.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{(secretFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <Upload className="w-10 h-10" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Select Secret File</p>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex-1 bg-black/60 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center gap-8 border border-white/5 shadow-inner">
                    {result?.type === 'success' ? (
                      <div className="w-full space-y-6 animate-in fade-in duration-500">
                        <div className="bg-slate-950/80 p-8 rounded-2xl border border-emerald-500/20 font-mono text-xs text-emerald-400 break-all leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner text-left">{result.text}</div>
                        <div className="flex gap-2">
                           {result.text !== "[Binary Stream - Download to Recover]" && (
                             <button onClick={() => navigator.clipboard.writeText(result.text)} className="flex-1 py-4.5 bg-emerald-600/10 border border-emerald-500/40 text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-emerald-600/20 transition-all active:scale-95">Copy Text</button>
                           )}
                           <button onClick={handleDownloadRecovered} className="flex-1 py-4.5 bg-indigo-600/10 border border-indigo-500/40 text-indigo-400 rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-indigo-600/20 transition-all active:scale-95">Download Binary</button>
                        </div>
                      </div>
                    ) : (
                      <div className="opacity-10 flex flex-col items-center gap-6 text-white">
                        <Mic className="w-24 h-24 animate-pulse" />
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 text-center">Monitoring Frequency</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                disabled={!rawFile || isProcessing || (activeTab === 'encode' && (payloadType === 'text' ? !message : !secretFile))}
                onClick={activeTab === 'encode' ? handleEncode : handleDecode}
                className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.97] hover:brightness-110 ${
                  activeTab === 'encode' ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-emerald-600 text-white shadow-emerald-500/30'
                } disabled:opacity-20 disabled:cursor-not-allowed`}
              >
                {isProcessing ? <RefreshCcw className="w-6 h-6 animate-spin" /> : activeTab === 'encode' ? <ShieldCheck className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                {activeTab === 'encode' ? `Embed Payload` : `Execute Recovery`}
              </button>

              {(stegoImage || stegoAudio) && (
                <div className="pt-10 border-t border-slate-100 dark:border-slate-800/50 text-center space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                  <div className="inline-block p-8 bg-white dark:bg-black/40 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
                    {stegoImage ? (
                      <img src={stegoImage} className="max-h-[150px] rounded-3xl shadow-2xl mb-8 mx-auto border border-white/5" />
                    ) : (
                      <div className="mb-8 p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex flex-col items-center gap-3">
                        <Volume2 className="w-12 h-12 text-indigo-500" />
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = stegoImage || URL.createObjectURL(stegoAudio!);
                        link.download = `stegosafe_${Date.now()}.${modality === 'image' ? 'png' : 'wav'}`;
                        link.click();
                      }}
                      className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
                    >
                      <Download className="w-5.5 h-5.5" /> Download Stego-Object
                    </button>
                  </div>
                </div>
              )}

              {result?.type === 'error' && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-4">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" /> {result.text}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-16 border-t border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-10 text-slate-500 text-xs font-bold uppercase tracking-[0.1em] mt-12">
         <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <span>&copy; 2026 StegnoSafe Labs // Forensic Protocol</span>
            </div>
            <span className="text-slate-400 dark:text-slate-500 ml-8">Developed by <span className="text-indigo-500 dark:text-indigo-400 font-black">Kunal Chachane</span></span>
         </div>
      </footer>
    </div>
  );
};

export default App;
