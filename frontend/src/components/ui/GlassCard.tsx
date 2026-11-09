import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'violet' | 'peach' | 'none';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  hoverEffect = false,
  ...props
}) => {
  const glowClasses = {
    cyan: 'shadow-aurora-glow border-white/25',
    violet: 'shadow-aurora-glow border-[#B9AEFF]/30',
    peach: 'shadow-active-pill border-[#FFA566]/30',
    none: 'border-white/15 shadow-glass',
  }[glow];

  return (
    <div
      className={`relative rounded-[24px] aurora-glass border ${glowClasses} ${
        hoverEffect ? 'aurora-glass-hover' : ''
      } ${className}`}
      {...props}
    >
      {/* Top subtle highlight reflection */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-t-[24px] pointer-events-none" />
      {children}
    </div>
  );
};
