import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import DataEntryPage from './pages/DataEntryPage';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      gcTime: Infinity,
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState<'data-entry' | 'admin'>('data-entry');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        <div style={{ display: activeTab === 'data-entry' ? 'block' : 'none' }}>
          <DataEntryPage />
        </div>
        <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
          <AdminDashboard />
        </div>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
