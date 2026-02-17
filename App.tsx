
import React, { useState, useCallback } from 'react';
import { Upload, ShieldAlert, Cpu, Eye, Image as ImageIcon } from 'lucide-react';
import { analyzeImageWithAI } from './services/geminiService';
import { AnalysisResult } from './types';
import AnalysisDashboard from './components/AnalysisDashboard';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);

      try {
        const result = await analyzeImageWithAI(base64, file.type);
        setAnalysisResult(result);
      } catch (err) {
        setError('Failed to analyze image with AI. Ensure your API key is configured.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImageSrc(null);
    setAnalysisResult(null);
    setError(null);
  };

  if (imageSrc) {
    return (
      <AnalysisDashboard 
        imageSrc={imageSrc} 
        result={analysisResult} 
        onReset={reset} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen text-center">
        
        {/* Hero Section */}
        <div className="mb-12 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">
            <ShieldAlert className="w-4 h-4" />
            Forensic Suite v2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-tight">
            Reveal the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Unseen</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Professional-grade image steganography detection. Analyze bit-planes, noise patterns, and leverage Gemini AI to uncover hidden data in plain sight.
          </p>
        </div>

        {/* Upload Box */}
        <div className="w-full max-w-2xl">
          <label className="group relative block cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div className="p-12 md:p-16 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/50 backdrop-blur-xl group-hover:border-indigo-500/50 group-hover:bg-slate-900/80 transition-all duration-300">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-white">Upload image for analysis</p>
                  <p className="text-slate-500 text-sm">Drag and drop or click to browse files (PNG, JPG, BMP)</p>
                </div>
              </div>
            </div>
            {/* Animated Ring Decor */}
            <div className="absolute inset-[-4px] border-2 border-indigo-500/0 group-hover:border-indigo-500/20 rounded-[36px] transition-all duration-300 pointer-events-none" />
          </label>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Features Row */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white">AI-Powered Forensics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Gemini 3 Flash analyzes pixel distribution and noise entropy to detect subtle manipulation signatures.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-white">Bit-Plane Slicing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Inspect individual R/G/B channels and bits (0-7) to visualize LSB (Least Significant Bit) irregularities.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 text-left space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-white">Visual Noise Filters</h3>
            <p className="text-slate-400 text-sm leading-relaxed">High-pass filters reveal hidden patterns or text blocks concealed within textures and smooth gradients.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-10 border-t border-slate-900 w-full text-slate-600 text-xs tracking-widest uppercase font-bold">
          &copy; 2024 StegoGuard Labs // Digital Forensic Intelligence
        </footer>
      </main>
    </div>
  );
};

export default App;
