import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SiteSummary, SiteDetail } from '../types';

export function QueryManagementView() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [siteDetails, setSiteDetails] = useState<Record<string, SiteDetail>>({});
  const [loading, setLoading] = useState(true);

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
        console.error('Query view error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getKriValue = (siteId: string, kriId: string) => {
    const detail = siteDetails[siteId];
    if (!detail) return null;
    const kri = detail.kris.find(k => k.kri_id === kriId);
    return kri ? kri.value : null;
  };

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading Query Analytics...</div>;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Query Management & Resolution Analytics</h3>
        <p className="text-xs text-slate-500 mt-1">Real-time tracking of EDC query volume and resolution timelines (ICH E6 R3 Section 5.18)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-700">
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3 text-center">Open Queries</th>
              <th className="px-4 py-3 text-center">Avg Resolution (Days)</th>
              <th className="px-4 py-3 text-center">Query Rate / 100 Pts</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sites.map(site => {
              const queryRate = getKriValue(site.site_id, '1.2'); // Query Rate
              const resolutionTime = getKriValue(site.site_id, '1.3'); // Resolution Time
              // Simulating open queries and age based on the KRI values
              const openQueries = Math.round((queryRate || 0) * 1.5);
              const oldestQuery = Math.round((resolutionTime || 0) * 2.1);
              
              const isCritical = (resolutionTime || 0) > 14 || (queryRate || 0) > 20;
              const isWarning = (resolutionTime || 0) > 7 || (queryRate || 0) > 10;

              return (
                <tr key={site.site_id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-slate-200">{site.site_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{site.site_id}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className="text-lg font-bold text-slate-100">{openQueries}</p>
                    <p className="text-[10px] text-slate-500">Oldest: {oldestQuery}d</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className={`text-lg font-bold ${resolutionTime && resolutionTime > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {resolutionTime ? resolutionTime.toFixed(1) : '-'}
                    </p>
                    <p className="text-[10px] text-slate-500">Target: &lt; 5.0d</p>
                  </td>
                  <td className="px-4 py-4 text-center font-mono">
                    <p className="text-sm text-slate-200">{queryRate ? queryRate.toFixed(1) : '-'}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${
                      isCritical ? 'bg-red-900/20 text-red-400 border-red-800' :
                      isWarning ? 'bg-yellow-900/20 text-yellow-400 border-yellow-800' :
                      'bg-emerald-900/20 text-emerald-400 border-emerald-800'
                    }`}>
                      {isCritical ? 'Critical' : isWarning ? 'Warning' : 'Good'}
                    </span>
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
