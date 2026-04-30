import { useEffect, useState, useRef } from 'react';
import { Activity, Upload, CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface DataUploadPanelProps {
  trialId: number;
}

interface FileStatus {
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  rows_parsed?: number;
  uploaded_at?: string;
  missing?: boolean;
}

export function DataUploadPanel({ trialId }: DataUploadPanelProps) {
  const [uploads, setUploads] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchema, setShowSchema] = useState(false);
  const [schema, setSchema] = useState<Record<string, string[]>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFiles = [
    'patients.csv', 'visits.csv', 'deviations.csv', 'queries.csv',
    'saes.csv', 'measurements.csv', 'ip_records.csv', 'sites.csv'
  ];

  useEffect(() => {
    fetchUploads();
    fetchSchema();
  }, [trialId]);

  const fetchUploads = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/ingest/${trialId}/uploads`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setUploads(data);
      }
    } catch (err) {
      console.error('Error fetching uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/ingest/schema`);
      if (res.ok) setSchema(await res.json());
    } catch (err) {
      console.error('Error fetching schema:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const token = localStorage.getItem('rbqm_token');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${BASE_URL}/api/ingest/${trialId}/upload`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData
        });
        
        if (res.ok) {
          fetchUploads();
        }
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
      }
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/ingest/${trialId}/run-kri`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        setAnalysisResult(await res.json());
      }
    } catch (err) {
      console.error('Error running analysis:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadTemplates = () => {
    requiredFiles.forEach(filename => {
      const headers = schema[filename] || [];
      const content = headers.join(',');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const allUploaded = requiredFiles.every(rf => uploads.some(u => u.filename === rf && u.status === 'COMPLETE'));

  if (loading) return <div className="text-slate-500 text-sm">Loading upload status...</div>;

  return (
    <div className="space-y-6">
      {/* Status Table */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">EDC Data Upload Readiness</h3>
          <div className="flex gap-2">
            <button 
              onClick={downloadTemplates}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
            >
              <Download size={14} />
              Download Templates
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-700/50">
          {requiredFiles.map((filename) => {
            const upload = uploads.find(u => u.filename === filename);
            const isComplete = upload?.status === 'COMPLETE';
            
            return (
              <div key={filename} className="bg-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <XCircle size={18} className="text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-200">{filename}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {isComplete ? `${upload.rows_parsed || 0} rows parsed` : 'Missing file'}
                    </p>
                  </div>
                </div>
                {isComplete && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(upload.uploaded_at || '').toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/20 hover:bg-emerald-500/5 rounded-xl p-12 text-center cursor-pointer transition-all group"
      >
        <input 
          type="file" 
          multiple 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <div className="bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700 group-hover:border-emerald-500/50">
          <Upload size={32} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
        </div>
        <p className="text-slate-200 font-medium">Click to upload or drag & drop CSV files</p>
        <p className="text-slate-500 text-sm mt-1">Accepts multiple .csv files at once</p>
      </div>

      {/* Analysis Trigger */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col items-center gap-4">
        {!allUploaded && (
          <div className="flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-800/50 px-4 py-2 rounded-lg text-sm">
            <AlertCircle size={16} />
            Please upload all 8 required files to enable KRI analysis.
          </div>
        )}
        
        {analysisResult && (
          <div className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} /> Analysis Complete
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Red KRIs</p>
                <p className="text-lg font-bold text-red-400">{analysisResult.summary.RED}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Yellow KRIs</p>
                <p className="text-lg font-bold text-yellow-400">{analysisResult.summary.YELLOW}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Green KRIs</p>
                <p className="text-lg font-bold text-emerald-400">{analysisResult.summary.GREEN}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Results have been saved to the database. Switch to 'KRI Results' tab to view details.
            </p>
          </div>
        )}

        <button 
          onClick={runAnalysis}
          disabled={!allUploaded || analyzing}
          className={`w-full max-w-sm py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            !allUploaded || analyzing
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {analyzing ? (
            <>
              <Activity size={18} className="animate-spin" />
              Running 20 KRIs across sites...
            </>
          ) : (
            <>
              <Activity size={18} />
              Run KRI Analysis
            </>
          )}
        </button>
      </div>

      {/* Schema Helper */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        <button 
          onClick={() => setShowSchema(!showSchema)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} />
            CSV Data Schema Requirements
          </div>
          {showSchema ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSchema && (
          <div className="p-5 border-t border-slate-700/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(schema).map(([file, columns]) => (
                <div key={file} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-xs font-bold text-slate-300 mb-2 font-mono">{file}</p>
                  <div className="flex flex-wrap gap-1">
                    {columns.map(col => (
                      <span key={col} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
