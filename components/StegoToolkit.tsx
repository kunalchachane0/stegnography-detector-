
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  EyeOff,
  File as FileIcon,
  Type,
  X,
  FlipHorizontal,
  ScanLine,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp,
  Volume2
} from 'lucide-react';
import { encodeLSB, decodeLSB, appendEOFData, detectTrailingData, stripEOFData, getPixelDiff, getImageCapacity } from '../utils/imageProcessing';
import { encodeMessage, decodeMessage } from '../utils/stegoEngine';

interface Props {
  onBack: () => void;
}

interface KernelLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

const StegoToolkit: React.FC<Props> = ({ onBack }) => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [method, setMethod] = useState<'lsb' | 'eof'>('lsb');
  const [image, setImage] = useState<string | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [payloadType, setPayloadType] = useState<'text' | 'file'>('text');
  const [message, setMessage] = useState('');
  const [payloadFile, setPayloadFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [diffImage, setDiffImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [decodedBytes, setDecodedBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [capacity, setCapacity] = useState<number>(0);
  const [showDiff, setShowDiff] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isKernelOpen, setIsKernelOpen] = useState(true);
  const [kernelLogs, setKernelLogs] = useState<KernelLog[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kernelRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const log: KernelLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any),
      message,
      type
    };
    setKernelLogs(prev => [...prev.slice(-49), log]);
  }, []);

  useEffect(() => {
    if (kernelRef.current) {
      kernelRef.current.scrollTop = kernelRef.current.scrollHeight;
    }
  }, [kernelLogs]);

  useEffect(() => {
    addLog('StegnoSafe Kernel initialized. Standing by for carrier load...', 'info');
  }, [addLog]);

  const processFile = useCallback((file: File) => {
    setMimeType(file.type);
    addLog(`Loading carrier: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, 'info');
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImage(base64);
      setResultImage(null);
      setResultBlob(null);
      setDecodedMessage(null);
      setDecodedBytes(null);
      setError(null);
      setDiffImage(null);
      
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const cap = getImageCapacity(img.width, img.height);
        setCapacity(cap);
        addLog(`Carrier analyzed: ${img.width}x${img.height} pixels. Capacity: ${cap} bytes.`, 'success');
      };
    };
    reader.readAsDataURL(file);

    const bufferReader = new FileReader();
    bufferReader.onload = (be) => {
      setRawBuffer(be.target?.result as ArrayBuffer);
      addLog('Carrier memory buffer allocated.', 'info');
    };
    bufferReader.readAsArrayBuffer(file);
  }, [addLog]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handlePayloadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPayloadFile(file);
      addLog(`Binary payload selected: ${file.name} (${file.size} bytes)`, 'info');
    }
  };

  const handleRemovePayloadFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPayloadFile(null);
    addLog('Binary payload detached.', 'warn');
  };

  const processImage = async () => {
    if (!image || !canvasRef.current) return;
    setIsProcessing(true);
    setProcessProgress(0);
    setError(null);
    setShowDiff(false);
    addLog(`Starting ${mode.toUpperCase()} operation using ${method.toUpperCase()} protocol...`, 'info');

    const stepInterval = setInterval(() => {
      setProcessProgress(prev => Math.min(prev + 5, 95));
    }, 40);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    
    img.onload = async () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      addLog('Canvas context initialized. RGB channels isolated.', 'info');

      setTimeout(async () => {
        try {
          if (mode === 'encode') {
            let finalPayload: Uint8Array;
            if (payloadType === 'text') {
              if (!message) throw new Error("A text payload is required.");
              finalPayload = new TextEncoder().encode(message);
              addLog(`Text payload serialized: ${finalPayload.length} bytes.`, 'info');
            } else {
              if (!payloadFile) throw new Error("A binary file payload is required.");
              const buffer = await payloadFile.arrayBuffer();
              finalPayload = new Uint8Array(buffer);
              addLog(`Binary stream loaded: ${finalPayload.length} bytes.`, 'info');
            }

            if (method === 'lsb') {
              addLog('Executing LSB-1 modulation...', 'info');
              if (finalPayload.length + 4 > capacity) {
                throw new Error(`Payload exceeds carrier capacity (${capacity} bytes). Header included.`);
              }
              
              const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
              const encodedData = encodeMessage(imageData, finalPayload);
              ctx!.putImageData(encodedData, 0, 0);
              const stegoBase64 = canvas.toDataURL();
              setResultImage(stegoBase64);
              addLog('Modulation complete. Stego-object generated.', 'success');
              
              const stegoImg = new Image();
              stegoImg.src = stegoBase64;
              stegoImg.onload = () => {
                const sCanvas = document.createElement('canvas');
                sCanvas.width = img.width;
                sCanvas.height = img.height;
                const sCtx = sCanvas.getContext('2d');
                if (sCtx) {
                  sCtx.drawImage(stegoImg, 0, 0);
                  setDiffImage(getPixelDiff(canvas, sCanvas));
                  addLog('Forensic difference layer calculated.', 'info');
                }
              };
            } else {
              addLog('Executing EOF binary append...', 'info');
              if (!rawBuffer) throw new Error("Carrier data buffer missing.");
              const combined = new Uint8Array(rawBuffer.byteLength + finalPayload.byteLength);
              combined.set(new Uint8Array(rawBuffer), 0);
              combined.set(finalPayload, rawBuffer.byteLength);
              const blob = new Blob([combined]);
              setResultBlob(blob);
              setResultImage(image);
              addLog(`EOF packet appended. Offset: ${rawBuffer.byteLength}.`, 'success');
            }
          } else {
            addLog('Searching for steganographic signal...', 'info');
            if (method === 'lsb') {
              const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
              try {
                const secretBytes = decodeMessage(imageData);
                setDecodedBytes(secretBytes);
                addLog(`Signal captured: ${secretBytes.length} bytes recovered from LSB channels.`, 'success');
                try {
                   const text = new TextDecoder().decode(secretBytes);
                   setDecodedMessage(text);
                } catch {
                   setDecodedMessage("[Binary Stream Detected]");
                }
              } catch (e) {
                throw new Error("No LSB-encoded payload detected or header corrupted.");
              }
            } else {
              if (!rawBuffer) throw new Error("Carrier data buffer missing.");
              const data = new Uint8Array(rawBuffer);
              let eofOffset = -1;
              addLog('Scanning for EOF markers...', 'info');
              if (mimeType === 'image/png') {
                const iend = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
                for (let i = data.length - 12; i >= 0; i--) {
                  let match = true;
                  for (let j = 0; j < iend.length; j++) {
                    if (data[i + 4 + j] !== iend[j]) { match = false; break; }
                  }
                  if (match) { eofOffset = i + 12; break; }
                }
              } else if (mimeType === 'image/jpeg') {
                for (let i = data.length - 2; i >= 0; i--) {
                  if (data[i] === 0xFF && data[i + 1] === 0xD9) { eofOffset = i + 2; break; }
                }
              }
              
              if (eofOffset !== -1 && eofOffset < data.length) {
                const trailing = data.slice(eofOffset);
                setDecodedBytes(trailing);
                addLog(`EOF trailing data found. Extracted ${trailing.length} bytes.`, 'success');
                try {
                  setDecodedMessage(new TextDecoder().decode(trailing));
                } catch {
                  setDecodedMessage("[Binary Data Extracted]");
                }
              } else {
                throw new Error("No appended binary payload found.");
              }
            }
          }
          setProcessProgress(100);
        } catch (err: any) {
          setError(err.message || "Operation failed.");
          addLog(`Error: ${err.message}`, 'error');
        } finally {
          setIsProcessing(false);
          clearInterval(stepInterval);
        }
      }, 600);
    };
  };

  const handleDownloadDecoded = () => {
    if (!decodedBytes) return;
    addLog('Preparing binary recovery download...', 'info');
    const blob = new Blob([decodedBytes], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recovered_payload_${Date.now()}.bin`;
    link.click();
  };

  const cleanImage = () => {
    if (!rawBuffer) return;
    setIsProcessing(true);
    setProcessProgress(0);
    addLog('Sanitizing EOF metadata...', 'warn');
    setTimeout(() => {
      const blob = stripEOFData(rawBuffer, mimeType);
      setResultBlob(blob);
      setResultImage(image);
      setProcessProgress(100);
      setIsProcessing(false);
      addLog('Sanitization complete. File integrity restored.', 'success');
    }, 400);
  };

  const reset = () => {
    setImage(null);
    setRawBuffer(null);
    setResultImage(null);
    setResultBlob(null);
    setDecodedMessage(null);
    setDecodedBytes(null);
    setMessage('');
    setPayloadFile(null);
    setError(null);
    setProcessProgress(0);
    setDiffImage(null);
    setShowDiff(false);
    addLog('System reset. Memory cleared.', 'warn');
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
    addLog('Stego-object downloaded to local storage.', 'info');
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

  return (
    <div className={`min-h-screen transition-all duration-500 p-4 md:p-8 flex flex-col items-center animate-in fade-in overflow-x-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl w-full space-y-8 pb-32">
        
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl transition-colors ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <button onClick={onBack} className={`flex items-center gap-2 transition-colors group font-mono text-sm uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'}`}>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Hub</span>
          </button>
          
          <div className={`flex items-center gap-2 p-1.5 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-black/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => { setMode('encode'); reset(); }}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-3 ${mode === 'encode' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}
            >
              <Lock className="w-4 h-4" />
              Encode
            </button>
            <button 
              onClick={() => { setMode('decode'); reset(); }}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-3 ${mode === 'decode' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-500'}`}
            >
              <Unlock className="w-4 h-4" />
              Decode
            </button>
          </div>

          <div className="flex items-center gap-4">
             <span className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>Protocol:</span>
             <div className={`flex rounded-xl p-1 border transition-colors ${theme === 'dark' ? 'bg-black/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
               <button 
                 onClick={() => setMethod('lsb')}
                 className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${method === 'lsb' ? (theme === 'dark' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500'}`}
               >
                 LSB
               </button>
               <button 
                 onClick={() => setMethod('eof')}
                 className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${method === 'eof' ? (theme === 'dark' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500'}`}
               >
                 EOF
               </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-7 space-y-8">
            <div className={`border rounded-[2.5rem] p-10 space-y-10 shadow-2xl relative overflow-hidden h-full flex flex-col transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="space-y-4">
                <h2 className={`text-3xl font-black flex items-center gap-4 tracking-tighter uppercase leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {mode === 'encode' ? 'Seal Payload' : 'Extract signal'}
                </h2>
                <p className={`text-sm leading-relaxed max-w-md font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {mode === 'encode' 
                    ? `Injecting binary data into ${method === 'lsb' ? 'pixel LSB channels' : 'end-of-file markers'}. Forensic invisibility prioritized.`
                    : `Investigating ${method === 'lsb' ? 'LSB-1 bit-planes' : 'trailing binary clusters'} for recovered binary streams.`}
                </p>
              </div>

              <div className="space-y-8">
                <label 
                  className={`block group cursor-pointer relative transition-all duration-300 ${isDragging ? 'scale-[0.98]' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  <div className={`p-14 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-8 transition-all duration-500 ${image ? (theme === 'dark' ? 'border-emerald-500/50 bg-emerald-500/5 shadow-2xl shadow-emerald-500/5' : 'border-emerald-400 bg-emerald-50/50 shadow-xl') : isDragging ? 'border-indigo-500 bg-indigo-500/10' : (theme === 'dark' ? 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50')}`}>
                    {image ? (
                      <div className="relative">
                        <img src={image} className="w-32 h-32 object-cover rounded-3xl shadow-2xl border border-white/10" alt="Carrier" />
                        <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-2.5 rounded-full shadow-2xl ring-4 ring-white dark:ring-slate-900">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-5">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:scale-110 ${theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Upload className="w-10 h-10" />
                        </div>
                        <div className="text-center">
                          <span className={`text-sm font-black uppercase tracking-widest block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Select Carrier Image</span>
                          <span className="text-[11px] text-slate-500 font-bold uppercase mt-2 block opacity-60 tracking-wider">PNG / JPG / BMP</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {mode === 'encode' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                      <div className="flex items-center gap-6">
                        <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Zap className="w-4 h-4 text-indigo-400" />
                          Secret Payload
                        </label>
                        <div className={`flex rounded-xl p-1 border transition-colors ${theme === 'dark' ? 'bg-black/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                          <button onClick={() => setPayloadType('text')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${payloadType === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                            <Type className="w-3 h-3" /> Text
                          </button>
                          <button onClick={() => setPayloadType('file')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${payloadType === 'file' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                            <Binary className="w-3 h-3" /> Binary
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-black ${ (payloadType === 'text' ? message.length : (payloadFile?.size || 0)) > capacity && method === 'lsb' ? 'text-red-500' : 'text-indigo-500'}`}>
                          {payloadType === 'text' ? message.length : (payloadFile?.size || 0)} / {capacity} bytes
                        </span>
                      </div>
                    </div>

                    {payloadType === 'text' ? (
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Input the secret data string..."
                        className={`w-full h-40 border rounded-[1.5rem] p-8 text-sm font-mono outline-none transition-all resize-none custom-scrollbar shadow-inner leading-relaxed ${theme === 'dark' ? 'bg-black/40 border-slate-800 text-slate-200 focus:border-indigo-500/40' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`}
                      />
                    ) : (
                      <div className="space-y-4">
                        <label className="block w-full">
                          <input type="file" className="hidden" onChange={handlePayloadFileChange} />
                          {!payloadFile ? (
                            <div className={`p-10 border-2 border-dashed rounded-[1.5rem] flex items-center justify-center gap-6 transition-all cursor-pointer ${theme === 'dark' ? 'border-slate-800 bg-black/20 hover:bg-black/40 hover:border-indigo-500/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'}`}>
                               <div className="flex items-center gap-4 text-slate-500">
                                 <Upload className="w-6 h-6" />
                                 <span className="text-xs font-black uppercase tracking-widest">Select Binary Payload</span>
                               </div>
                            </div>
                          ) : (
                            <div className={`p-10 border rounded-[1.5rem] flex items-center justify-between gap-6 transition-all group relative ${theme === 'dark' ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-indigo-400/50 bg-indigo-50/50'}`}>
                               <div className="flex items-center gap-6 overflow-hidden">
                                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-400 flex-shrink-0 ${theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-100'}`}>
                                    <Binary className="w-8 h-8" />
                                 </div>
                                 <div className="text-left overflow-hidden">
                                   <p className={`text-base font-black truncate max-w-[280px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{payloadFile.name}</p>
                                   <p className="text-xs text-indigo-500 font-bold uppercase mt-1">{(payloadFile.size / 1024).toFixed(2)} KB // Verified Binary</p>
                                 </div>
                               </div>
                               <button 
                                 onClick={handleRemovePayloadFile}
                                 className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl flex-shrink-0"
                                 title="Remove file"
                               >
                                 <Trash2 className="w-5 h-5" />
                               </button>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-5 pt-4">
                  <button 
                    onClick={processImage}
                    disabled={!image || isProcessing || (mode === 'encode' && (payloadType === 'text' ? !message : !payloadFile))}
                    className={`w-full py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98] ${
                      isProcessing 
                        ? 'bg-slate-800 opacity-50 cursor-wait' 
                        : (mode === 'encode' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-600/20')
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {isProcessing ? <RefreshCcw className="w-6 h-6 animate-spin" /> : (mode === 'encode' ? <Zap className="w-6 h-6" /> : <Search className="w-6 h-6" />)}
                    {mode === 'encode' ? 'Seal Signal' : 'Execute Recovery'}
                  </button>
                  
                  {isProcessing && (
                    <div className="space-y-3 px-2 animate-in fade-in slide-in-from-top-2">
                      <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full transition-all duration-300 ${mode === 'encode' ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${processProgress}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                        <span>{mode === 'encode' ? 'Processing byte streams...' : 'Analyzing bitplanes...'}</span>
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{Math.round(processProgress)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-5 items-center animate-in slide-in-from-top-2">
                    <AlertCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-400 font-bold uppercase tracking-tight leading-relaxed">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-10">
            <div className={`border rounded-[2.5rem] p-10 flex-1 flex flex-col gap-8 shadow-2xl relative overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
               <div className={`flex items-center justify-between border-b pb-6 transition-colors ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className={`font-black uppercase tracking-widest text-xs flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <FileSearch className="w-5 h-5 text-indigo-400" />
                    Signal Output
                  </h3>
                  {decodedMessage && decodedMessage !== "[Binary Stream Detected]" && decodedMessage !== "[Binary Data Extracted]" && (
                    <button onClick={() => navigator.clipboard.writeText(decodedMessage)} className={`p-3 rounded-xl transition-all shadow-lg ${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-indigo-600'}`}>
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
               </div>

               <div className="flex-1 flex flex-col min-h-0">
                  {decodedBytes ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className={`flex-1 border p-8 rounded-[2rem] font-mono text-xs leading-loose overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all shadow-inner min-h-[200px] transition-colors ${theme === 'dark' ? 'bg-black/60 border-slate-800 text-emerald-400 border-t-emerald-500/10' : 'bg-slate-50 border-slate-100 text-emerald-600 border-t-emerald-400/20'}`}>
                        {decodedMessage}
                      </div>
                      
                      <div className="space-y-4">
                        <div className={`p-4 rounded-2xl border flex justify-between items-center px-6 transition-colors ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                          <span className="text-xs font-black uppercase tracking-widest">Recovery Confirmed</span>
                          <span className="text-xs font-mono font-bold">{decodedBytes.length} bytes extracted</span>
                        </div>
                        
                        <button 
                          onClick={handleDownloadDecoded}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-emerald-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                          <Download className="w-5 h-5" />
                          Download Binary Stream
                        </button>
                      </div>
                    </div>
                  ) : resultImage && mode === 'encode' ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-8">
                       <div className="relative group cursor-pointer w-full max-h-[220px] flex justify-center" onClick={() => setShowDiff(!showDiff)}>
                         <div className={`relative overflow-hidden rounded-[2rem] shadow-2xl border transition-all ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                            <img src={resultImage} className="max-w-full max-h-[220px] object-contain" alt="Stego Output" />
                            
                            {showDiff && diffImage && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-none backdrop-blur-[2px]">
                                <img src={diffImage} className="w-full h-full object-contain mix-blend-screen opacity-100" style={{ filter: 'drop-shadow(0 0 5px #ff00ff)' }} alt="Mod Highlight" />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-magenta-500/5 to-transparent animate-pulse" />
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl backdrop-blur-sm">
                              {showDiff ? <EyeOff className="w-12 h-12 text-white" /> : <Eye className="w-12 h-12 text-white" />}
                            </div>
                         </div>
                       </div>
                       
                       <div className="w-full space-y-4">
                         <div className="flex items-center gap-2">
                           <button 
                              onClick={() => setShowDiff(!showDiff)}
                              className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 shadow-lg ${showDiff ? (theme === 'dark' ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' : 'bg-indigo-500 text-white border-indigo-400') : (theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200')}`}
                           >
                             {showDiff ? <EyeOff className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
                             {showDiff ? 'Hide Forensic Layer' : 'Show Forensic Layer'}
                           </button>
                         </div>
                         
                         <button onClick={handleDownload} className={`w-full py-4.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${theme === 'dark' ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                            <Download className="w-5 h-5" />
                            Download Stego-Object
                         </button>
                       </div>
                       
                       <div className={`w-full p-6 rounded-[1.5rem] border space-y-2 transition-colors ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                             <span>Payload Length</span>
                             <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{(payloadType === 'text' ? message.length : (payloadFile?.size || 0)).toLocaleString()} B</span>
                          </div>
                          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                             <span>Channel Flux</span>
                             <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{(( (payloadType === 'text' ? message.length : (payloadFile?.size || 0)) / capacity) * 100).toFixed(2)}%</span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 opacity-20">
                       <Layers className={`w-20 h-20 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
                       <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Signal</span>
                    </div>
                  )}
               </div>
            </div>

            <div className={`border rounded-[2.5rem] p-10 space-y-8 shadow-2xl transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800 border-t-red-500/10' : 'bg-white border-slate-100 border-t-red-400/20'}`}>
               <h3 className={`font-black uppercase tracking-widest text-xs flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                 <Trash2 className="w-5 h-5 text-red-500" />
                 Binary Sanitizer
               </h3>
               <div className="space-y-6">
                 <button 
                   onClick={cleanImage}
                   disabled={!image || isProcessing}
                   className="w-full py-5 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 disabled:opacity-20 active:scale-[0.98] shadow-lg shadow-red-500/5"
                 >
                   <Trash2 className="w-5 h-5" />
                   Strip EOF Metadata
                 </button>
                 <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight text-center leading-relaxed px-6 opacity-60 italic">Removes hidden appended data streams to ensure file integrity and metadata cleanliness.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kernel Panel Tray */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl bg-[#020617]/95 backdrop-blur-2xl border-x border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 z-[100] ${isKernelOpen ? 'h-80' : 'h-14'}`}>
         <div 
           className="h-14 flex items-center justify-between px-10 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
           onClick={() => setIsKernelOpen(!isKernelOpen)}
         >
           <div className="flex items-center gap-4 text-indigo-400">
             <Terminal className="w-5 h-5" />
             <span className="text-xs font-black uppercase tracking-[0.2em]">System Kernel Panel</span>
             <div className="flex items-center gap-2 px-3 py-0.5 bg-indigo-500/10 rounded-full">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-mono text-emerald-500">LIVE</span>
             </div>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-500">RUNTIME: V4.0.2-ALPHA</span>
              {isKernelOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronUp className="w-5 h-5 text-slate-500" />}
           </div>
         </div>
         
         <div 
           ref={kernelRef}
           className={`p-6 overflow-y-auto custom-scrollbar h-[calc(100%-3.5rem)] font-mono text-[11px] space-y-2 transition-opacity duration-300 ${isKernelOpen ? 'opacity-100' : 'opacity-0'}`}
         >
           {kernelLogs.map((log) => (
             <div key={log.id} className="flex gap-4 group">
               <span className="text-slate-600 shrink-0 font-bold">[{log.timestamp}]</span>
               <span className={`shrink-0 font-black tracking-widest ${
                 log.type === 'success' ? 'text-emerald-500' : 
                 log.type === 'error' ? 'text-red-500' : 
                 log.type === 'warn' ? 'text-amber-500' : 
                 'text-indigo-400'
               }`}>
                 {log.type.toUpperCase()}
               </span>
               <span className="text-slate-300 group-hover:text-white transition-colors">{log.message}</span>
             </div>
           ))}
           {kernelLogs.length === 0 && (
             <div className="text-slate-600 animate-pulse">Initializing IO stream...</div>
           )}
           <div className="flex gap-4">
              <span className="text-slate-600 shrink-0 font-bold">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any)}]</span>
              <span className="text-indigo-500 animate-pulse font-black">WAIT</span>
              <span className="text-slate-500 italic">kernel_loop_listening...</span>
           </div>
         </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default StegoToolkit;
