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
  endTime: string; // e.g., "17:00"
  startMileage: number;
  endMileage: number;
  tripDetails?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface TripFormData {
  tripDate: Date;
  driverName: string;
  startTime: string;
  endTime: string;
  startMileage: string; // Initially string from form
  endMileage: string; // Initially string from form
  tripDetails?: string;
}
