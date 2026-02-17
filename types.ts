
export interface AnalysisResult {
  likelihood: 'Low' | 'Medium' | 'High' | 'Detected';
  reasoning: string;
  anomalies: string[];
  metadata: Record<string, any>;
  suggestions: string[];
}

export interface BitPlane {
  channel: 'R' | 'G' | 'B';
  plane: number;
  dataUrl: string;
}

export interface ProcessingState {
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
}
