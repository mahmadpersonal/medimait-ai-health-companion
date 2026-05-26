import { useState, useEffect } from "react";
import { Reminder, WeekdayNumber } from "../types";
import { storageService } from "../services/storageService";
import { notificationService } from "../services/notificationService";

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const saved = storageService.getReminders().map((reminder) => ({
      ...reminder,
      daysOfWeek: reminder.daysOfWeek?.length ? reminder.daysOfWeek : ([1, 2, 3, 4, 5, 6, 7] as WeekdayNumber[]),
    }));
    setReminders(saved);
  }, []);

  const getTodayStr = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getNotificationIds = (id: string, days: WeekdayNumber[]) => {
    const base = Math.abs(Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0));
    return days.map((day, index) => ((base * 100) + (day * 10) + index) % 2147483647);
  };

  const isReminderDueOn = (reminder: Reminder, date: Date) => {
    const day = date.getDay() === 0 ? 1 : (date.getDay() + 1) as WeekdayNumber;
    return (reminder.daysOfWeek?.length ? reminder.daysOfWeek : ([1, 2, 3, 4, 5, 6, 7] as WeekdayNumber[])).includes(day);
  };

  const addReminder = (reminderData: Omit<Reminder, "id" | "history">) => {
    const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const daysOfWeek = reminderData.daysOfWeek?.length ? reminderData.daysOfWeek : ([1, 2, 3, 4, 5, 6, 7] as WeekdayNumber[]);
    const newReminder: Reminder = {
      ...reminderData,
      id,
      daysOfWeek,
      notificationIds: getNotificationIds(id, daysOfWeek),
      history: {},
    };
    const updated = [...reminders, newReminder];
    setReminders(updated);
    storageService.saveReminders(updated);
    void notificationService.schedulePillReminder(newReminder);
    return newReminder;
  };

  const updateReminder = (id: string, updatedData: Partial<Reminder>) => {
    const updated = reminders.map((r) => (r.id === id ? { ...r, ...updatedData } : r));
    setReminders(updated);
    storageService.saveReminders(updated);
  };

  const deleteReminder = (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    storageService.saveReminders(updated);
    void notificationService.cancelNotifications(reminder?.notificationIds);
  };

  const toggleTakenToday = (id: string) => {
    const todayStr = getTodayStr();
    const updated = reminders.map((r) => {
      if (r.id === id) {
        const history = { ...(r.history || {}) };
        const currentlyTaken = !!history[todayStr];
        history[todayStr] = !currentlyTaken;

        // If newly taken, trigger a cute local success audio feedback or custom state
        if (!currentlyTaken) {
          notificationService.showNotification(
            "💊 Pill Marked as Taken",
            `Good job! You took ${r.medicineName} (${r.dose}) for today.`
          );
        }

        return { ...r, history };
      }
      return r;
    });

    setReminders(updated);
    storageService.saveReminders(updated);
  };

  return {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleTakenToday,
    getTodayStr,
    isReminderDueOn,
  };
}
