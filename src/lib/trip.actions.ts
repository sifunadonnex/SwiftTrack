
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
    // Ensure tripDate is a Date object
    let tripDateValue: Date;
    if (formData.tripDate instanceof Date) {
        tripDateValue = formData.tripDate;
    } else if (typeof formData.tripDate === 'string') {
        tripDateValue = new Date(formData.tripDate);
    } else {
        // Fallback or error if type is unexpected
        return { success: false, error: 'Invalid trip date format.' };
    }
    if (isNaN(tripDateValue.getTime())) {
        return { success: false, error: 'Invalid trip date provided.' };
    }
    
    let returnDateValue: Date | null = null;
    if (formData.returnDate) {
        if (formData.returnDate instanceof Date) {
            returnDateValue = formData.returnDate;
        } else if (typeof formData.returnDate === 'string') {
            returnDateValue = new Date(formData.returnDate);
        } else {
            return { success: false, error: 'Invalid return date format.' };
        }
        if (isNaN(returnDateValue.getTime())) {
             return { success: false, error: 'Invalid return date provided.' };
        }
    }


    const tripData = {
      userId: userId,
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(tripDateValue),
      returnDate: returnDateValue ? Timestamp.fromDate(returnDateValue) : Timestamp.fromDate(tripDateValue), // Default to tripDate if not provided
      fromLocation: formData.fromLocation,
      toLocation: (formData.toLocation && formData.toLocation.trim() !== "") ? formData.toLocation : null,
      startTime: formData.startTime,
      endTime: (formData.endTime && formData.endTime.trim() !== "") ? formData.endTime : null,
      startMileage: parseFloat(formData.startMileage),
      endMileage: (formData.endMileage && formData.endMileage.trim() !== "") ? parseFloat(formData.endMileage) : null,
      tripDetails: formData.tripDetails, // Now required
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
      return { success: false, error: 'Invalid trip date format for update.' };
    }
    if (isNaN(tripDateValue.getTime())) {
        return { success: false, error: 'Invalid trip date provided for update.' };
    }

    let returnDateValue: Date | null = null;
    if (formData.returnDate) {
        if (formData.returnDate instanceof Date) {
            returnDateValue = formData.returnDate;
        } else if (typeof formData.returnDate === 'string') {
            returnDateValue = new Date(formData.returnDate);
        } else {
             return { success: false, error: 'Invalid return date format for update.' };
        }
         if (isNaN(returnDateValue.getTime())) {
             return { success: false, error: 'Invalid return date provided for update.' };
        }
    }


    const tripDataToUpdate = {
      driverName: formData.driverName,
      tripDate: Timestamp.fromDate(tripDateValue),
      returnDate: returnDateValue ? Timestamp.fromDate(returnDateValue) : Timestamp.fromDate(tripDateValue), // Default to tripDate
      fromLocation: formData.fromLocation,
      toLocation: (formData.toLocation && formData.toLocation.trim() !== "") ? formData.toLocation : null,
      startTime: formData.startTime,
      endTime: (formData.endTime && formData.endTime.trim() !== "") ? formData.endTime : null,
      startMileage: parseFloat(formData.startMileage),
      endMileage: (formData.endMileage && formData.endMileage.trim() !== "") ? parseFloat(formData.endMileage) : null,
      tripDetails: formData.tripDetails, // Now required
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

