
# SwiftTrack - Mileage & Trip Logging

SwiftTrack is a modern web application designed for efficient mileage and trip logging. It provides role-based access for employees and transport managers, enabling seamless trip submission, tracking, and reporting, enhanced with AI-powered insights.

## Core Features

*   **Role-Based Access Control**:
    *   **Employee Role**: Submit new trips, view personal trip history, complete details for pending trips (end time, end mileage).
    *   **Manager Role**: View all trips, search/filter logs by driver or date range, view aggregate summaries, edit any trip, print reports, export trip data to CSV.
*   **Trip Submission & Management**:
    *   Simple form for employees (and managers on behalf of employees) to submit trip details including start/end dates, driver, start/end times, start/end mileage, from/to locations, and descriptive details.
    *   Option to submit initial trip details and complete end time/mileage later.
*   **Dashboard & Reporting**:
    *   **Employee Dashboard**: Personal trip log with status indicators (Completed/Pending Completion), ability to complete pending trips.
    *   **Manager Dashboard**: Comprehensive overview of all trips, advanced filtering, aggregate summaries (total trips, total distance, average distance). Print-friendly report generation and CSV export.
*   **AI-Powered Insights (for Managers)**:
    *   **Trip Detail Summarization**: AI-generated summaries of lengthy trip details.
    *   **Maintenance Suggestions**: AI analysis of recent trip details to provide suggestions regarding vehicle cleaning or fuel needs.
*   **User Profile Management**: Users can view their email and update their display name.
*   **Responsive Design**: UI optimized for various devices (desktop, tablet, mobile).

## Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **State Management**: React Context API, `useState`, `useEffect`
*   **Forms**: React Hook Form with Zod for validation
*   **Backend & Database**: Firebase (Authentication, Firestore)
*   **AI Integration**: Genkit (with Google AI models)
*   **Deployment**: (Assumed Vercel or similar Next.js hosting)

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended, e.g., v18 or v20)
*   npm, yarn, or pnpm
*   A Firebase project
*   A Google Cloud project with the Generative Language API enabled (for Genkit AI features)

### 1. Firebase Project Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2.  **Authentication**:
    *   In your Firebase project, go to **Authentication** > **Sign-in method**.
    *   Enable the **Email/Password** provider.
3.  **Firestore Database**:
    *   Go to **Firestore Database** and create a database. Start in **test mode** for easier local development (remember to secure it with proper rules before production).
    *   **Required Collections**:
        *   `users`: This collection stores user-specific information. Each document ID should be the user's Firebase Auth UID.
            *   Fields: `uid` (string), `email` (string), `displayName` (string), `role` (string: 'employee' or 'manager'), `createdAt` (timestamp).
        *   `trips`: This collection stores all trip log data.
            *   Fields: `userId` (string - UID of the user who submitted/owns the trip), `driverName` (string), `tripDate` (timestamp), `returnDate` (timestamp - defaults to `tripDate` if not multi-day), `fromLocation` (string), `toLocation` (string, optional), `startTime` (string HH:MM), `endTime` (string HH:MM, optional), `startMileage` (number), `endMileage` (number, optional), `tripDetails` (string), `createdAt` (timestamp), `updatedAt` (timestamp).

### 2. Environment Variables

Create a `.env` file in the root of the project and add your Firebase project configuration keys and Google API key. You can find your Firebase config in your Firebase project settings.

```env
# Firebase Configuration (from your Firebase project settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase Emulators (optional, for local development)
# Set to "true" to use emulators, "false" or leave unset for production Firebase
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Google AI API Key (for Genkit features)
# Obtain this from Google Cloud Console (Generative Language API)
GOOGLE_API_KEY=your_google_ai_api_key
```

**Note on `GOOGLE_API_KEY`**: If you are using Application Default Credentials (ADC) in a secure environment (like Google Cloud Run/Functions), you might not need to set `GOOGLE_API_KEY` explicitly in `.env`. However, for local development, it's often the easiest way.

### 3. Install Dependencies

Navigate to the project directory in your terminal and run:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 4. Running the Application Locally

You'll typically need two terminal windows: one for the Next.js app and one for Genkit.

