
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult } from '../types';
import { 
  getBitPlane, 
  getNoiseFilter, 
  getHistogramData, 
  calculateEntropyMap,
  sonifyBitPlane,
  HistogramData 
} from '../utils/imageProcessing';
import { 
  ShieldAlert, 
  Layers, 
  Activity, 
  ArrowLeft,
  Crosshair,
  Zap,
  Eye,
  Radar,
  LineChart,
  RefreshCcw,
  Maximize2,
  Volume2,
  Play,
  Square
} from 'lucide-react';

interface Props {
  imageSrc: string;
  rawBuffer: ArrayBuffer | null;
  mimeType: string;
  result: AnalysisResult | null;
  onReset: () => void;
}

const AnalysisDashboard: React.FC<Props> = ({ imageSrc, rawBuffer, mimeType, result, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [activeTab, setActiveTab] = useState<'ai' | 'visual' | 'forensic' | 'histogram' | 'entropy' | 'audio'>('ai');
  const [selectedPlane, setSelectedPlane] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<'R' | 'G' | 'B'>('R');
  const [bitPlaneUrl, setBitPlaneUrl] = useState<string>('');
  const [noiseUrl, setNoiseUrl] = useState<string>('');
  const [entropyUrl, setEntropyUrl] = useState<string>('');
  const [histogram, setHistogram] = useState<HistogramData>({ r: [], g: [], b: [] });
  const [inspector, setInspector] = useState<{ x: number, y: number, pixels: any[] } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        setBitPlaneUrl(getBitPlane(canvas, selectedChannel, selectedPlane));
        setNoiseUrl(getNoiseFilter(canvas));
        setEntropyUrl(calculateEntropyMap(canvas));
        setHistogram(getHistogramData(canvas));
      }
    };
    return () => stopAudio();
  }, [imageSrc]);

  useEffect(() => {
    if (canvasRef.current) {
      setBitPlaneUrl(getBitPlane(canvasRef.current, selectedChannel, selectedPlane));
    }
    if (isPlaying) stopAudio();
  }, [selectedPlane, selectedChannel]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleSonify = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (!canvasRef.current) return;
    
    setIsPlaying(true);
    const buffer = await sonifyBitPlane(canvasRef.current, selectedChannel, selectedPlane);
    
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(audioCtxRef.current.destination);
    source.start();
    audioSourceRef.current = source;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const area = 2;
      const pixels = [];
      for (let dy = -area; dy <= area; dy++) {
        for (let dx = -area; dx <= area; dx++) {
          const p = ctx.getImageData(x + dx, y + dy, 1, 1).data;
          pixels.push({ r: p[0], g: p[1], b: p[2], bits: [p[0]&1, p[1]&1, p[2]&1] });
        }
      }
      setInspector({ x: e.clientX, y: e.clientY, pixels });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 flex flex-col gap-8 font-sans animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <header className="flex justify-between items-center bg-slate-900/50 p-5 rounded-[2rem] border border-slate-800 backdrop-blur-xl">
          <button onClick={onReset} className="flex items-center gap-3 text-slate-400 hover:text-white transition-all uppercase font-black text-xs tracking-widest pl-4">
            <ArrowLeft className="w-5 h-5" /> Exit Forensics
          </button>
          <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-slate-800">
            {['ai', 'visual', 'forensic', 'entropy', 'histogram'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div 
              className="relative bg-black rounded-[3rem] overflow-hidden border border-slate-800/50 h-[650px] flex items-center justify-center cursor-none group shadow-2xl"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setInspector(null)}
            >
              {activeTab === 'ai' && <img src={imageSrc} className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-500" alt="Target" />}
              {activeTab === 'visual' && <img src={bitPlaneUrl} className="max-w-full max-h-full object-contain animate-in fade-in duration-300" alt="Plane" />}
              {activeTab === 'forensic' && <img src={noiseUrl} className="max-w-full max-h-full object-contain animate-in fade-in duration-300" alt="Noise" />}
              {activeTab === 'entropy' && <img src={entropyUrl} className="max-w-full max-h-full object-contain animate-in fade-in duration-300" alt="Entropy" />}
              {activeTab === 'histogram' && (
                <div className="flex flex-col items-center gap-8 opacity-40">
                  <LineChart className="w-24 h-24 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.4em]">Scanning pair-values...</span>
                </div>
              )}

              {/* Forensic Loupe */}
              {inspector && (
                <div 
                  className="fixed pointer-events-none z-[100] w-64 h-64 rounded-full border-4 border-indigo-500 bg-slate-900/95 backdrop-blur-xl shadow-[0_0_50px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden"
                  style={{ left: inspector.x + 30, top: inspector.y - 128 }}
                >
                  <div className="grid grid-cols-5 h-full">
                    {inspector.pixels.map((p, i) => (
                      <div key={i} className="flex flex-col border-[0.5px] border-white/5" style={{ backgroundColor: `rgb(${p.r},${p.g},${p.b})` }}>
                        {i === 12 && <div className="m-auto w-2 h-2 bg-white rounded-full shadow-[0_0_12px_white]" />}
                      </div>
                    ))}
                  </div>
                  <div className="bg-indigo-600 p-4 text-[11px] font-black text-white flex justify-between items-center px-5">
                    <span className="tracking-widest">LSB: {inspector.pixels[12].bits.join('')}</span>
                    <span className="opacity-70 font-mono">{inspector.pixels[12].r},{inspector.pixels[12].g},{inspector.pixels[12].b}</span>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'visual' && (
              <div className="flex flex-col md:flex-row gap-8 p-10 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] animate-in slide-in-from-bottom-6 duration-700 backdrop-blur-xl">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 block px-2">Channel Extraction</span>
                  <div className="flex gap-3">
                    {['R', 'G', 'B'].map(c => (
                      <button key={c} onClick={() => setSelectedChannel(c as any)} className={`px-7 py-3 rounded-xl text-xs font-black transition-all ${selectedChannel === c ? 'bg-indigo-600 text-white shadow-xl' : 'bg-black/40 text-slate-500 border border-slate-800'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="h-16 w-px bg-slate-800 self-center hidden md:block" />
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 block px-2">Bit Modulation Plane (0-7)</span>
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
                    {[0,1,2,3,4,5,6,7].map(p => (
                      <button key={p} onClick={() => setSelectedPlane(p)} className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-black transition-all ${selectedPlane === p ? 'bg-white text-black shadow-xl scale-110' : 'bg-black/40 border-slate-800 text-slate-500'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="h-16 w-px bg-slate-800 self-center hidden md:block" />
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 block px-2">Auditory Probe</span>
                  <button 
                    onClick={handleSonify}
                    className={`w-full md:w-auto px-10 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isPlaying ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'}`}
                  >
                    {isPlaying ? <Square className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    {isPlaying ? 'Mute' : 'Listen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right-8 duration-1000">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-10 backdrop-blur-xl">
              <div className="flex items-center gap-4 text-indigo-400 border-b border-slate-800 pb-8">
                <div className="p-4 bg-indigo-600/10 rounded-2xl"><ShieldAlert className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Reasoning Engine</h3>
                  <h2 className="text-base font-black">Expert Conclusion</h2>
                </div>
              </div>
              {!result ? (
                <div className="py-24 flex flex-col items-center gap-8 text-slate-600">
                  <RefreshCcw className="w-12 h-12 animate-spin opacity-40" />
                  <span className="text-xs font-black uppercase tracking-[0.4em]">Analyzing Traces...</span>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                   <div className={`p-8 rounded-2xl border flex flex-col gap-3 ${result.likelihood === 'Detected' ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-slate-950/80 border-slate-800'}`}>
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Signal Presence Confidence</span>
                    <span className={`text-3xl font-black font-mono tracking-tighter ${result.likelihood === 'Detected' ? 'text-red-500' : 'text-indigo-400'}`}>{result.likelihood}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-loose font-medium bg-black/30 p-8 rounded-2xl border border-white/5">{result.reasoning}</p>
                  <div className="space-y-5">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest block">Detected Indicators</span>
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="flex gap-4 text-sm text-slate-500 font-bold items-start group p-1">
                        <span className="text-indigo-500 group-hover:scale-125 transition-transform">▸</span> {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-indigo-600 rounded-[2.5rem] p-12 text-white shadow-[0_0_50px_rgba(79,70,229,0.3)] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-12 opacity-10 scale-[2] rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                  <Zap className="w-24 h-24" />
               </div>
               <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <Maximize2 className="w-7 h-7" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Forensic Logic</h3>
                  </div>
                  <p className="text-sm opacity-90 leading-relaxed font-bold italic">"Non-random patterns in the noise floor are characteristic of digital signals. Modern steganography creates broadband static that requires auditory and visual cross-referencing to confirm protocol types."</p>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-2/3 animate-pulse shadow-[0_0_15px_white]" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AnalysisDashboard;
