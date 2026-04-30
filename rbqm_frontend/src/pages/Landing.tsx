import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Activity, FileText, Database, ChevronRight, CheckCircle2, FlaskConical, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HeroScene from '../components/3d/HeroScene';

export default function Landing() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTryDemo = async () => {
    setDemoLoading(true);
    try {
      await login('demo@rbqm.com', 'demo1234');
      navigate('/dashboard');
    } catch {
      // If demo user doesn't exist, redirect to register
      navigate('/register');
    } finally {
      setDemoLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-background-base text-slate-200 selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* 3D Background */}
      <HeroScene />

      {/* Nav */}
      <nav className="relative z-20 border-b border-border-default bg-surface backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="text-slate-900" size={24} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-none">Vritas RBQM</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">ICH E6 R3 Compliant</span>
            </div>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="hidden md:flex items-center gap-8"
          >
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#compliance" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Compliance</a>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-white text-sm font-bold transition-all border border-slate-700 backdrop-blur-sm"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-24 px-6">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto text-center"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Zap size={14} className="animate-pulse" /> Next-Gen Clinical Monitoring
          </motion.div>
          <motion.h1 
            variants={itemVariants}
            className="text-6xl md:text-8xl font-black tracking-tighter text-gradient mb-8 leading-[0.9]"
          >
            Risk-Based Quality <br />
            <span className="text-accent-gradient">Management.</span>
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl leading-relaxed mb-12"
          >
            The industry's first fully ICH E6 R3 aligned monitoring tool. 
            Automate KRI calculations, detect site fraud with AI, and maintain 
            perfect regulatory alignment throughout your trial.
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
                  Logging in...
                </>
              ) : (
                <>
                  <FlaskConical size={20} />
                  Try Demo <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50 text-white font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              Create Account
            </button>
          </motion.div>
          <motion.p 
            variants={itemVariants}
            className="text-xs text-slate-600 mt-4 font-mono"
          >
            Demo: demo@rbqm.com / demo1234 — Pre-loaded with 5 sites and KRI data
          </motion.p>

          {/* Dashboard Preview */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            whileInView={{ scale: 1, opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-24 relative"
          >
            <div className="absolute inset-0 bg-accent-glow blur-[120px] -z-10 opacity-30" />
            <div className="glass-card p-2">
              <div className="bg-background-elevated rounded-xl p-8 grid grid-cols-3 gap-4 relative overflow-hidden">
                <div className="absolute inset-0 grid-overlay opacity-20 pointer-events-none" />
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-6 text-center hover:border-red-500/50 transition-colors group">
                  <p className="text-3xl font-black text-red-400 group-hover:scale-110 transition-transform">12</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">RED KRIs</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-6 text-center hover:border-yellow-500/50 transition-colors group">
                  <p className="text-3xl font-black text-yellow-400 group-hover:scale-110 transition-transform">18</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">YELLOW KRIs</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors group">
                  <p className="text-3xl font-black text-emerald-400 group-hover:scale-110 transition-transform">70</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">GREEN KRIs</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border-default bg-surface backdrop-blur-md py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem label="KRI Metrics" value="20+" />
            <StatItem label="Audit Success" value="100%" />
            <StatItem label="Setup Time" value="< 2hrs" />
            <StatItem label="Compliance" value="R3 Ready" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4"
            >
              Engineered for Accuracy.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-slate-500 text-lg"
            >
              Built by clinical data experts for high-stakes trials.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Activity}
              title="Real-time KRI Engine"
              desc="Instant analysis of EDC data across 20+ Key Risk Indicators with threshold-based alerting."
              index={0}
            />
            <FeatureCard 
              icon={Database}
              title="Centralized Monitoring"
              desc="Advanced statistical detection of data outliers, digit preference, and intra-site variability."
              index={1}
            />
            <FeatureCard 
              icon={FileText}
              title="AI Narrative Reporting"
              desc="LLM-driven clinical narratives that turn raw data into audit-ready monitoring reports."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="relative z-10 py-32 px-6 bg-slate-900/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              Regulatory Alignment
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-8">ICH E6 R3 Compliance as Standard.</h2>
            <div className="space-y-6">
              <ComplianceItem text="Section 5.0: Risk-Based Quality Management Framework" />
              <ComplianceItem text="Section 5.0.2: Identification of Critical Data and Processes" />
              <ComplianceItem text="Section 5.18.3: Centralized Monitoring Strategy" />
              <ComplianceItem text="Appendix C: Proportionality in Clinical Monitoring" />
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2 bg-slate-800/20 border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative backdrop-blur-xl"
          >
            <div className="absolute -top-4 -right-4 bg-emerald-500 text-slate-900 px-6 py-2 rounded-full font-black text-sm shadow-lg z-10">
              AUDIT READY
            </div>
            <div className="space-y-4">
              <div className="h-4 w-3/4 bg-slate-700/30 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute inset-0 bg-emerald-500/20 w-1/2"
                />
              </div>
              <div className="h-4 w-1/2 bg-slate-700/30 rounded-full" />
              <div className="h-4 w-5/6 bg-slate-700/30 rounded-full" />
              <div className="pt-8 grid grid-cols-2 gap-4">
                <div className="h-20 bg-slate-900/40 border border-slate-700/50 rounded-xl" />
                <div className="h-20 bg-slate-900/40 border border-slate-700/50 rounded-xl" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-32 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[3rem] p-16 shadow-2xl shadow-emerald-500/20 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight relative z-10">Ready to modernize your monitoring?</h2>
          <p className="text-slate-900/80 font-medium text-lg mb-10 relative z-10">Join leading CROs and sponsors using Vritas RBQM.</p>
          <button 
            onClick={() => navigate('/register')}
            className="px-10 py-5 bg-slate-900 text-white font-black text-xl rounded-2xl hover:scale-105 transition-all shadow-2xl relative z-10"
          >
            Create Your Account
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/30 py-12 px-6 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            <span className="font-bold text-white">Vritas RBQM</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
            <span>ICH E6 R3</span>
            <span>·</span>
            <span>CDSCO Schedule Y</span>
            <span>·</span>
            <span>FDA 21 CFR</span>
            <span>·</span>
            <span>Built by a PharmD</span>
          </div>
          <div className="text-slate-600 text-xs font-mono">
            © 2026 Vritas RBQM. Fully ICH E6 R3 Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <p className="text-4xl md:text-5xl font-black text-white mb-2">{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-bold">{label}</p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: typeof Activity; title: string; desc: string; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -10 }}
      className="p-8 glass-card glass-card-hover group relative overflow-hidden"
    >
      <div className="absolute -inset-px bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 w-fit mb-6 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{title}</h3>
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
      <span className="font-medium">{text}</span>
    </motion.div>
  );
}
