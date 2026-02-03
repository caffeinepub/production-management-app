/**
 * Normalizes backend errors into user-friendly English messages
 */
export function normalizeBackendError(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for common backend trap messages
  if (errorMessage.includes('Unauthorized')) {
    if (errorMessage.includes('Only admins')) {
      return 'Admin access required. Please sign in with an admin account.';
    }
    if (errorMessage.includes('Only authenticated users')) {
      return 'Please sign in to perform this action';
    }
    if (errorMessage.includes('Only users can')) {
      return 'Please sign in to perform this action';
    }
    return 'You do not have permission to perform this action. Please sign in.';
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
    return 'Please wait for the system to initialize';
  }

  if (errorMessage.includes('Quantity produced must be at least 1')) {
    return 'Quantity produced must be at least 1';
  }

  // Return the original message if no specific pattern matches
  return errorMessage;
}
