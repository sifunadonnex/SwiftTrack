
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import AppLayout from '@/components/layout/app-layout';
import { useAuthClient } from '@/hooks/use-auth-client';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/user.actions';
import { auth } from '@/config/firebase';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { Loader2, UserCircle } from 'lucide-react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuthClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.reset({ displayName: user.displayName });
    }
  }, [user, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (values.displayName === user.displayName) {
      toast({ title: "No Changes", description: "The display name is the same.", variant: "default" });
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Update Firestore via server action
      const firestoreResult = await updateUserProfile(user.uid, values.displayName);
      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error || "Failed to update profile in database.");
      }

      // Step 2: Update Firebase Auth profile on the client
      if (auth.currentUser) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: values.displayName });
      } else {
        // This case should ideally not happen if user is populated from useAuthClient
        console.warn("auth.currentUser is null, cannot update Firebase Auth profile directly on client.");
      }
      
      toast({ title: "Profile Updated", description: "Your display name has been successfully updated." });
      // The useAuthClient hook should pick up the change from onAuthStateChanged
      // or by manually refreshing the user data if necessary.
      // Forcing a re-fetch or update of user in AuthContext might be needed if not immediate.

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    // This should be handled by ProtectedRoute in AppLayout, but as a fallback:
    return (
      <AppLayout>
        <div className="text-center">
          <p>Please log in to view your profile.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredRole={['employee', 'manager']}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 mb-8">
          <UserCircle className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">View and update your account details.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Manage your display name and view your email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" value={user.email || ""} readOnly disabled className="bg-muted/50" />
                  </FormControl>
                  <FormDescription>Your email address cannot be changed.</FormDescription>
                </FormItem>

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
