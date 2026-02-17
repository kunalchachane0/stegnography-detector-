
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult } from '../types';
import { getBitPlane, getNoiseFilter, getHistogramData, HistogramData } from '../utils/imageProcessing';
import { 
  ShieldAlert, 
  Search, 
  Layers, 
  Activity, 
  ArrowLeft,
  Download,
  ScanSearch,
  BarChart3,
  Terminal,
  Crosshair,
  Maximize2,
  // Fix: Added missing Info icon import
  Info
} from 'lucide-react';

interface Props {
  imageSrc: string;
  result: AnalysisResult | null;
  onReset: () => void;
}

const AnalysisDashboard: React.FC<Props> = ({ imageSrc, result, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPlane, setSelectedPlane] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<'R' | 'G' | 'B' | 'Y' | 'Cb' | 'Cr'>('R');
  const [bitPlaneUrl, setBitPlaneUrl] = useState<string>('');
  const [noiseUrl, setNoiseUrl] = useState<string>('');
  const [histogram, setHistogram] = useState<HistogramData>({ r: [], g: [], b: [] });
  const [activeTab, setActiveTab] = useState<'visual' | 'forensic' | 'ai' | 'histogram'>('ai');
  const [logs, setLogs] = useState<string[]>([]);
  const [inspectorData, setInspectorData] = useState<{ x: number, y: number, r: number, g: number, b: number, a: number } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

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
        
        addLog("Image loaded into forensic buffer.");
        addLog(`Dimensions: ${img.width}x${img.height}px`);
        updateAnalysis(canvas);
      }
    };
  }, [imageSrc]);

  const updateAnalysis = (canvas: HTMLCanvasElement) => {
    addLog("Updating bit-plane projections...");
    setBitPlaneUrl(getBitPlane(canvas, selectedChannel, selectedPlane));
    setNoiseUrl(getNoiseFilter(canvas));
    setHistogram(getHistogramData(canvas));
  };

  useEffect(() => {
    if (canvasRef.current) {
      setBitPlaneUrl(getBitPlane(canvasRef.current, selectedChannel, selectedPlane));
      addLog(`Viewing ${selectedChannel} Bit ${selectedPlane}`);
    }
  }, [selectedPlane, selectedChannel]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvasRef.current.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvasRef.current.height);
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      setInspectorData({ x, y, r: p[0], g: p[1], b: p[2], a: p[3] });
    }
  };

  const renderHistogram = () => {
    const maxVal = Math.max(...histogram.r, ...histogram.g, ...histogram.b, 1);
    const height = 150;
    const width = 256;

    const getPath = (data: number[]) => {
      if (data.length === 0) return "";
      return data.map((val, i) => `${i},${height - (val / maxVal) * height}`).join(' L ');
    };

    return (
      <div className="w-full bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          Color Space Distribution
        </h3>
        <div className="relative h-[160px] w-full bg-black/50 rounded border border-slate-800 p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-aspect-ratio" preserveAspectRatio="none">
            <path d={`M 0,${height} L ${getPath(histogram.r)} L ${width},${height} Z`} fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
            <path d={`M 0,${height} L ${getPath(histogram.g)} L ${width},${height} Z`} fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="1" />
            <path d={`M 0,${height} L ${getPath(histogram.b)} L ${width},${height} Z`} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 italic">Spikes or "combing" in histograms can indicate color-table based steganography.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col gap-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onReset} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-sm uppercase tracking-tighter">Exit forensic session</span>
          </button>
          <div className="flex items-center gap-4">
             <div className="px-4 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${result ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
                  {result ? 'AI Analysis Complete' : 'AI Processing...'}
                </span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visualizer */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
              {[
                {id: 'ai', icon: ScanSearch, label: 'Summary'},
                {id: 'visual', icon: Layers, label: 'Bit Planes'},
                {id: 'forensic', icon: Activity, label: 'Noise'},
                {id: 'histogram', icon: BarChart3, label: 'Stats'}
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div 
              className="relative group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[500px] flex items-center justify-center cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setInspectorData(null)}
            >
              {activeTab === 'ai' && <img src={imageSrc} className="max-w-full max-h-[600px] object-contain" alt="Target" />}
              {activeTab === 'visual' && <img src={bitPlaneUrl} className="max-w-full max-h-[600px] object-contain" alt="Bit Plane" />}
              {activeTab === 'forensic' && <img src={noiseUrl} className="max-w-full max-h-[600px] object-contain" alt="Noise Analysis" />}
              {activeTab === 'histogram' && (
                <div className="w-full h-full p-12 flex items-center justify-center">
                   {renderHistogram()}
                </div>
              )}

              {/* Inspector Overlay */}
              {inspectorData && (
                <div className="absolute top-4 left-4 bg-slate-950/90 border border-slate-800 p-3 rounded-lg backdrop-blur-md pointer-events-none z-20 font-mono text-[10px] min-w-[140px] shadow-2xl">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                    <Crosshair className="w-3 h-3 text-indigo-400" />
                    <span className="text-slate-300">X:{inspectorData.x} Y:{inspectorData.y}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-red-400">R:</span> <span>{inspectorData.r}</span></div>
                    <div className="flex justify-between"><span className="text-green-400">G:</span> <span>{inspectorData.g}</span></div>
                    <div className="flex justify-between"><span className="text-blue-400">B:</span> <span>{inspectorData.b}</span></div>
                    <div className="flex justify-between text-slate-500 italic mt-2">
                       <span>Hex:</span>
                       <span>#{inspectorData.r.toString(16).padStart(2,'0')}{inspectorData.g.toString(16).padStart(2,'0')}{inspectorData.b.toString(16).padStart(2,'0')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls for Visual Analysis */}
            {activeTab === 'visual' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-1 bg-black/30 p-1 rounded-lg border border-slate-800">
                    {(['R', 'G', 'B', 'Y', 'Cb', 'Cr'] as const).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${selectedChannel === ch ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                  <div className="h-4 w-px bg-slate-800" />
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlane(p)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-mono rounded border transition-all ${selectedPlane === p ? 'bg-white text-slate-950 font-bold border-white' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono leading-relaxed bg-black/20 p-3 rounded">
                  <Info className="w-3 h-3 inline mr-2 text-indigo-400" />
                  STATIONARY ANALYSIS: LSB (Bit 0) typically contains high-entropy "salt" noise in steganographic images. 
                  Check Cb/Cr bit 0 for modern JPEG-based hiding techniques.
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Report & Forensic Console */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* AI Result Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Forensic Assessment</h2>
              </div>
              
              {!result ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <ScanSearch className="w-4 h-4 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Running AI Classifiers...</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className={`p-4 rounded-lg border flex flex-col gap-1 ${
                    result.likelihood === 'Detected' ? 'bg-red-500/10 border-red-500/50' : 
                    result.likelihood === 'High' ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Threat Level</span>
                    <span className={`text-xl font-bold font-mono ${
                      result.likelihood === 'Detected' ? 'text-red-500' : 'text-indigo-400'
                    }`}>{result.likelihood}</span>
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.reasoning}
                  </div>
                  <div className="space-y-2">
                    {result.anomalies.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-500 bg-black/20 p-2 rounded border border-slate-800/50">
                        <span className="text-indigo-400">►</span> {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Forensic Console (Authenticity Factor) */}
            <div className="flex-1 bg-black border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 min-h-[300px]">
               <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Terminal className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Forensic Console</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  </div>
               </div>
               <div className="flex-1 font-mono text-[10px] text-emerald-500/80 overflow-y-auto space-y-1 custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className={i === 0 ? "text-emerald-400 animate-pulse" : ""}>
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && <div className="text-slate-700 italic">No activity detected...</div>}
               </div>
            </div>

          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default AnalysisDashboard;
