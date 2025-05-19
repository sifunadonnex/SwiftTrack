
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'employee' | 'manager' | null;

export interface AppUser extends FirebaseUser {
  role?: UserRole;
  // idTokenResult is not directly available on FirebaseUser, custom claims are usually on idToken
}

export interface Trip {
  id?: string;
  userId: string;
  driverName: string;
  tripDate: Date | Timestamp; // Store as Date, convert to/from Timestamp for Firestore
  startTime: string; // e.g., "09:00"
  endTime?: string | null; // e.g., "17:00", now optional
  startMileage: number;
  endMileage?: number | null; // now optional
  tripDetails?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface TripFormData {
  tripDate: Date;
  driverName: string;
  startTime: string;
  endTime?: string | null; // Initially string from form, now optional
  startMileage: string; // Initially string from form
  endMileage?: string | null; // Initially string from form, now optional
  tripDetails?: string;
}

