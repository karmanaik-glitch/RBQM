import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SiteSummary, SiteDetail } from '../types';

export function SiteHeatmap() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [siteDetails, setSiteDetails] = useState<Record<string, SiteDetail>>({});
  const [loading, setLoading] = useState(true);

  const domains = [
    'Data Quality',
    'Safety',
    'Protocol Adherence',
    'Site Performance',
    'Investigational Product',
    'Statistical Monitoring'
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const siteList = await api.sites();
        setSites(siteList);
        
        const details: Record<string, SiteDetail> = {};
        for (const site of siteList) {
          const detail = await api.site(site.site_id);
          details[site.site_id] = detail;
        }
        setSiteDetails(details);
      } catch (err) {
        console.error('Heatmap data error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getDomainStatus = (siteId: string, domain: string) => {
    const detail = siteDetails[siteId];
    if (!detail) return 'GREY';
    
    const domainKris = detail.kris.filter(k => k.domain === domain);
    if (domainKris.length === 0) return 'GREY';
    
    if (domainKris.some(k => k.status === 'RED')) return 'RED';
    if (domainKris.some(k => k.status === 'YELLOW')) return 'YELLOW';
    return 'GREEN';
  };

  if (loading) return <div className="p-8 text-slate-500 text-sm">Generating Heatmap...</div>;

  return (
    <div className="glass-card overflow-hidden p-8 animate-fade-up">
      <div className="mb-8">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          Site Performance Heatmap <span className="text-foreground-subtle">— KRI Domains</span>
        </h3>
        <p className="text-xs text-foreground-muted mt-2 font-mono">Rows: Sites | Columns: KRI Domains (Worst case per domain)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-5 py-4 text-[10px] uppercase font-bold text-foreground-subtle tracking-widest border-b border-white/5">Site ID</th>
              {domains.map(d => (
                <th key={d} className="px-2 py-4 text-[10px] uppercase font-bold text-foreground-subtle text-center w-32 tracking-widest border-b border-white/5">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sites.map(site => (
              <tr key={site.site_id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-5">
                  <p className="text-sm font-bold text-foreground tracking-tight group-hover:text-accent transition-colors">{site.site_id}</p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">{site.site_name}</p>
                </td>
                {domains.map(d => {
                  const status = getDomainStatus(site.site_id, d);
                  return (
                    <td key={d} className="px-2 py-5">
                      <div 
                        className={`h-10 w-full rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                          status === 'RED' ? 'bg-red-500/20 border border-red-500/50 shadow-inner-highlight' :
                          status === 'YELLOW' ? 'bg-yellow-500/20 border border-yellow-500/50 shadow-inner-highlight' :
                          status === 'GREEN' ? 'bg-emerald-500/20 border border-emerald-500/50 shadow-inner-highlight' : 'bg-white/[0.02] border border-white/5'
                        }`}
                      >
                        {status !== 'GREY' && <div className={`w-2 h-2 rounded-full ${
                          status === 'RED' ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,1)]' :
                          status === 'YELLOW' ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,1)]' :
                          'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]'
                        }`} />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex gap-6 border-t border-white/5 pt-6">
        <LegendItem color="bg-red-500/50 border border-red-500" label="Critical Breach" />
        <LegendItem color="bg-yellow-500/50 border border-yellow-500" label="Threshold Warning" />
        <LegendItem color="bg-emerald-500/50 border border-emerald-500" label="Compliant" />
        <LegendItem color="bg-white/10 border border-white/5" label="Insufficient Data" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
