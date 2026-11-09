import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' | 'peach' | 'lavender';
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  pulse = false,
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    peach: 'bg-[#FFA566]/15 text-[#FFA566] border-[#FFA566]/30',
    lavender: 'bg-[#B9AEFF]/15 text-[#B9AEFF] border-[#B9AEFF]/30',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    violet: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    slate: 'bg-white/10 text-white/70 border-white/15',
  }[variant];

  const dotColors = {
    peach: 'bg-[#FFA566]',
    lavender: 'bg-[#B9AEFF]',
    cyan: 'bg-cyan-400',
    violet: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-white/60',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs sm:text-sm px-3 py-1 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md ${variantStyles} ${sizeStyles} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors}`} />
        </span>
      )}
      {children}
    </span>
  );
};
