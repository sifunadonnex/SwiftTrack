
'use server';

import { db } from '@/config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function updateUserProfile(
  userId: string,
  newDisplayName: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID not provided.' };
  }
  if (!newDisplayName || newDisplayName.trim().length < 2) {
    return { success: false, error: 'Display name must be at least 2 characters.' };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      displayName: newDisplayName.trim(),
      updatedAt: serverTimestamp(),
    });

    // Revalidate paths where the display name might be shown.
    // This ensures that if the user navigates away and back, or if other
    // components show the display name, they get the fresh data.
    revalidatePath('/profile');
    revalidatePath('/', 'layout'); // Revalidate the whole layout if display name is in header/sidebar

    return { success: true };
  } catch (error: any) { // Added opening curly brace here
    console.error('Error updating user profile in Firestore:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}

