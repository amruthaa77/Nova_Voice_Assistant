import React from 'react';
import { Sidebar, NavigationPage } from './Sidebar';
import { AuroraBackground } from './AuroraBackground';
import { useAssistant } from '../../context/AssistantContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  title: string;
  subtitle?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  title,
  subtitle,
}) => {
  const { reducedMotion } = useAssistant();

  return (
    <div className="relative flex h-screen w-screen overflow-hidden font-sans text-white select-none">
      {/* Dreamy Aurora Mesh Background with Drifting Blobs & Noise */}
      <AuroraBackground reducedMotion={reducedMotion} />

      {/* Floating Glass Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Stage Viewport */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {currentPage === 'assistant' ? (
          // Clean, seamless central stage for Voice Assistant (no header clutter, fits in 1 viewport)
          <main className="flex-1 h-full w-full overflow-hidden flex flex-col justify-center items-center px-4 sm:px-8 py-3 sm:py-6">
            {children}
          </main>
        ) : (
          // Secondary Dashboard Pages (Overview, History, Analytics, Settings)
          <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden p-3.5 sm:p-5 pr-3.5 sm:pr-5">
            {/* Sleek Frosted Header Bar for secondary pages */}
            <div className="flex items-center justify-between px-6 py-4 rounded-[24px] aurora-glass mb-4 shadow-lg flex-shrink-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                  {title}
                </h1>
                {subtitle && <p className="text-xs sm:text-sm text-white/60 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Scrollable frosted content pane */}
            <main className="flex-1 overflow-y-auto rounded-[28px] aurora-glass p-5 sm:p-7 shadow-xl">
              <div className="max-w-6xl mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
