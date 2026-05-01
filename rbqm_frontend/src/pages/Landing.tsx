import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Activity, FileText, Database, ChevronRight, CheckCircle2, FlaskConical, BarChart3, Lock, ArrowRight } from 'lucide-react';
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
      setDemoError(err.message || 'Unable to connect. Please try again.');
      // Auto-clear after 5 seconds
      setTimeout(() => setDemoError(''), 5000);
    } finally {
      setDemoLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as any }
    }
  };

  return (
    <div className="min-h-screen bg-background-base text-slate-200 selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* 3D Background */}
      <HeroScene />

      {/* ─── Navigation ─── */}
      <nav className="relative z-20 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <VritasLogo variant="full" />
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="hidden md:flex items-center gap-8"
          >
            <a href="#capabilities" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Capabilities</a>
            <a href="#compliance" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Compliance</a>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-semibold transition-all border border-white/[0.08] backdrop-blur-sm"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent-bright text-white text-sm font-bold transition-all shadow-lg shadow-accent/20"
            >
              Request Access
            </button>
          </motion.div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 pt-28 pb-20 px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto text-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent-bright text-xs font-bold uppercase tracking-[0.15em] mb-10"
          >
            <Shield size={14} /> ICH E6 (R3) Compliant Platform
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-gradient mb-8 leading-[0.92]"
          >
            Clinical Risk Monitoring,<br />
            <span className="text-accent-gradient">Redefined.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl leading-relaxed mb-12"
          >
            Vritas delivers end-to-end Risk-Based Quality Management for
            clinical trials — from automated KRI surveillance to centralized
            statistical monitoring and regulatory-grade reporting.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-lg transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {demoLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <FlaskConical size={20} />
                  Explore Demo <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              Sign In <ArrowRight size={16} />
            </button>
          </motion.div>

          {/* Error banner */}
          {demoError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium"
            >
              {demoError}
            </motion.div>
          )}

          {/* ─── Floating Metric Cards ─── */}
          <div className="mt-20 relative h-72 md:h-80 w-full max-w-4xl mx-auto hidden md:block">
            {/* Center — Portfolio Health */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, type: "spring" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-80"
            >
              <div className="glass-card p-6 border-accent/30 shadow-[0_0_50px_rgba(94,106,210,0.15)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-foreground-muted tracking-widest uppercase">Portfolio Health Score</span>
                  <Activity size={14} className="text-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-5xl font-black text-white tabular-nums">94</span>
                  <span className="text-sm font-bold text-emerald-400 mb-1.5">/ 100</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '94%' }}
                    transition={{ duration: 1.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-gradient-to-r from-accent to-emerald-400 h-full rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Left — Compliance Badge */}
            <motion.div
              initial={{ opacity: 0, x: 50, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 1, delay: 0.6, type: "spring" }}
              className="absolute left-[8%] top-[18%] z-10 w-60 animate-float"
              style={{ animationDelay: '0s' }}
            >
              <div className="glass-card p-5 bg-white/[0.01]">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">ICH E6 (R3)</p>
                    <p className="text-[10px] text-foreground-subtle tracking-widest uppercase">Fully Compliant</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — KRI Alert */}
            <motion.div
              initial={{ opacity: 0, x: -50, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 1, delay: 0.8, type: "spring" }}
              className="absolute right-[8%] bottom-[12%] z-30 w-60 animate-float"
              style={{ animationDelay: '2s' }}
            >
              <div className="glass-card p-5 bg-white/[0.01] backdrop-blur-2xl">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-400">KRI Threshold Breach</p>
                    <p className="text-[10px] text-white/70 tracking-widest uppercase mt-0.5">Action Required</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── Key Metrics ─── */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-md py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem label="KRI Metrics Tracked" value="20+" />
            <StatItem label="Regulatory Alignment" value="100%" />
            <StatItem label="Deployment Time" value="< 24h" />
            <StatItem label="Framework" value="ICH R3" />
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─── */}
      <section id="capabilities" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6"
            >
              Platform Capabilities
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black tracking-tight text-white mb-5"
            >
              Engineered for Clinical Precision.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-slate-500 text-lg max-w-xl mx-auto"
            >
              Purpose-built by clinical data management professionals for the demands of modern trials.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Activity}
              title="Real-Time KRI Surveillance"
              desc="Continuous computation of 20+ Key Risk Indicators across all active sites with configurable threshold alerting and automated escalation workflows."
              index={0}
            />
            <FeatureCard
              icon={Database}
              title="Centralized Statistical Monitoring"
              desc="Integrated detection of data anomalies, digit preference patterns, and inter-site variability using validated statistical methods aligned with TransCelerate guidance."
              index={1}
            />
            <FeatureCard
              icon={FileText}
              title="Regulatory-Grade Reporting"
              desc="Structured clinical narratives and audit-ready monitoring reports generated on demand, mapped directly to ICH E6 (R3) section requirements."
              index={2}
            />
          </div>

          {/* Secondary feature row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <FeatureCard
              icon={Lock}
              title="Database Lock Readiness"
              desc="Automated pre-lock assessment across all critical data points and KRIs with a composite readiness score and actionable resolution paths."
              index={3}
            />
            <FeatureCard
              icon={BarChart3}
              title="Risk Heatmap & Site Mapping"
              desc="Visual portfolio-level risk stratification with interactive heatmaps and geographic site overlays for rapid operational decision-making."
              index={4}
            />
            <FeatureCard
              icon={Shield}
              title="Multi-Tenant Access Control"
              desc="Role-based permissioning with full audit trail, session management, and two-factor authentication for enterprise-grade security."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* ─── Compliance ─── */}
      <section id="compliance" className="relative z-10 py-32 px-6 bg-white/[0.01] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright text-xs font-bold uppercase tracking-widest mb-8">
              Regulatory Framework
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Built Around ICH E6 (R3).</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Every feature in Vritas is mapped to specific regulatory sections, ensuring your RBQM implementation meets the latest guidelines from the first day of deployment.
            </p>
            <div className="space-y-5">
              <ComplianceItem text="Section 5.0 — Risk-Based Quality Management Framework" />
              <ComplianceItem text="Section 5.0.2 — Identification of Critical Data and Processes" />
              <ComplianceItem text="Section 5.18.3 — Centralized Monitoring Strategy" />
              <ComplianceItem text="Appendix C — Proportionality in Clinical Monitoring" />
              <ComplianceItem text="CDSCO Schedule Y & FDA 21 CFR Part 11 Alignment" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2 glass-card p-8 shadow-2xl relative"
          >
            <div className="absolute -top-4 -right-4 bg-emerald-500 text-slate-900 px-5 py-2 rounded-full font-black text-xs tracking-widest uppercase shadow-lg shadow-emerald-500/30 z-10">
              Audit Ready
            </div>
            <div className="space-y-5">
              {/* Mock compliance checklist */}
              {[
                { label: 'KRI Thresholds Configured', pct: 100 },
                { label: 'Monitoring Plan Mapped', pct: 100 },
                { label: 'Data Review Complete', pct: 87 },
                { label: 'Action Items Resolved', pct: 92 },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className={`font-bold tabular-nums ${item.pct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${item.pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass-card p-16 relative overflow-hidden group"
        >
          {/* Gradient border glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight relative z-10">
            Ready to Elevate Your<br />Monitoring Strategy?
          </h2>
          <p className="text-slate-400 font-medium text-lg mb-10 relative z-10 max-w-lg mx-auto">
            Deploy Vritas and bring your clinical monitoring into full regulatory alignment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 bg-accent hover:bg-accent-bright text-white font-black text-lg rounded-xl transition-all shadow-xl shadow-accent/20"
            >
              Get Started
            </button>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="px-10 py-4 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50"
            >
              {demoLoading ? 'Connecting…' : 'Explore Demo'}
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 px-6 bg-white/[0.01] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <VritasLogo variant="symbol" className="w-6 h-6" />
            <span className="font-bold text-white">Vritas RBQM</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 font-mono uppercase tracking-widest">
            <span>ICH E6 (R3)</span>
            <span className="text-white/10">·</span>
            <span>CDSCO Schedule Y</span>
            <span className="text-white/10">·</span>
            <span>FDA 21 CFR Part 11</span>
          </div>
          <div className="text-slate-600 text-xs font-mono">
            © {new Date().getFullYear()} Vritas. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-Components ─── */

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <p className="text-4xl md:text-5xl font-black text-white mb-2 tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">{label}</p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: typeof Activity; title: string; desc: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -8 }}
      className="p-8 glass-card glass-card-hover group relative"
    >
      {/* Hover gradient edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-transparent group-hover:via-accent/40 to-transparent transition-colors duration-500" />

      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit mb-6 text-accent group-hover:text-emerald-400 group-hover:border-accent/30 transition-all duration-300">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}

function ComplianceItem({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex items-center gap-4 text-slate-300"
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 size={14} className="text-emerald-400" />
      </div>
      <span className="font-medium text-sm">{text}</span>
    </motion.div>
  );
}
