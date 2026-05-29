import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday } from "@capacitor/local-notifications";
import { Reminder, WeekdayNumber } from "../types";

function parseTime(time: string) {
  const [hour, minute] = time.split(":").map((part) => Number(part));
  return {
    hour: Number.isFinite(hour) ? hour : 8,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function nextDateForWeekday(weekday: WeekdayNumber, time: string) {
  const { hour, minute } = parseTime(time);
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  const jsTargetDay = weekday === 1 ? 0 : weekday - 1;
  const dayDelta = (jsTargetDay - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + dayDelta);

  if (target <= now) {
    target.setDate(target.getDate() + 7);
  }

  return target;
}

async function ensurePillChannel() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id: "pill-reminders",
      name: "Pill reminders",
      description: "Medicine timing reminders",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  } catch (e) {
    console.warn("Pill reminder notification channel could not be created:", e);
  }
}

export const notificationService = {
  isSupported(): boolean {
    return Capacitor.isNativePlatform() ||
      (typeof window !== "undefined" && "Notification" in window);
  },

  async hasPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === "granted";
    }
    return Notification.permission === "granted";
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === "granted";
    }
    if (Notification.permission === "granted") return true;

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (e) {
      return false;
    }
  },

  async showNotification(title: string, body: string): Promise<boolean> {
    if (!this.isSupported() || !(await this.hasPermission())) {
      console.log(`[Local Notification Fallback] ${title}: ${body}`);
      return false;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await ensurePillChannel();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2147483647,
              title,
              body,
              channelId: "pill-reminders",
              schedule: { at: new Date(Date.now() + 250) },
            },
          ],
        });
        return true;
      }

      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
      return true;
    } catch (e) {
      console.error("Failed to show local notification:", e);
      return false;
    }
  },

  async schedulePillReminder(reminder: Reminder): Promise<boolean> {
    const days = reminder.daysOfWeek?.length ? reminder.daysOfWeek : [1, 2, 3, 4, 5, 6, 7];
    const notificationIds = reminder.notificationIds || [];
    const { hour, minute } = parseTime(reminder.time);

    if (!this.isSupported() || !(await this.requestPermission())) {
      return false;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await ensurePillChannel();
        await LocalNotifications.schedule({
          notifications: days.map((day, index) => ({
            id: notificationIds[index] || ((Date.now() + index) % 2147483647),
            title: `Time to take ${reminder.medicineName}`,
            body: `Dose: ${reminder.dose}${reminder.notes ? `. ${reminder.notes}` : ""}`,
            channelId: "pill-reminders",
            schedule: {
              on: {
                weekday: day as Weekday,
                hour,
                minute,
              },
              repeats: true,
              allowWhileIdle: true,
            },
          })),
        });
        return true;
      }

      const today = new Date().getDay();
      const todayAsCapacitor = today === 0 ? 1 : (today + 1) as WeekdayNumber;
      if (days.includes(todayAsCapacitor)) {
        const at = nextDateForWeekday(todayAsCapacitor, reminder.time);
        window.setTimeout(() => {
          void this.showNotification(
            `Time to take ${reminder.medicineName}`,
            `Dose: ${reminder.dose}${reminder.notes ? `. ${reminder.notes}` : ""}`
          );
        }, Math.max(0, at.getTime() - Date.now()));
      }
      return true;
    } catch (e) {
      console.error("Failed to schedule pill reminder:", e);
      return false;
    }
  },

  async cancelNotifications(ids?: number[]): Promise<void> {
    if (!Capacitor.isNativePlatform() || !ids?.length) return;

    try {
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      });
    } catch (e) {
      console.error("Failed to cancel pill notifications:", e);
    }
  },

  showPillReminder(medicineName: string, dose: string, instructions: string): void {
    const title = `Time to take ${medicineName}`;
    const body = `Dose: ${dose}. Instructions: ${instructions}`;
    void this.showNotification(title, body);
  }
};
