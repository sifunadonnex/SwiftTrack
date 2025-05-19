
"use server";

import { db } from '@/config/firebase'; // Removed auth import as auth.currentUser won't work here
import { collection, addDoc, Timestamp, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
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
      updatedAt: serverTimestamp() as Timestamp, // Set updatedAt on creation as well
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

export async function updateTrip(
  tripId: string,
  formData: TripFormData
): Promise<{ success: boolean; error?: string }> {
  if (!tripId) {
    return { success: false, error: 'Trip ID not provided.' };
  }

  try {
    // Ensure tripDate is a Date object before converting to Timestamp
    let tripDateValue: Date;
    if (formData.tripDate instanceof Date) {
      tripDateValue = formData.tripDate;
    } else if (typeof formData.tripDate === 'string') {
      tripDateValue = new Date(formData.tripDate);
    } else {
      // Fallback or error if type is unexpected, though Zod schema should catch this
      tripDateValue = new Date(); 
      console.warn("Unexpected tripDate type, defaulting to now:", formData.tripDate);
    }
    
    if (isNaN(tripDateValue.getTime())) {
        return { success: false, error: 'Invalid trip date provided for update.' };
    }

    const tripDataToUpdate = {
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(tripDateValue),
      startTime: formData.startTime,
      endTime: formData.endTime,
      startMileage: parseFloat(formData.startMileage),
      endMileage: parseFloat(formData.endMileage),
      tripDetails: formData.tripDetails || "",
      updatedAt: serverTimestamp() as Timestamp,
    };

    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, tripDataToUpdate);

    revalidatePath('/manager/dashboard');
    revalidatePath('/employee/dashboard'); // Revalidate employee dashboard too

    return { success: true };
  } catch (error: any) {
    console.error("Error updating trip in Firestore:", error);
    return { success: false, error: error.message || 'Failed to update trip.' };
  }
}
