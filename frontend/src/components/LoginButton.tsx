import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Loader2 } from 'lucide-react';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        if (error?.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <button
      onClick={handleAuth}
      disabled={isLoggingIn}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
        isAuthenticated
          ? 'bg-white/15 text-primary-foreground hover:bg-white/25 border border-white/30'
          : 'bg-primary-foreground text-primary hover:bg-white/90 shadow'
      }`}
    >
      {isLoggingIn ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAuthenticated ? (
        <LogOut className="h-4 w-4" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {isLoggingIn ? 'Signing in...' : isAuthenticated ? 'Logout' : 'Login'}
    </button>
  );
}
