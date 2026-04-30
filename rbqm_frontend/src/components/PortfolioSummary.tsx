import { useEffect, useRef, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { Portfolio } from '../types';
import { SpotlightCard } from './SpotlightCard';

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

function AnimatedStat({ value }: { value: number }) {
  const animated = useCountUp(value)
  return <>{animated}</>
}

export function PortfolioSummary({ data }: { data: Portfolio }) {
  const stats = [
    { label: 'Critical Sites', value: data.critical_sites.length, icon: AlertTriangle, color: 'text-red-400', glow: 'shadow-red-500/20' },
    { label: 'Action Required', value: data.alerts_count, icon: Shield, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
    { label: 'Sites Tracked', value: data.total_sites, icon: TrendingUp, color: 'text-accent', glow: 'shadow-accent/20' },
    { label: 'Ready for Lock', value: data.lock_ready_count, icon: CheckCircle2, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up">
      {stats.map((stat, idx) => (
        <SpotlightCard key={idx} className="p-6 relative group overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground-subtle">
                {stat.label}
              </p>
              <h3 className="text-3xl font-semibold tracking-tight text-gradient">
                <AnimatedStat value={stat.value} />
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/10 ${stat.color} ${stat.glow} transition-all duration-300 group-hover:scale-110 group-hover:border-white/20`}>
              <stat.icon size={20} />
            </div>
          </div>
          
          {/* Subtle Progress Bar */}
          <div className="mt-6 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30 animate-shimmer`}
              style={{ width: '100%', color: 'inherit' }}
            />
          </div>
        </SpotlightCard>
      ))}
    </div>
  );
}
