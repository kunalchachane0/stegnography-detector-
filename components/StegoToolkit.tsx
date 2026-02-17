
import React, { useState, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Lock, 
  Unlock, 
  MessageSquare, 
  ShieldCheck, 
  AlertCircle,
  Copy,
  RefreshCcw,
  Binary,
  Layers,
  Search,
  Zap,
  Trash2,
  Scan,
  FileSearch,
  CheckCircle,
  Eye,
  Activity,
  EyeOff
} from 'lucide-react';
import { encodeLSB, decodeLSB, appendEOFData, detectTrailingData, stripEOFData, getPixelDiff, getImageCapacity } from '../utils/imageProcessing';

interface Props {
  onBack: () => void;
}

const StegoToolkit: React.FC<Props> = ({ onBack }) => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [method, setMethod] = useState<'lsb' | 'eof'>('lsb');
  const [image, setImage] = useState<string | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [message, setMessage] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [diffImage, setDiffImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [capacity, setCapacity] = useState<number>(0);
  const [showDiff, setShowDiff] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processFile = useCallback((file: File) => {
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImage(base64);
      setResultImage(null);
      setResultBlob(null);
      setDecodedMessage(null);
      setError(null);
      setDiffImage(null);
      
      const img = new Image();
      img.src = base64;
      img.onload = () => setCapacity(getImageCapacity(img.width, img.height));
    };
    reader.readAsDataURL(file);

    const bufferReader = new FileReader();
    bufferReader.onload = (be) => setRawBuffer(be.target?.result as ArrayBuffer);
    bufferReader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processImage = async () => {
    if (!image || !canvasRef.current) return;
    setIsProcessing(true);
    setProcessProgress(0);
    setError(null);
    setShowDiff(false);

    const stepInterval = setInterval(() => {
      setProcessProgress(prev => Math.min(prev + 5, 95));
    }, 40);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      setTimeout(() => {
        try {
          if (mode === 'encode') {
            if (!message) throw new Error("A secret payload is required.");
            if (method === 'lsb') {
              if (new TextEncoder().encode(message).length + 1 > capacity) {
                throw new Error(`Payload exceeds carrier capacity (${capacity} bytes).`);
              }
              
              const stegoBase64 = encodeLSB(canvas, message);
              setResultImage(stegoBase64);
              
              const stegoImg = new Image();
              stegoImg.src = stegoBase64;
              stegoImg.onload = () => {
                const sCanvas = document.createElement('canvas');
                sCanvas.width = img.width;
                sCanvas.height = img.height;
                const sCtx = sCanvas.getContext('2d');
                if (sCtx) {
                  sCtx.drawImage(stegoImg, 0, 0);
                  // Calculate diff against original canvas
                  setDiffImage(getPixelDiff(canvas, sCanvas));
                }
              };
            } else {
              if (!rawBuffer) throw new Error("Carrier data buffer missing.");
              const blob = appendEOFData(rawBuffer, message);
              setResultBlob(blob);
              setResultImage(image);
            }
          } else {
            if (method === 'lsb') {
              const secret = decodeLSB(canvas);
              if (!secret) throw new Error("No LSB-encoded payload detected.");
              setDecodedMessage(secret);
            } else {
              if (!rawBuffer) throw new Error("Carrier data buffer missing.");
              const trailing = detectTrailingData(rawBuffer, mimeType);
              if (!trailing) throw new Error("No appended binary payload found.");
              setDecodedMessage(trailing.data);
            }
          }
          setProcessProgress(100);
        } catch (err: any) {
          setError(err.message || "Operation failed.");
        } finally {
          setIsProcessing(false);
          clearInterval(stepInterval);
        }
      }, 600);
    };
  };

  const cleanImage = () => {
    if (!rawBuffer) return;
    setIsProcessing(true);
    setProcessProgress(0);
    setTimeout(() => {
      const blob = stripEOFData(rawBuffer, mimeType);
      setResultBlob(blob);
      setResultImage(image);
      setProcessProgress(100);
      setIsProcessing(false);
    }, 400);
  };

  const reset = () => {
    setImage(null);
    setRawBuffer(null);
    setResultImage(null);
    setResultBlob(null);
    setDecodedMessage(null);
    setMessage('');
    setError(null);
    setProcessProgress(0);
    setDiffImage(null);
    setShowDiff(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (resultBlob) {
      link.href = URL.createObjectURL(resultBlob);
    } else if (resultImage) {
      link.href = resultImage;
    } else return;
    link.download = `stego_${method}_${new Date().getTime()}.${mimeType.split('/')[1] || 'png'}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col items-center animate-in fade-in duration-500">
      <div className="max-w-6xl w-full space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 backdrop-blur-xl shadow-2xl">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs uppercase tracking-widest font-bold">Return to Hub</span>
          </button>
          
          <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-slate-800">
            <button 
              onClick={() => { setMode('encode'); reset(); }}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${mode === 'encode' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              Encode
            </button>
            <button 
              onClick={() => { setMode('decode'); reset(); }}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${mode === 'decode' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Unlock className="w-3.5 h-3.5" />
              Decode
            </button>
          </div>

          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol:</span>
             <div className="flex bg-black/40 rounded-lg p-1 border border-slate-800">
               <button 
                 onClick={() => setMethod('lsb')}
                 className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${method === 'lsb' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
               >
                 LSB
               </button>
               <button 
                 onClick={() => setMethod('eof')}
                 className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${method === 'eof' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
               >
                 EOF
               </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden h-full flex flex-col">
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                  {mode === 'encode' ? 'Seal Payload' : 'Extract signal'}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  {mode === 'encode' 
                    ? `Injecting data into ${method === 'lsb' ? 'pixel LSB channels' : 'end-of-file markers'}. No visual alteration detected.`
                    : `Investigating ${method === 'lsb' ? 'LSB-1 bit-planes' : 'trailing binary clusters'} for hidden strings.`}
                </p>
              </div>

              <div className="space-y-6">
                <label 
                  className={`block group cursor-pointer relative transition-all duration-300 ${isDragging ? 'scale-[0.98]' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  <div className={`p-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all duration-500 ${image ? 'border-emerald-500/50 bg-emerald-500/5' : isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800'}`}>
                    {image ? (
                      <div className="relative">
                        <img src={image} className="w-24 h-24 object-cover rounded-2xl shadow-2xl border border-white/5" alt="Carrier" />
                        <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-full shadow-2xl">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600 transition-all group-hover:bg-indigo-500/10 group-hover:text-indigo-400">
                          <Upload className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Select or Drop Carrier Image</span>
                      </div>
                    )}
                  </div>
                </label>

                {mode === 'encode' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Secret Data Signal
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold ${message.length > capacity && method === 'lsb' ? 'text-red-500' : 'text-indigo-400'}`}>
                          {message.length} / {capacity} bytes
                        </span>
                      </div>
                    </div>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Input the secret data to embed..."
                      className="w-full h-32 bg-black/40 border border-slate-800 rounded-2xl p-6 text-sm text-slate-200 focus:border-indigo-500/40 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                    />
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <button 
                    onClick={processImage}
                    disabled={!image || isProcessing || (mode === 'encode' && !message)}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 transition-all ${
                      isProcessing 
                        ? 'bg-slate-800 opacity-50 cursor-wait' 
                        : (mode === 'encode' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl')
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {isProcessing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : (mode === 'encode' ? <Zap className="w-5 h-5" /> : <Search className="w-5 h-5" />)}
                    {mode === 'encode' ? 'Seal Signal' : 'Execute Recovery'}
                  </button>
                  
                  {isProcessing && (
                    <div className="space-y-2 px-2 animate-in fade-in slide-in-from-top-2">
                      <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${mode === 'encode' ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${processProgress}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-600 font-mono">
                        <span>{mode === 'encode' ? 'Encoding bitstream...' : 'Decoding pixels...'}</span>
                        <span className="text-white">{Math.round(processProgress)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-4 items-center animate-in slide-in-from-top-2">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-400 font-bold uppercase tracking-tighter leading-tight">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex-1 flex flex-col gap-6 shadow-xl relative overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-indigo-400" />
                    Signal Output
                  </h3>
                  {decodedMessage && (
                    <button onClick={() => navigator.clipboard.writeText(decodedMessage)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
               </div>

               <div className="flex-1 flex flex-col">
                  {decodedMessage ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className="flex-1 bg-black/60 border border-slate-800 p-6 rounded-[1.5rem] font-mono text-emerald-400 text-xs leading-relaxed overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all shadow-inner border-t-emerald-500/10">
                        {decodedMessage}
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex justify-between items-center px-4">
                        <span className="text-[9px] font-black text-emerald-500 uppercase">Recovery Confirmed</span>
                        <span className="text-[9px] text-emerald-400 font-mono">{decodedMessage.length} bytes extracted</span>
                      </div>
                    </div>
                  ) : resultImage && mode === 'encode' ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                       <div className="relative group cursor-pointer w-full max-h-[180px] flex justify-center" onClick={() => setShowDiff(!showDiff)}>
                         <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/5 transition-all">
                            {/* Base Stego Image */}
                            <img src={resultImage} className="max-w-full max-h-[180px] object-contain" alt="Stego Output" />
                            
                            {/* Diff Overlay - absolute on top */}
                            {showDiff && diffImage && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                                <img src={diffImage} className="w-full h-full object-contain mix-blend-screen" alt="Mod Highlight" />
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl backdrop-blur-sm">
                              {showDiff ? <EyeOff className="w-10 h-10 text-white" /> : <Eye className="w-10 h-10 text-white" />}
                            </div>
                         </div>
                       </div>
                       
                       <div className="w-full space-y-3">
                         <button 
                            onClick={() => setShowDiff(!showDiff)}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${showDiff ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                         >
                           {showDiff ? <EyeOff className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                           {showDiff ? 'Hide Forensic Layer' : 'Show Forensic Layer'}
                         </button>
                         
                         <button onClick={handleDownload} className="w-full py-3 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Download className="w-3.5 h-3.5" />
                            Download Stego-Object
                         </button>
                       </div>
                       
                       <div className="w-full p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                             <span>Payload Size</span>
                             <span className="text-white">{message.length} bytes</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                             <span>Efficiency</span>
                             <span className="text-white">{((message.length / capacity) * 100).toFixed(2)}%</span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 opacity-20">
                       <Layers className="w-16 h-16 text-slate-700" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Signal</span>
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl border-t-red-500/10">
               <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                 <Trash2 className="w-4 h-4 text-red-500" />
                 Binary Sanitizer
               </h3>
               <div className="space-y-4">
                 <button 
                   onClick={cleanImage}
                   disabled={!image || isProcessing}
                   className="w-full p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95"
                 >
                   <Trash2 className="w-4 h-4" />
                   Strip EOF Metadata
                 </button>
                 <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter text-center leading-tight px-4">Removes hidden appended data streams to ensure file integrity</p>
               </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default StegoToolkit;
