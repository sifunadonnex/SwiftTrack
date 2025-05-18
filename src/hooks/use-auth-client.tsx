"use client";

import type { ReactNode } from 'react';

// Minimal AuthProvider for parsing diagnostics
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {children}
    </>
  );
};

// Stub for useAuthClient
export const useAuthClient = () => {
  return { user: null, role: null, loading: false, isManuallyCheckingRole: false };
};

// Stub for ProtectedRoute
export const ProtectedRoute = ({
  children,
  requiredRole, // Keep param to avoid breaking its usage, even if not used here
}: {
  children: ReactNode;
  requiredRole?: string | string[];
}) => {
  return <>{children}</>;
};
