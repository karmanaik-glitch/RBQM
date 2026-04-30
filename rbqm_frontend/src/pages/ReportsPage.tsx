import { useState } from 'react';
import { ReportGenerator } from '../components/ReportGenerator';
import { ComplianceChecklist } from '../components/ComplianceChecklist';
import { FileText, Download, ShieldCheck, Activity, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';

export default function ReportsPage() {
  const [activeView, setActiveView] = useState<'narrative' | 'compliance' | 'exports'>('narrative');

  return (
    <div className="p-8 lg:p-12 space-y-12 animate-fade-up">
      <div className="space-y-2">
        <h1 className="text-5xl font-semibold tracking-tight text-gradient">
          Regulatory <span className="text-accent-gradient">Intelligence</span>
        </h1>
        <p className="text-foreground-muted max-w-2xl text-lg leading-relaxed">
          AI-driven clinical insights and ICH E6 R3 compliance evidence tracking.
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportNavCard 
          title="Narrative Report" 
          desc="AI-generated clinical data summary & CDM memos" 
          icon={FileText} 
          active={activeView === 'narrative'} 
          onClick={() => setActiveView('narrative')}
        />
        <ReportNavCard 
          title="Compliance Checklist" 
          desc="ICH E6 R3 regulatory alignment & pass/fail status" 
          icon={ShieldCheck} 
          active={activeView === 'compliance'} 
          onClick={() => setActiveView('compliance')}
        />
        <ReportNavCard 
          title="Export Center" 
          desc="Production-ready PDF and CSV data exports" 
          icon={Download} 
          active={activeView === 'exports'} 
          onClick={() => setActiveView('exports')}
        />
      </div>

      <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {activeView === 'narrative' && (
          <SpotlightCard className="p-8">
            <ReportGenerator />
          </SpotlightCard>
        )}
        {activeView === 'compliance' && (
          <SpotlightCard className="p-8">
            <ComplianceChecklist />
          </SpotlightCard>
        )}
        {activeView === 'exports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ExportItem 
                title="Full RBQM Summary Report" 
                desc="Complete trial overview, KRI snapshots, and risk assessment."
                type="PDF"
                icon={FileText}
                onDownload={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/report/pdf/1`, '_blank')}
              />
              <ExportItem 
                title="Audit Log Report" 
                desc="Full history of system actions and data modifications."
                type="CSV"
                icon={FileSpreadsheet}
                onDownload={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/report/audit-csv`, '_blank')}
              />
              <ExportItem 
                title="Compliance Evidence Pack" 
                desc="Mapped evidence for all 9 core ICH requirements."
                type="PDF"
                icon={ShieldCheck}
                onDownload={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/report/pdf/1`, '_blank')}
              />
              <ExportItem 
                title="KRI Site Raw Data" 
                desc="Raw site-level KRI values for external statistical analysis."
                type="CSV"
                icon={Activity}
                onDownload={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/report/kri-csv/1`, '_blank')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportNavCard({ title, desc, icon: Icon, active, onClick }: { title: string; desc: string; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-8 rounded-2xl border transition-all duration-300 text-left group overflow-hidden ${
        active 
          ? 'bg-white/[0.08] border-accent/50 shadow-accent-glow scale-[1.02]' 
          : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
      }`}
    >
      <div className={`p-3 rounded-xl w-fit mb-6 border transition-all duration-300 ${
        active ? 'bg-accent text-white border-accent-bright shadow-accent-glow' : 'bg-background-elevated text-foreground-muted border-white/5 group-hover:border-white/20'
      }`}>
        <Icon size={24} />
      </div>
      <h3 className={`text-lg font-semibold mb-2 tracking-tight ${active ? 'text-foreground' : 'text-foreground-muted group-hover:text-foreground'}`}>{title}</h3>
      <p className="text-sm text-foreground-subtle leading-relaxed">{desc}</p>
      
      {active && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
    </button>
  );
}

function ExportItem({ title, desc, type, icon: Icon, onDownload }: { title: string; desc: string; type: string; icon: any; onDownload: () => void }) {
  return (
    <SpotlightCard className="p-6 flex items-start gap-5 group">
      <div className="p-3 rounded-xl bg-background-elevated border border-white/5 text-foreground-muted group-hover:text-accent transition-colors shadow-inner-highlight">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            type === 'PDF' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-accent/10 text-accent border-accent/20'
          }`}>
            {type}
          </span>
        </div>
        <p className="text-xs text-foreground-muted mb-6 leading-relaxed">{desc}</p>
        <button 
          onClick={onDownload}
          className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-foreground-subtle hover:text-accent transition-colors group/btn"
        >
          Download Package 
          <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </SpotlightCard>
  );
}

