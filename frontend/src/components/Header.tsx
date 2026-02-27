import React from 'react';
import { Sun, Moon, Factory } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  activeTab: 'data-entry' | 'admin';
  onTabChange: (tab: 'data-entry' | 'admin') => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-primary shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Factory className="h-6 w-6 text-primary-foreground" />
          <span className="font-bold text-lg text-primary-foreground hidden sm:block">ProdManager</span>
        </div>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('data-entry')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'data-entry'
                ? 'bg-primary-foreground text-primary shadow'
                : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
            }`}
          >
            Data Entry
          </button>
          <button
            onClick={() => onTabChange('admin')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-primary-foreground text-primary shadow'
                : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
            }`}
          >
            Admin
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}
