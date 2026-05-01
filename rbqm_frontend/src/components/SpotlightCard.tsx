import React from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  return (
    <div className={`group relative glass-card glass-card-hover ${className}`}>
      {/* Premium Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 group-hover:via-accent/50 to-transparent transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Background glow that follows hover (CSS only approach) */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-emerald-brand/0 group-hover:from-accent/5 group-hover:to-emerald-brand/5 transition-colors duration-500 pointer-events-none" />

      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
