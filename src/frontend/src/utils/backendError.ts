export function normalizeBackendError(error: unknown): string {
  if (!error) return "An unknown error occurred";

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Unauthorized") || message.includes("unauthorized")) {
    return "You are not authorized to perform this action.";
  }
  if (message.includes("not found") || message.includes("Not found")) {
    return "The requested item was not found.";
  }
  if (
    message.includes("must be unique") ||
    message.includes("already exists")
  ) {
    return "This name is already in use. Please choose a different name.";
  }
  if (message.includes("Actor not available")) {
    return "Connection to backend is not ready. Please try again.";
  }

  // Strip Motoko trap prefix if present
  const trapMatch = message.match(/Canister.*?trapped.*?:\s*(.*)/i);
  if (trapMatch) return trapMatch[1];

  return message;
}
