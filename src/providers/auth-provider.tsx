"use client";
// This file is kept for semantic separation if needed,
// but for now, it just re-exports the AuthProvider from use-auth-client.
// This simplifies imports in `layout.tsx`.

// Import the original AuthProvider
import { AuthProvider as HookAuthProvider } from '@/hooks/use-auth-client';

// Re-export it as AuthProvider for layout.tsx
export { HookAuthProvider as AuthProvider };
