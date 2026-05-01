import React from 'react';

interface VritasLogoProps {
  className?: string;
  variant?: 'full' | 'symbol' | 'monochrome';
}

export function VritasLogo({ className = '', variant = 'full' }: VritasLogoProps) {
  const indigo = variant === 'monochrome' ? 'currentColor' : '#5E6AD2';
  const emerald = variant === 'monochrome' ? 'currentColor' : '#10B981';

  const symbol = (
    <svg 
      viewBox="0 0 120 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={variant === 'full' ? 'w-12 h-10 shrink-0' : 'w-full h-full'}
    >
      {/* Left Outer & Inner (Indigo) */}
      <line x1="15" y1="10" x2="55" y2="90" stroke={indigo} strokeWidth="16" strokeLinecap="square" />
      <line x1="45" y1="10" x2="60" y2="40" stroke={indigo} strokeWidth="16" strokeLinecap="square" />
      
      {/* Right Outer & Inner (Emerald) */}
      <line x1="105" y1="10" x2="65" y2="90" stroke={emerald} strokeWidth="16" strokeLinecap="square" />
      <line x1="75" y1="10" x2="60" y2="40" stroke={emerald} strokeWidth="16" strokeLinecap="square" />
    </svg>
  );

  if (variant === 'symbol' || variant === 'monochrome') {
    return (
      <div className={className}>
        {symbol}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {symbol}
      <div className="flex flex-col justify-center">
        <span 
          className="font-black tracking-tight leading-none" 
          style={{ fontSize: '1.75rem', color: indigo, fontFamily: 'Outfit, sans-serif' }}
        >
          VRITAS
        </span>
      </div>
    </div>
  );
}
