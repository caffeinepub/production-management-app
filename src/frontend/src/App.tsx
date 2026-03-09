import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import React, { useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import AdminDashboard from "./pages/AdminDashboard";
import DataEntryPage from "./pages/DataEntryPage";

function AppContent() {
  const [activeTab, setActiveTab] = useState<"data-entry" | "admin">(
    "data-entry",
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        <div style={{ display: activeTab === "data-entry" ? "block" : "none" }}>
          <DataEntryPage />
        </div>
        <div style={{ display: activeTab === "admin" ? "block" : "none" }}>
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
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AppContent />
    </ThemeProvider>
  );
}
