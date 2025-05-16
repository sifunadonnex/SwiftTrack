"use server";

import { auth, db } from '@/config/firebase';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { TripFormData } from './types';
import { revalidatePath } from 'next/cache';

export async function addTrip(formData: TripFormData): Promise<{ success: boolean; tripId?: string; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const tripData = {
      userId: user.uid,
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
    if (user.photoURL === 'manager') { // Assuming role is stored in photoURL or use custom claims to check
         revalidatePath('/manager/dashboard');
    }


    return { success: true, tripId: docRef.id };
  } catch (error: any) {
    console.error("Error adding trip to Firestore:", error);
    return { success: false, error: error.message || 'Failed to add trip.' };
  }
}
