import { Profile, MedicalRecord, Reminder, ChatMessage, ChatThread } from "../types";

const KEYS = {
  PROFILES: "tedimed_profiles",
  RECORDS: "tedimed_records",
  REMINDERS: "tedimed_reminders",
  CHATS: "tedimed_chats",
  CHAT_THREADS: "medimait_chat_threads",
  ACTIVE_CHAT_THREAD: "medimait_active_chat_thread",
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

  getChatThreads(): ChatThread[] {
    const data = localStorage.getItem(KEYS.CHAT_THREADS);
    if (data) return JSON.parse(data);

    const legacyChats = this.getChats();
    if (legacyChats.length === 0) return [];

    const thread: ChatThread = {
      id: `thread_${Date.now()}`,
      title: "Health chat",
      messages: legacyChats,
      createdAt: legacyChats[0]?.timestamp || new Date().toISOString(),
      updatedAt: legacyChats[legacyChats.length - 1]?.timestamp || new Date().toISOString(),
    };
    return [thread];
  },

  saveChatThreads(threads: ChatThread[]): void {
    localStorage.setItem(KEYS.CHAT_THREADS, JSON.stringify(threads.slice(0, 3)));
  },

  getActiveChatThreadId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_CHAT_THREAD);
  },

  saveActiveChatThreadId(id: string): void {
    localStorage.setItem(KEYS.ACTIVE_CHAT_THREAD, id);
  },

  // Utility to fully clear local memory for debugging/re-testing
  clearAll(): void {
    localStorage.removeItem(KEYS.PROFILES);
    localStorage.removeItem(KEYS.RECORDS);
    localStorage.removeItem(KEYS.REMINDERS);
    localStorage.removeItem(KEYS.CHATS);
    localStorage.removeItem(KEYS.CHAT_THREADS);
    localStorage.removeItem(KEYS.ACTIVE_CHAT_THREAD);
  },
};
