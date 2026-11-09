import React from 'react';
import {
  LayoutDashboard,
  MessageSquareText,
  BarChart2,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';

export type NavigationPage = 'overview' | 'assistant' | 'history' | 'analytics' | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { backendConnected } = useAssistant();

  const mainNavItems: Array<{
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'Nova AI', icon: Sparkles },
    { id: 'history', label: 'Conversations', icon: MessageSquareText },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <aside className="relative z-30 flex-shrink-0 my-3.5 sm:my-4 ml-3.5 sm:ml-4 w-52 sm:w-60 h-[calc(100vh-28px)] sm:h-[calc(100vh-32px)] rounded-[28px] sm:rounded-[32px] aurora-glass p-3.5 sm:p-4 flex flex-col justify-between shadow-2xl select-none">
      {/* Top Branding Section */}
      <div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-6">
          {/* Logo Mark: Concentric Rings Icon */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/20 shadow-sm">
            <div className="w-4 h-4 rounded-full border border-white/80 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
          <span className="text-[17px] sm:text-[18px] font-bold tracking-tight text-white font-display">
            AURA
          </span>
        </div>

        {/* Section Label: Menu */}
        <div className="px-3 mb-2">
          <span className="text-[11px] font-medium tracking-wider uppercase text-white/40">
            Menu
          </span>
        </div>

        {/* Primary Navigation Items */}
        <nav className="space-y-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 select-none ${
                  isActive
                    ? 'active-nav-pill font-semibold shadow-active-pill'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white stroke-[2.2]' : 'text-white/60 stroke-[1.8]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: General & Settings */}
      <div>
        <div className="px-3 mb-2">
          <span className="text-[11px] font-medium tracking-wider uppercase text-white/40">
            General
          </span>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 select-none ${
            currentPage === 'settings'
              ? 'active-nav-pill font-semibold shadow-active-pill'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Settings className={`w-4 h-4 flex-shrink-0 ${currentPage === 'settings' ? 'text-white stroke-[2.2]' : 'text-white/60 stroke-[1.8]'}`} />
          <span className="truncate">AI Settings</span>
        </button>

        {/* Minimal status dot with tooltip */}
        <div className="mt-3 px-3 pt-1 flex items-center justify-center">
          <span
            className={`w-2 h-2 rounded-full cursor-help transition-all ${
              backendConnected ? 'bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400/80'
            }`}
            title={backendConnected ? 'System Online (FastAPI + ElevenLabs)' : 'Backend Offline'}
          />
        </div>
      </div>
    </aside>
  );
};
