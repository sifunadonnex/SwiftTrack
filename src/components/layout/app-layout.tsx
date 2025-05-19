
"use client";

import type React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { User, LogOut, LayoutDashboard, ClipboardPlus, Car, Settings, Search, Users, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { ProtectedRoute, useAuthClient } from '@/hooks/use-auth-client';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[]; // Roles that can see this nav item
}

const navItems: NavItem[] = [
  { href: '/employee/dashboard', label: 'My Trips', icon: LayoutDashboard, roles: ['employee', 'manager'] },
  { href: '/employee/submit-trip', label: 'Submit Trip', icon: ClipboardPlus, roles: ['employee', 'manager'] },
  { href: '/manager/dashboard', label: 'Manager Dashboard', icon: Users, roles: ['manager'] },
];

export default function AppLayout({ children, requiredRole }: AppLayoutProps) {
  const { user, role, loading } = useAuthClient();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged out successfully.' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout failed.', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const filteredNavItems = navItems.filter(item => role && item.roles.includes(role));

  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar" side="left" className="no-print">
          <SidebarHeader className="p-4 justify-center">
             <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <Car className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">SwiftTrack</h1>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      className="w-full data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="print-container">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6 no-print">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="flex-1"> {/* Spacer to push user menu to the right */} </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                       <p className="text-xs leading-none text-muted-foreground capitalize pt-1">Role: {role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
