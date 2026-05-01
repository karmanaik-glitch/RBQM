import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Activity, FileText, ChevronRight, CheckCircle2, FlaskConical, ArrowRight, BarChart3, Lock, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HeroScene from '../components/3d/HeroScene';
import { VritasLogo } from '../components/VritasLogo';

export default function Landing() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTryDemo = async () => {
    setDemoLoading(true);
    setDemoError('');
    try {
      await login('admin@acmecro.com', 'Password123!');
      navigate('/dashboard');
    } catch (err: any) {
      setDemoError(err.message || 'Unable to connect.');
      setTimeout(() => setDemoError(''), 5000);
    } finally {
      setDemoLoading(false);
    }
  };

  const fade = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] as any }
    })
  };

  return (
    <div className="min-h-screen bg-background-base text-slate-200 overflow-x-hidden">
      {/* 3D Background — only visible in hero */}
      <HeroScene />

      {/* ═══════════════════ NAVIGATION ═══════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-background-base/60 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <VritasLogo variant="full" />
          <div className="hidden md:flex items-center gap-6">
            <a href="#platform" className="text-xs font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Platform</a>
            <a href="#compliance" className="text-xs font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Compliance</a>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-bright text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {demoLoading ? 'Connecting…' : 'Live Demo'}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-20">
          {/* Left — Copy */}
          <div>
            <motion.div
              custom={0} variants={fade} initial="hidden" animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
            >
              <Shield size={12} /> ICH E6 (R3) Aligned
            </motion.div>

            <motion.h1
              custom={1} variants={fade} initial="hidden" animate="visible"
              className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6"
            >
              Risk-Based Quality Management for Clinical Trials
            </motion.h1>

            <motion.p
              custom={2} variants={fade} initial="hidden" animate="visible"
              className="text-slate-400 text-base md:text-lg leading-relaxed mb-10 max-w-lg"
            >
              Vritas provides automated KRI surveillance, centralized statistical 
              monitoring, and regulatory-grade reporting — purpose-built for 
              sponsors, CROs, and clinical operations teams.
            </motion.p>

            <motion.div
              custom={3} variants={fade} initial="hidden" animate="visible"
              className="flex flex-wrap items-center gap-3"
            >
              <button
                onClick={handleTryDemo}
                disabled={demoLoading}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm transition-all flex items-center gap-2 group disabled:opacity-50"
              >
                {demoLoading ? (
                  <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> Connecting…</>
                ) : (
                  <><FlaskConical size={16} /> Explore Demo <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] text-white font-semibold text-sm transition-all flex items-center gap-2"
              >
                Sign In <ArrowRight size={14} />
              </button>
            </motion.div>

            {demoError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-3 text-red-400 text-xs font-medium"
              >{demoError}</motion.p>
            )}

            {/* Trust markers */}
            <motion.div
              custom={4} variants={fade} initial="hidden" animate="visible"
              className="flex items-center gap-6 mt-12 pt-8 border-t border-white/[0.04]"
            >
              {['ICH E6 (R3)', 'FDA 21 CFR', 'CDSCO Schedule Y'].map(tag => (
                <span key={tag} className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{tag}</span>
              ))}
            </motion.div>
          </div>

          {/* Right — The 3D globe fills this space naturally via the fixed HeroScene */}
          <div className="hidden lg:block" />
        </div>
      </section>

      {/* ═══════════════════ METRICS STRIP ═══════════════════ */}
      <section className="relative z-10 border-y border-white/[0.04] bg-background-base">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '20+', label: 'KRI Metrics' },
            { value: '100%', label: 'Audit Alignment' },
            { value: '< 24h', label: 'Deployment' },
            { value: 'R3', label: 'ICH Framework' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-black text-white tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ PLATFORM ═══════════════════ */}
      <section id="platform" className="relative z-10 py-28 px-6 bg-background-base">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mb-16"
          >
            <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Platform</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-3 mb-4">
              Everything you need for RBQM.
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              From KRI threshold surveillance to database lock readiness — 
              a single platform for your entire risk management workflow.
            </p>
          </motion.div>

          {/* Bento Grid — asymmetric for visual interest */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Primary card — spans 2 cols */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 glass-card p-8 flex flex-col justify-between min-h-[240px]"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">KRI Surveillance Engine</h3>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
                  Continuous computation of 20+ Key Risk Indicators across all active sites.
                  Configurable thresholds with automated escalation workflows and 
                  real-time status classification — Green, Yellow, Red.
                </p>
              </div>
              {/* Mini visualization */}
              <div className="flex items-end gap-1 mt-6 h-12">
                {[65, 45, 80, 55, 90, 35, 70, 50, 85, 40, 75, 60, 95, 30, 68].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.03, duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
                    className={`flex-1 rounded-sm ${h > 70 ? 'bg-emerald-500/60' : h > 45 ? 'bg-amber-500/50' : 'bg-red-500/40'}`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Reporting card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 min-h-[240px] flex flex-col"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                <FileText size={18} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Regulatory Reporting</h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">
                Structured clinical narratives and monitoring reports, mapped directly to 
                ICH E6 (R3) section requirements.
              </p>
              <div className="mt-4 space-y-2">
                {['Narrative Generated', 'Sections Mapped', 'Export Ready'].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-xs text-slate-400">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Lock Readiness */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="glass-card p-8 min-h-[200px]"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                <Lock size={18} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Lock Readiness</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Automated pre-lock assessment with composite readiness scoring and 
                actionable resolution tracking per site.
              </p>
            </motion.div>

            {/* Statistical Monitoring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 min-h-[200px]"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Database size={18} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Statistical Monitoring</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Detection of data anomalies, digit preference, and inter-site 
                variability using validated statistical methods.
              </p>
            </motion.div>

            {/* Risk Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="glass-card p-8 min-h-[200px]"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <BarChart3 size={18} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Risk Heatmaps</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Portfolio-level risk stratification with interactive site overlays 
                for rapid operational decision-making.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ COMPLIANCE ═══════════════════ */}
      <section id="compliance" className="relative z-10 py-28 px-6 border-t border-white/[0.04] bg-background-base">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Compliance</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-3 mb-4">
              Built around ICH E6 (R3).
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-10">
              Every feature is mapped to specific regulatory sections. Your RBQM 
              implementation meets the latest guidelines from day one.
            </p>
            <div className="space-y-4">
              {[
                'Section 5.0 — Quality Management Framework',
                'Section 5.0.2 — Critical Data & Process Identification',
                'Section 5.18.3 — Centralized Monitoring Strategy',
                'Appendix C — Proportionality in Monitoring',
                'FDA 21 CFR Part 11 — Electronic Records',
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Compliance readiness panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compliance Score</span>
              <span className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">Audit Ready</span>
            </div>
            <div className="space-y-6">
              {[
                { label: 'KRI Thresholds', pct: 100 },
                { label: 'Monitoring Plan', pct: 100 },
                { label: 'Data Review', pct: 87 },
                { label: 'Action Items', pct: 92 },
                { label: 'Lock Criteria', pct: 78 },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                    <span className={`text-xs font-bold tabular-nums ${item.pct === 100 ? 'text-emerald-400' : item.pct >= 85 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] as any }}
                      className={`h-full rounded-full ${item.pct === 100 ? 'bg-emerald-500' : item.pct >= 85 ? 'bg-amber-500' : 'bg-slate-500'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="relative z-10 py-28 px-6 border-t border-white/[0.04] bg-background-base">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Deploy Vritas and bring your monitoring into full regulatory alignment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-accent hover:bg-accent-bright text-white font-bold text-sm rounded-lg transition-all"
            >
              Get Started
            </button>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="px-6 py-3 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
            >
              {demoLoading ? 'Connecting…' : 'Explore Demo'}
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6 bg-background-base">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <VritasLogo variant="symbol" className="w-5 h-5 opacity-40" />
          <div className="flex items-center gap-4 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
            <span>ICH E6 (R3)</span>
            <span className="text-white/10">·</span>
            <span>CDSCO Schedule Y</span>
            <span className="text-white/10">·</span>
            <span>FDA 21 CFR Part 11</span>
          </div>
          <span className="text-[10px] text-slate-700 font-mono">© {new Date().getFullYear()} Vritas</span>
        </div>
      </footer>
    </div>
  );
}
