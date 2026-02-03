/**
 * Normalizes backend errors into user-friendly English messages
 */
export function normalizeBackendError(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for common backend trap messages
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('Only admin')) {
    // Generic unauthorized message without sign-in prompt
    return 'This action requires elevated permissions';
  }

  if (errorMessage.includes('name must be unique')) {
    if (errorMessage.includes('Product')) {
      return 'A product with this name already exists';
    }
    if (errorMessage.includes('Machine')) {
      return 'A machine with this name already exists';
    }
    if (errorMessage.includes('Operator')) {
      return 'An operator with this name already exists';
    }
    return 'A record with this name already exists';
  }

  if (errorMessage.includes('not found')) {
    return 'The requested record was not found';
  }

  if (errorMessage.includes('Actor not available')) {
    return 'System is still initializing. Please wait a moment and try again.';
  }

  if (errorMessage.includes('Quantity produced must be at least 1')) {
    return 'Quantity produced must be at least 1';
  }

  if (errorMessage.includes('Invalid ID') || errorMessage.includes('invalid')) {
    return 'Invalid data provided. Please check your inputs and try again.';
  }

  // Return the original message if no specific pattern matches
  return errorMessage;
}