**Terminal 1: Run the Next.js Development Server**

```bash
npm run dev
```
This will usually start the app on `http://localhost:9002` (as per `package.json`).

**Terminal 2: Run the Genkit Development Server**
(Required for AI features like trip summarization and maintenance suggestions)

```bash
npm run genkit:dev
```
This starts the Genkit development server, typically on `http://localhost:3400`. It allows your Next.js app to call the AI flows.

### 5. Using Firebase Emulators (Optional but Recommended for Local Dev)

If you set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` in your `.env` file:
1.  Make sure you have the Firebase CLI installed and configured.
2.  Start the Firebase Emulators in a separate terminal:
    ```bash
    firebase emulators:start --only auth,firestore,functions
    ```
    (The app uses `auth`, `firestore`. `functions` is included in case you add Firebase Functions later, Genkit might also interact with it for deployment in some scenarios but not strictly for current local dev flows).
3.  The application will automatically connect to the emulators based on the `src/config/firebase.ts` setup.

## Application Structure

A brief overview of the main directories:

*   `src/app/`: Contains the Next.js App Router pages and layouts.
    *   `src/app/(auth)/`: Routes for login, signup.
    *   `src/app/employee/`: Routes specific to employees.
    *   `src/app/manager/`: Routes specific to managers.
    *   `src/app/profile/`: User profile page.
*   `src/components/`: Reusable UI components.
    *   `src/components/auth/`: Authentication-related layout components.
    *   `src/components/layout/`: Main application layout (sidebar, header).
    *   `src/components/trips/`: Trip form and edit trip form.
    *   `src/components/ui/`: ShadCN UI components.
*   `src/lib/`: Core logic, type definitions, and server actions.
    *   `src/lib/types.ts`: TypeScript type definitions.
    *   `src/lib/trip.actions.ts`: Server actions for trip management.
    *   `src/lib/user.actions.ts`: Server actions for user profile management.
*   `src/ai/`: Genkit related files.
    *   `src/ai/flows/`: Genkit AI flows (e.g., trip summarization, maintenance reminders).
    *   `src/ai/genkit.ts`: Genkit global instance configuration.
    *   `src/ai/dev.ts`: Genkit development server entry point.
*   `src/hooks/`: Custom React hooks (e.g., `useAuthClient`, `useToast`).
*   `src/config/`: Firebase initialization and configuration.
*   `src/providers/`: React context providers (e.g., `AuthProvider`).

## Key Functionalities Guide

### User Registration and Login
*   New users can sign up with their full name, email, and password. Upon registration, they are assigned the 'employee' role by default and a corresponding document is created in the `users` Firestore collection.
*   Existing users can log in using their email and password.

### Employee Role
*   **Dashboard (`/employee/dashboard`)**:
    *   View a list of all trips they have submitted, displayed as cards.
    *   Each card shows trip status (Completed/Pending Completion).
    *   Can complete pending trips by filling in end time and end mileage.
    *   Alerts for pending trips.
*   **Submit Trip (`/employee/submit-trip`)**:
    *   Form to submit new trip details. Driver name defaults to the logged-in employee.

### Manager Role
*   **Dashboard (`/manager/dashboard`)**:
    *   View all trips submitted across the organization, displayed as responsive cards.
    *   Filter trips by driver name and/or date range.
    *   View aggregate summaries (total trips, total distance, average distance) based on current filters.
    *   AI-powered "Smart Suggestions" card for maintenance reminders based on recent trip details.
    *   Alerts for pending trips within the current view.
    *   Ability to "Summarize" trip details using AI.
    *   Ability to "Edit" any trip's details, including completing pending trips.
    *   "Print Report" button: Generates a print-friendly tabular view of the filtered trips.
    *   "Export CSV" button: Downloads the filtered trip data as a CSV file.
*   **Submit Trip (`/employee/submit-trip`)**:
    *   Can submit trips. An informational message reminds them they can change the "Driver Name" field to submit a trip on behalf of another employee.

### Common
*   **Profile Page (`/profile`)**:
    *   View their registered email address.
    *   Update their display name.

---

This README should provide a good starting point for anyone looking to understand or work on the SwiftTrack project.
