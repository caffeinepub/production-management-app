import { Suspense, lazy, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Settings } from 'lucide-react';
import LoadingPanel from './components/LoadingPanel';

// Lazy load the main panels to reduce initial bundle size
const DataEntryPage = lazy(() => import('./pages/DataEntryPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  const [activeTab, setActiveTab] = useState<'entry' | 'admin'>('entry');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'entry' | 'admin')} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="entry" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Data Entry
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>
            
            {/* Keep both panels mounted to avoid remount-triggered refetches */}
            <div style={{ display: activeTab === 'entry' ? 'block' : 'none' }}>
              <Suspense fallback={<LoadingPanel message="Loading data entry..." />}>
                <DataEntryPage />
              </Suspense>
            </div>
            
            <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
              <Suspense fallback={<LoadingPanel message="Loading admin dashboard..." />}>
                <AdminDashboard />
              </Suspense>
            </div>
          </Tabs>
        </main>

        <Footer />
        
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
