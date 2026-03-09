import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingPanelProps {
  message?: string;
}

export default function LoadingPanel({
  message = "Loading...",
}: LoadingPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
