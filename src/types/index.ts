export interface Profile {
  id: string;
  name: string;
  type: 'Myself' | 'Father' | 'Mother' | 'Other';
  age?: string;
  gender?: string;
  allergies?: string;
  medicalConditions?: string;
}

export interface Medicine {
  id: string;
  name: string;
  salt?: string;
  dosage: string;
  timing: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  duration: string;
  instructions: string;
  purpose: string;
  sideEffects?: string;
  precautions?: string;
}

export interface PrescriptionScanResult {
  id: string;
  date: string;
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  medicines: Medicine[];
  condition?: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  doctorName: string;
  clinicHospital: string;
  date: string;
  patientProfileId: string; // References Profile
  prescriptionImage?: string; // base64
  medicines: Medicine[];
  notes?: string;
}

export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Sunday, 7 = Saturday

export interface Reminder {
  id: string;
  medicineName: string;
  dose: string;
  time: string; // e.g. "08:00"
  timingGroup: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  frequency: string; // e.g. "Daily"
  daysOfWeek?: WeekdayNumber[];
  startDate: string;
  endDate?: string;
  notes?: string;
  patientProfileId: string;
  history?: { [dateStr: string]: boolean }; // YYYY-MM-DD -> whether taken on that day
  notificationIds?: number[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ScanDraft {
  image: string | null;
  pendingCameraImage: string | null;
  scanResult: PrescriptionScanResult | null;
  selectedProfileId: string;
  recordNotes: string;
  remindersSaved: boolean;
  recordSaved: boolean;
}

export type AppLanguage = "en" | "ur";

export interface AppSettings {
  language: AppLanguage;
  largeText: boolean;
  compactMedicineCards: boolean;
  quietSafetyCopy: boolean;
}
