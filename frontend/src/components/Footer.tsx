import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  const appId = encodeURIComponent(window.location.hostname || 'production-management-app');

  return (
    <footer className="border-t border-border bg-background py-4 mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>© {year} ProdManager. All rights reserved.</span>
        <span className="flex items-center gap-1">
          Built with <Heart className="h-3 w-3 fill-primary text-primary mx-0.5" /> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </span>
      </div>
    </footer>
  );
}
