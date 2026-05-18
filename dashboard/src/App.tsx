import React from 'react';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { LeadsPage } from './pages/LeadsPage';
import { PipelinePage } from './pages/PipelinePage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { SequencesPage } from './pages/SequencesPage';
import { SequenceDetailsPage } from './pages/SequenceDetailsPage';
import { CreateSequencePage } from './pages/CreateSequencePage';
import { TemplatesPage } from './pages/TemplatesPage';
import { LeadDrawer } from './features/leads/LeadDrawer';
import { AppProvider } from './lib/context';
import { Routes, Route, Navigate } from './lib/router';

function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/leads" />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/sequences" element={<SequencesPage />} />
          <Route path="/sequences/create" element={<CreateSequencePage />} />
          <Route path="/sequences/:id" element={<SequenceDetailsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
        </Routes>
      </Layout>
      <LeadDrawer />
    </AppProvider>
  );
}

export default App;
