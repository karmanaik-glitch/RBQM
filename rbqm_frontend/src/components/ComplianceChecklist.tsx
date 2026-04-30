import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Download, FileText, Activity } from 'lucide-react';

interface ComplianceChecklistProps {
  trialId?: number;
}

interface ComplianceItem {
  section: string;
  requirement: string;
  kris_mapped: string[];
  evidence_required: string;
  status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' | 'INSUFFICIENT_DATA';
}

export function ComplianceChecklist({ trialId }: ComplianceChecklistProps) {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompliance();
  }, [trialId]);

  const fetchCompliance = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const url = trialId 
        ? `${BASE_URL}/api/report/compliance/${trialId}`
        : `${BASE_URL}/api/report/compliance`;
      
      const res = await fetch(url);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error('Error fetching compliance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'COMPLIANT':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800/50', label: 'Compliant' };
      case 'AT_RISK':
        return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800/50', label: 'At Risk' };
      case 'NON_COMPLIANT':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800/50', label: 'Non-Compliant' };
      default:
        return { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-900/50', border: 'border-slate-800', label: 'No Data' };
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Checking compliance status...</div>;

  const compliantCount = items.filter(i => i.status === 'COMPLIANT').length;
  const progress = (compliantCount / items.length) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">ICH E6 R3 Compliance Summary</h3>
            <p className="text-sm text-slate-500">Regulatory alignment across 9 core requirements</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-100">{compliantCount} / {items.length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Requirements Met</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000" 
            style={{ width: `${progress}%` }} 
          />
          <div 
            className="h-full bg-yellow-500 transition-all duration-1000" 
            style={{ width: `${items.filter(i => i.status === 'AT_RISK').length / items.length * 100}%` }} 
          />
          <div 
            className="h-full bg-red-500 transition-all duration-1000" 
            style={{ width: `${items.filter(i => i.status === 'NON_COMPLIANT').length / items.length * 100}%` }} 
          />
        </div>
        <div className="flex gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400 font-medium">Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-slate-400 font-medium">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400 font-medium">Non-Compliant</span>
          </div>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Regulatory Requirements Mapping</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-white rounded-lg transition-colors">
            <Download size={14} />
            Export Audit Evidence
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Section</th>
              <th className="px-6 py-4">ICH E6 R3 Requirement</th>
              <th className="px-6 py-4">Evidence Mapping</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {items.map((item, idx) => {
              const config = getStatusConfig(item.status);
              const Icon = config.icon;
              
              return (
                <tr key={idx} className="hover:bg-slate-700/20 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700">
                      {item.section}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">
                      {item.requirement}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.kris_mapped.map(kri => (
                        <span key={kri} className="text-[10px] text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Activity size={10} /> KRI {kri}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                        <FileText size={10} /> {item.evidence_required}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex flex-col items-center gap-1 ${config.bg} ${config.border} border px-3 py-1.5 rounded-lg min-w-[100px]`}>
                      <Icon size={16} className={config.color} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
