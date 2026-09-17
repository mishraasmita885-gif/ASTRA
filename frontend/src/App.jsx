import React from 'react';
import { MissionProvider, useMission } from './context/MissionContext';
import { Layout } from './components/Layout';
import { WelcomePage } from './pages/WelcomePage';
import { MissionOverviewPage } from './pages/MissionOverviewPage';
import { LiveTelemetryPage } from './pages/LiveTelemetryPage';
import { SubsystemsPage } from './pages/SubsystemsPage';
import { AnomalyCenterPage } from './pages/AnomalyCenterPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { EventLogPage } from './pages/EventLogPage';
import { SimulationPage } from './pages/SimulationPage';

const AppContent = () => {
  const { activeTab } = useMission();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'welcome':
        return <WelcomePage />;
      case 'overview':
        return <MissionOverviewPage />;
      case 'telemetry':
        return <LiveTelemetryPage />;
      case 'subsystems':
        return <SubsystemsPage />;
      case 'anomalies':
        return <AnomalyCenterPage />;
      case 'ai_assistant':
        return <AIAssistantPage />;
      case 'events':
        return <EventLogPage />;
      case 'simulation':
        return <SimulationPage />;
      default:
        return <MissionOverviewPage />;
    }
  };

  return (
    <Layout>
      {renderActivePage()}
    </Layout>
  );
};

export default function App() {
  return (
    <MissionProvider>
      <AppContent />
    </MissionProvider>
  );
}
