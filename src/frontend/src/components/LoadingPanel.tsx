import { Loader2 } from 'lucide-react';

interface LoadingPanelProps {
  message?: string;
}

export default function LoadingPanel({ message = 'Loading...' }: LoadingPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  );
}
