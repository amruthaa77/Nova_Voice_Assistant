import React, { useState, useEffect } from 'react';
import { AssistantProvider } from './context/AssistantContext';
import { Layout } from './components/layout/Layout';
import { NavigationPage } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('assistant');

  useEffect(() => {
    document.title = currentPage === 'assistant' ? 'Nova | AURA' : `${pageConfig[currentPage].title} | AURA`;
  }, [currentPage]);

  const pageConfig: Record<NavigationPage, { title: string; subtitle?: string }> = {
    overview: {
      title: 'System Overview',
      subtitle: 'Real-time telemetry, session metrics, and voice assistant health',
    },
    assistant: {
      title: 'Nova',
      subtitle: 'Interactive real-time spoken conversation powered by ElevenLabs',
    },
    history: {
      title: 'Conversation History',
      subtitle: 'Searchable dialog archives, speech turns, and session records',
    },
    analytics: {
      title: 'Performance & Analytics',
      subtitle: 'Aggregate dialog statistics, engine usage, and turn distributions',
    },
    settings: {
      title: 'Assistant Settings',
      subtitle: 'Configure voice models, language, engine modes, and UI accessibility',
    },
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onNavigate={setCurrentPage} />;
      case 'assistant':
        return <VoiceAssistantPage />;
      case 'history':
        return <HistoryPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <VoiceAssistantPage />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      title={pageConfig[currentPage].title}
      subtitle={pageConfig[currentPage].subtitle}
    >
      {renderActivePage()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AssistantProvider>
      <AppContent />
    </AssistantProvider>
  );
};

export default App;
