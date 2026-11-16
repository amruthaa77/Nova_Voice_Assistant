import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  MessageSquareText,
  BarChart2,
  Settings,
  Sparkles,
} from 'lucide-react';
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
  const { reducedMotion, backendConnected } = useAssistant();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer whenever viewport resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems: Array<{
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'Nova', icon: Sparkles },
    { id: 'history', label: 'Conversations', icon: MessageSquareText },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const handleMobileNav = (page: NavigationPage) => {
    onNavigate(page);
    setIsMobileNavOpen(false);
  };

  const getPageLabel = (page: NavigationPage) => {
    switch (page) {
      case 'overview':
        return 'Dashboard';
      case 'assistant':
        return 'Nova';
      case 'history':
        return 'Conversations';
      case 'analytics':
        return 'Analytics';
      case 'settings':
        return 'Settings';
      default:
        return 'Nova';
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full max-w-[100vw] overflow-hidden font-sans text-white select-none">
      {/* Dreamy Aurora Mesh Background with Drifting Blobs & Noise */}
      <AuroraBackground reducedMotion={reducedMotion} />

      {/* Persistent Floating Glass Sidebar for Desktop (>= 1024px) */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Mobile Backdrop & Drawer for Viewports < 1024px */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] aurora-glass border-r border-white/20 p-5 flex flex-col justify-between shadow-2xl lg:hidden transform transition-transform duration-300 ease-out select-none ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div>
          {/* Header row with logo mark and close button */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/20 shadow-sm">
                <div className="w-4 h-4 rounded-full border border-white/80 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
              <span className="text-[18px] font-bold tracking-tight text-white font-display">
                NOVA
              </span>
            </div>

            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section: Menu */}
          <div className="px-2 mb-2">
            <span className="text-[11px] font-medium tracking-wider uppercase text-white/40">
              Menu
            </span>
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMobileNav(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all select-none cursor-pointer ${
                    isActive
                      ? 'active-nav-pill font-semibold shadow-active-pill'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white stroke-[2.2]' : 'text-white/70'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings & Status */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="px-2">
            <span className="text-[11px] font-medium tracking-wider uppercase text-white/40">
              General
            </span>
          </div>

          <button
            onClick={() => handleMobileNav('settings')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all select-none cursor-pointer ${
              currentPage === 'settings'
                ? 'active-nav-pill font-semibold shadow-active-pill'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className={`w-4 h-4 flex-shrink-0 ${currentPage === 'settings' ? 'text-white stroke-[2.2]' : 'text-white/70'}`} />
            <span>AI Settings</span>
          </button>

          {/* Backend Status Pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                backendConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-rose-400'
              }`}
            />
            <span className="truncate">
              {backendConnected ? 'System Online (FastAPI)' : 'Backend Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Stage Viewport */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 h-[100dvh] max-h-[100dvh] overflow-hidden">
        {/* Sleek Frosted Mobile Top Bar (< 1024px) */}
        <header className="lg:hidden z-30 flex items-center justify-between px-3.5 sm:px-5 py-2.5 mx-2.5 sm:mx-4 mt-2.5 sm:mt-3 rounded-2xl aurora-glass shadow-lg flex-shrink-0">
          {/* Logo Mark + Title */}
          <button
            onClick={() => onNavigate('assistant')}
            className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
            aria-label="Nova Voice Assistant"
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/10 border border-white/20 shadow-sm">
              <div className="w-3.5 h-3.5 rounded-full border border-white/80 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <span className="text-[16px] font-bold tracking-tight text-white font-display">
              NOVA
            </span>
          </button>

          {/* Active Page Pill Badge */}
          <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-white/90 tracking-wide">
            {getPageLabel(currentPage)}
          </div>

          {/* Status Dot + Hamburger Button */}
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                backendConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-400'
              }`}
              title={backendConnected ? 'Online' : 'Offline'}
            />
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {currentPage === 'assistant' ? (
          // Clean, seamless central stage for Voice Assistant
          <main className="flex-1 w-full min-h-0 overflow-y-auto sm:overflow-hidden flex flex-col justify-between items-center px-3 sm:px-6 py-2 sm:py-6">
            {children}
          </main>
        ) : (
          // Secondary Dashboard Pages (Overview, History, Analytics, Settings)
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-2.5 sm:p-5 pr-2.5 sm:pr-5">
            {/* Sleek Frosted Header Bar for secondary pages on desktop */}
            <div className="hidden lg:flex items-center justify-between px-6 py-4 rounded-[24px] aurora-glass mb-4 shadow-lg flex-shrink-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                  {title}
                </h1>
                {subtitle && <p className="text-xs sm:text-sm text-white/60 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Scrollable frosted content pane */}
            <main className="flex-1 overflow-y-auto rounded-2xl sm:rounded-[28px] aurora-glass p-3.5 sm:p-7 shadow-xl">
              <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
                {children}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
