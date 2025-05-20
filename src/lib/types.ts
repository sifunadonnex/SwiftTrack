
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

// Ensure UserRole is always defined as 'employee' or 'manager' once determined,
// with loading states handling the period of uncertainty.
export type UserRole = 'employee' | 'manager';

export interface AppUser extends FirebaseUser {
  // role?: UserRole; // Role is now managed separately in AuthContext/useAuthClient
}

export interface Trip {
  id?: string;
  userId: string;
  driverName: string;
  tripDate: Date | Timestamp;
  returnDate?: Date | Timestamp | null; // Added returnDate
  fromLocation: string;
  toLocation?: string | null;
  startTime: string;
  endTime?: string | null;
  startMileage: number;
  endMileage?: number | null;
  tripDetails?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface TripFormData {
  tripDate: Date;
  returnDate?: Date | null; // Added returnDate
  driverName: string;
  fromLocation: string;
  toLocation?: string | null;
  startTime: string;
  endTime?: string | null;
  startMileage: string;
  endMileage?: string | null;
  tripDetails?: string;
}
