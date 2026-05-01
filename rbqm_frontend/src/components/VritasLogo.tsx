

interface VritasLogoProps {
  className?: string;
  variant?: 'full' | 'symbol' | 'monochrome';
}

export function VritasLogo({ className = '', variant = 'full' }: VritasLogoProps) {
  const indigo = variant === 'monochrome' ? 'currentColor' : '#5E6AD2';
  const emerald = variant === 'monochrome' ? 'currentColor' : '#10B981';

  const symbol = (
    <svg 
      viewBox="0 0 100 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={variant === 'full' ? 'w-12 h-12 shrink-0' : 'w-full h-full'}
    >
      {/* Left Outer (Indigo) */}
      <polygon points="0,10 15,10 50,80 50,110" fill={indigo} />
      {/* Left Inner (Indigo) */}
      <polygon points="20,10 35,10 45,30 37.5,45" fill={indigo} />
      
      {/* Right Outer (Emerald) */}
      <polygon points="100,10 85,10 50,80 50,110" fill={emerald} />
      {/* Right Inner (Emerald) */}
      <polygon points="80,10 65,10 55,30 62.5,45" fill={emerald} />
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
