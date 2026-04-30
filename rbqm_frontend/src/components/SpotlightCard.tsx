import React from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  return (
    <div className={`relative glass-card glass-card-hover overflow-hidden ${className}`}>
      {/* Top Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
