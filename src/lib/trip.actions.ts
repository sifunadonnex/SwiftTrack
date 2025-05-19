
"use server";

import { db } from '@/config/firebase'; 
import { collection, addDoc, Timestamp, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { TripFormData } from './types';
import { revalidatePath } from 'next/cache';

export async function addTrip(
  userId: string, 
  formData: TripFormData
): Promise<{ success: boolean; tripId?: string; error?: string }> {
  if (!userId) { 
    return { success: false, error: 'User ID not provided.' };
  }

  try {
    const tripData = {
      userId: userId, 
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(new Date(formData.tripDate)),
      fromLocation: formData.fromLocation,
      toLocation: (formData.toLocation && formData.toLocation.trim() !== "") ? formData.toLocation : null,
      startTime: formData.startTime,
      endTime: (formData.endTime && formData.endTime.trim() !== "") ? formData.endTime : null,
      startMileage: parseFloat(formData.startMileage),
      endMileage: (formData.endMileage && formData.endMileage.trim() !== "") ? parseFloat(formData.endMileage) : null,
      tripDetails: formData.tripDetails || "",
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp, 
    };

    const docRef = await addDoc(collection(db, 'trips'), tripData);
    
    revalidatePath('/employee/dashboard');
    revalidatePath('/manager/dashboard'); 

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
    let tripDateValue: Date;
    if (formData.tripDate instanceof Date) {
      tripDateValue = formData.tripDate;
    } else if (typeof formData.tripDate === 'string') {
      tripDateValue = new Date(formData.tripDate);
    } else {
      tripDateValue = new Date(); 
      console.warn("Unexpected tripDate type, defaulting to now:", formData.tripDate);
    }
    
    if (isNaN(tripDateValue.getTime())) {
        return { success: false, error: 'Invalid trip date provided for update.' };
    }

    const tripDataToUpdate = {
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(tripDateValue),
      fromLocation: formData.fromLocation,
      toLocation: (formData.toLocation && formData.toLocation.trim() !== "") ? formData.toLocation : null,
      startTime: formData.startTime,
      endTime: (formData.endTime && formData.endTime.trim() !== "") ? formData.endTime : null,
      startMileage: parseFloat(formData.startMileage),
      endMileage: (formData.endMileage && formData.endMileage.trim() !== "") ? parseFloat(formData.endMileage) : null,
      tripDetails: formData.tripDetails || "",
      updatedAt: serverTimestamp() as Timestamp,
    };

    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, tripDataToUpdate);

    revalidatePath('/manager/dashboard');
    revalidatePath('/employee/dashboard');

    return { success: true };
  } catch (error: any) {
    console.error("Error updating trip in Firestore:", error);
    return { success: false, error: error.message || 'Failed to update trip.' };
  }
}
