import React from 'react';

interface AuroraBackgroundProps {
  reducedMotion?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ reducedMotion = false }) => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#251f47]">
      {/* 1. Deep Violet / Indigo Base Layer (Left & Bottom) */}
      <div
        className={`absolute -left-[10%] -bottom-[15%] w-[70vw] h-[85vh] rounded-full bg-gradient-to-tr from-[#251c4a] via-[#3B3470] to-[#5B4FB8] blur-[120px] opacity-95 ${
          reducedMotion ? '' : 'animate-drift'
        }`}
      />

      {/* 2. Warm Peach & Radiant Coral Wash (Right & Bottom-Right) */}
      <div
        className={`absolute -right-[15%] -bottom-[10%] w-[65vw] h-[75vh] rounded-full bg-gradient-to-tl from-[#E08A5A] via-[#F2A36B] to-[#FFA566] blur-[130px] opacity-80 ${
          reducedMotion ? '' : 'animate-drift'
        }`}
        style={{ animationDelay: '-8s', animationDirection: 'alternate-reverse' }}
      />

      {/* 3. Mauve / Coral Transition Blend (Center-Right) */}
      <div
        className={`absolute right-[25%] top-[20%] w-[45vw] h-[55vh] rounded-full bg-[#B77A8E] blur-[140px] opacity-45 ${
          reducedMotion ? '' : 'animate-drift'
        }`}
        style={{ animationDelay: '-14s' }}
      />

      {/* 4. Lavender & Periwinkle Glow Layer */}
      <div
        className={`absolute left-[15%] top-[10%] w-[50vw] h-[60vh] rounded-full bg-gradient-to-br from-[#8B80E0] via-[#B9B0F0] to-transparent blur-[130px] opacity-70 ${
          reducedMotion ? '' : 'animate-drift'
        }`}
        style={{ animationDelay: '-5s' }}
      />

      {/* 5. Center Stage Bright White / Near-White Bloom (Directly behind Bot & Headline) */}
      <div
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[580px] h-[480px] sm:h-[580px] rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#F1EEFA] to-[#D8D0F5] blur-[100px] opacity-85"
      />

      {/* 6. Dark Vertical "Light Beam" at Top-Center (Fading Downward into Bloom) */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[380px] sm:w-[480px] h-[260px] sm:h-[320px] bg-gradient-to-b from-[#0A0A12] via-[#0A0A12]/80 to-transparent blur-[40px] opacity-80 rounded-b-[100px]"
      />

      {/* 7. Subtle Ambient Grain Overlay */}
      <div className="absolute inset-0 w-full h-full aurora-grain opacity-40 mix-blend-overlay" />
    </div>
  );
};
