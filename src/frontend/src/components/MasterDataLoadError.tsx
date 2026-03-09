import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import React from "react";

interface MasterDataLoadErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function MasterDataLoadError({
  message = "Failed to load data. Please try again.",
  onRetry,
}: MasterDataLoadErrorProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
