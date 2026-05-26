import { Profile, MedicalRecord, Reminder, ChatMessage } from "../types";

const KEYS = {
  PROFILES: "tedimed_profiles",
  RECORDS: "tedimed_records",
  REMINDERS: "tedimed_reminders",
  CHATS: "tedimed_chats",
};

export const storageService = {
  // Profiles
  getProfiles(): Profile[] {
    const data = localStorage.getItem(KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  },

  saveProfiles(profiles: Profile[]): void {
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
  },

  // Records
  getRecords(): MedicalRecord[] {
    const data = localStorage.getItem(KEYS.RECORDS);
    return data ? JSON.parse(data) : [];
  },

  saveRecords(records: MedicalRecord[]): void {
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  },

  // Reminders
  getReminders(): Reminder[] {
    const data = localStorage.getItem(KEYS.REMINDERS);
    return data ? JSON.parse(data) : [];
  },

  saveReminders(reminders: Reminder[]): void {
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
  },

  // Chats
  getChats(): ChatMessage[] {
    const data = localStorage.getItem(KEYS.CHATS);
    return data ? JSON.parse(data) : [];
  },

  saveChats(chats: ChatMessage[]): void {
    localStorage.setItem(KEYS.CHATS, JSON.stringify(chats));
  },

  // Utility to fully clear local memory for debugging/re-testing
  clearAll(): void {
    localStorage.removeItem(KEYS.PROFILES);
    localStorage.removeItem(KEYS.RECORDS);
    localStorage.removeItem(KEYS.REMINDERS);
    localStorage.removeItem(KEYS.CHATS);
  },
};
