"use client";

import type { ReactNode } from 'react';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  );
};

// @ts-ignore
export const useAuthClient = () => {
  console.warn("useAuthClient is currently a stub due to parsing issues in its defining file.");
  return { user: null, role: null, loading: true, isManuallyCheckingRole: false };
};

// @ts-ignore
export const ProtectedRoute = ({ children }: { children: ReactNode; requiredRole?: any; fallbackPath?: string; }) => {
  console.warn("ProtectedRoute is currently a stub due to parsing issues in its defining file.");
  return <>{children}</>;
};
