
"use server";

import { db } from '@/config/firebase'; // Removed auth import as auth.currentUser won't work here
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { TripFormData } from './types';
import { revalidatePath } from 'next/cache';

export async function addTrip(
  userId: string, // Added userId parameter
  formData: TripFormData
): Promise<{ success: boolean; tripId?: string; error?: string }> {
  if (!userId) { // Check if userId is provided
    return { success: false, error: 'User ID not provided.' };
  }

  try {
    const tripData = {
      userId: userId, // Use the passed userId
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(new Date(formData.tripDate)),
      startTime: formData.startTime,
      endTime: formData.endTime,
      startMileage: parseFloat(formData.startMileage),
      endMileage: parseFloat(formData.endMileage),
      tripDetails: formData.tripDetails || "",
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(collection(db, 'trips'), tripData);
    
    // Revalidate paths to update cached data
    revalidatePath('/employee/dashboard');
    revalidatePath('/manager/dashboard'); // Revalidate manager dashboard as it lists all trips

    return { success: true, tripId: docRef.id };
  } catch (error: any) {
    console.error("Error adding trip to Firestore:", error);
    return { success: false, error: error.message || 'Failed to add trip.' };
  }
}
