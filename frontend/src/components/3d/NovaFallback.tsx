import React from 'react';
import { AssistantStatus } from '../../api/types';

export interface NovaFallbackProps {
  status: AssistantStatus;
}

export type OrbFallbackProps = NovaFallbackProps;

export const NovaFallback: React.FC<NovaFallbackProps> = ({ status }) => {
  const getStatusFace = () => {
    switch (status) {
      case 'connecting':
        return '● ● ●';
      case 'thinking':
        return '• • •';
      case 'listening':
        return '◉ ‿ ◉';
      case 'speaking':
        return '■ ▽ ■';
      case 'error':
        return '× ─ ×';
      case 'idle':
      default:
        return '■ ‿ ■';
    }
  };

  const getRingColor = () => {
    if (status === 'error') return '#FF5C5C';
    if (status === 'listening' || status === 'speaking') return '#B9B0F0';
    return '#D4F23A';
  };

  return (
    <div className="relative w-full h-[280px] sm:h-[340px] flex items-center justify-center select-none">
      {/* 2D Stylized Nova Mascot Fallback */}
      <div className="relative flex flex-col items-center animate-float">
        {/* Head Shell */}
        <div className="relative w-28 h-24 sm:w-32 sm:h-28 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-2xl border-2 border-white flex items-center justify-center">
          {/* Ear pods */}
          <div
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-9 rounded-md bg-[#8F86D9] border"
            style={{ borderColor: getRingColor() }}
          />
          <div
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-4 h-9 rounded-md bg-[#8F86D9] border"
            style={{ borderColor: getRingColor() }}
          />

          {/* Screen Visor */}
          <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-[14px] bg-[#0B0B12] shadow-inner flex items-center justify-center border border-white/10">
            <span
              className="font-mono text-sm sm:text-base font-bold tracking-widest"
              style={{ color: status === 'error' ? '#FF5C5C' : '#FFE500' }}
            >
              {getStatusFace()}
            </span>
          </div>
        </div>

        {/* Neck Accent */}
        <div
          className="w-12 h-1.5 rounded-full my-1 shadow-sm"
          style={{ backgroundColor: getRingColor() }}
        />

        {/* Torso */}
        <div className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-full bg-gradient-to-b from-[#8F86D9] to-[#6A60B8] shadow-lg flex items-center justify-center border border-white/20">
          <div className="w-10 h-8 rounded-full bg-white/30 backdrop-blur-sm" />
        </div>

        {/* Soft shadow below */}
        <div className="w-24 h-4 rounded-full bg-[#1A1535]/30 blur-md mt-4" />
      </div>
    </div>
  );
};

export const OrbFallback = NovaFallback;
export default NovaFallback;
