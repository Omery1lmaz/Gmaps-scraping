import React from 'react';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { LeadsPage } from './pages/LeadsPage';
import { PipelinePage } from './pages/PipelinePage';
import { ChatListPage } from './pages/whatsapp/ChatListPage';
import { ChatViewPage } from './pages/whatsapp/ChatViewPage';
import { WhatsAppAccountsPage } from './pages/whatsapp/WhatsAppAccountsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { SequencesPage } from './pages/SequencesPage';
import { SequenceDetailsPage } from './pages/SequenceDetailsPage';
import { CreateSequencePage } from './pages/CreateSequencePage';
import { VisualSequenceBuilder } from './pages/VisualSequenceBuilder';
import { TemplatesPage } from './pages/TemplatesPage';
import { CreateTemplatePage } from './pages/CreateTemplatePage';
import { BillingPage } from './pages/BillingPage'; 
import { LeadDrawer } from './features/leads/LeadDrawer';
import { AppProvider } from './lib/context';
import { LanguageProvider } from './lib/language';
import { AuthProvider, useAuth } from './lib/auth';
import { Routes, Route, Navigate } from './lib/router';
import { AuthPage } from './pages/AuthPage';

function ProtectedApp() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm font-black text-slate-500">Yükleniyor...</div>;
  }

  if (!user) return <AuthPage />;

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/leads" />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/create" element={<CreateTemplatePage />} />
          <Route path="/sequences" element={<SequencesPage />} />
          <Route path="/sequences/create" element={<VisualSequenceBuilder />} />
          <Route path="/sequences/:id/edit" element={<VisualSequenceBuilder />} />
          <Route path="/sequences/:id" element={<SequenceDetailsPage />} />
          <Route path="/whatsapp" element={<ChatViewPage />} />
          <Route path="/whatsapp/chats" element={<ChatListPage />} />
          <Route path="/whatsapp/accounts" element={<WhatsAppAccountsPage />} />
          <Route path="/whatsapp/:chatId" element={<ChatViewPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Routes>
      </Layout>
      <LeadDrawer />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </LanguageProvider>
    </AppProvider>
  );
}

export default App;
