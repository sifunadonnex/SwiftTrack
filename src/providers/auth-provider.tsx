"use client";
// This file is kept for semantic separation if needed,
// but for now, it just re-exports the AuthProvider from use-auth-client.
// This simplifies imports in `layout.tsx`.

export { ClientAuthProvider as AuthProvider } from '@/hooks/use-auth-client';
