import React, { useEffect, useState } from "react";
import { Plus, Sun, Cloud, Moon, Compass, Bell, AlertCircle, Trash2, CheckCircle2, Circle, Edit, X } from "lucide-react";
import { Reminder, Profile, WeekdayNumber } from "../types";
import { notificationService } from "../services/notificationService";

interface PillsPageProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, "id" | "history">) => void;
  onDeleteReminder: (id: string) => void;
  onToggleTakenToday: (id: string) => void;
  profiles: Profile[];
  getTodayStr: () => string;
}

export function PillsPage({
  reminders,
  onAddReminder,
  onDeleteReminder,
  onToggleTakenToday,
  profiles,
  getTodayStr,
}: PillsPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [notifSupported, setNotifSupported] = useState(notificationService.isSupported());
  const [notifPermission, setNotifPermission] = useState(false);

  // Add Reminder form state
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("08:00");
  const [timingGroup, setTimingGroup] = useState<"Morning" | "Afternoon" | "Evening" | "Night">("Morning");
  const [selectedDays, setSelectedDays] = useState<WeekdayNumber[]>([2, 3, 4, 5, 6]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [notes, setNotes] = useState("");

  const todayStr = getTodayStr();
  const dayOptions: Array<{ value: WeekdayNumber; label: string }> = [
    { value: 2, label: "Mon" },
    { value: 3, label: "Tue" },
    { value: 4, label: "Wed" },
    { value: 5, label: "Thu" },
    { value: 6, label: "Fri" },
    { value: 7, label: "Sat" },
    { value: 1, label: "Sun" },
  ];

  useEffect(() => {
    let mounted = true;
    notificationService.hasPermission().then((allowed) => {
      if (mounted) setNotifPermission(allowed);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Timing groups metadata for cards matching Image 4
  const timeBlocks = [
    {
      id: "Morning",
      label: "Morning",
      hours: "6:00 - 12:00 AM",
      icon: Sun,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      accent: "amber",
    },
    {
      id: "Afternoon",
      label: "Afternoon",
      hours: "12:00 - 5:00 PM",
      icon: Compass,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "blue",
    },
    {
      id: "Evening",
      label: "Evening",
      hours: "5:00 - 9:00 PM",
      icon: Cloud,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accent: "indigo",
    },
    {
      id: "Night",
      label: "Night",
      hours: "9:00 PM - 6:00 AM",
      icon: Moon,
      color: "bg-slate-100 text-slate-700 border-slate-205",
      accent: "slate",
    },
  ];

  const handleRequestNotifPermission = async () => {
    const granted = await notificationService.requestPermission();
    setNotifPermission(granted);
    if (granted) {
      alert("Notifications successfully enabled!");
    } else {
      alert("Permission denied or not supported in this browser viewport.");
    }
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName || !dose) {
      alert("Please enter medicine name and dosage");
      return;
    }

    onAddReminder({
      medicineName,
      dose,
      time,
      timingGroup,
      frequency: selectedDays.length === 7
        ? "Every day"
        : selectedDays.map((day) => dayOptions.find((item) => item.value === day)?.label).filter(Boolean).join(", "),
      daysOfWeek: selectedDays.length ? selectedDays : [2, 3, 4, 5, 6, 7, 1],
      startDate: new Date().toISOString().split("T")[0],
      notes,
      patientProfileId: selectedProfileId || (profiles[0]?.id || ""),
    });

    // Reset Form
    setMedicineName("");
    setDose("");
    setTime("08:00");
    setSelectedDays([2, 3, 4, 5, 6]);
    setNotes("");
    setShowAddModal(false);
  };

  // Helper: Filter reminders by group
  const getRemindersByGroup = (group: "Morning" | "Afternoon" | "Evening" | "Night") => {
    return reminders.filter((r) => r.timingGroup === group);
  };

  const toggleDay = (day: WeekdayNumber) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        const next = current.filter((item) => item !== day);
        return next.length ? next : current;
      }
      return [...current, day].sort((a, b) => dayOptions.findIndex((item) => item.value === a) - dayOptions.findIndex((item) => item.value === b));
    });
  };

  const dayLabel = (day: WeekdayNumber) => dayOptions.find((item) => item.value === day)?.label || "";

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 select-none">
      
      {/* HEADER SECTION WITH ADD FLOATER CARD */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pills</h1>
          <p className="text-xs text-slate-500 font-medium">Simple pill reminders and schedule managers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-blue-200 transition-all cursor-pointer"
        >
          <Plus className="w-5.5 h-5.5 stroke-[2.2]" />
        </button>
      </div>

      {/* NOTIFICATIONS CONTROL BAR */}
      {notifSupported && !notifPermission && (
        <div className="mb-5 bg-blue-50 border border-blue-100 rounded-2.5xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4.5 h-4.5 text-blue-600 animate-bounce" />
            <div className="text-[10.5px]">
              <p className="font-bold text-blue-900">Push Notifications Disabled</p>
              <p className="text-blue-700/80 mt-0.5">Enable now to never miss a daily pill schedule.</p>
            </div>
          </div>
          <button
            onClick={handleRequestNotifPermission}
            className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg ml-2 shrink-0 cursor-pointer"
          >
            Enable
          </button>
        </div>
      )}

      {/* TIMING BLOCKS LIST */}
      <div className="space-y-4">
        {timeBlocks.map((block) => {
          const groupReminders = getRemindersByGroup(block.id as any);
          const takenCount = groupReminders.filter((r) => r.history?.[todayStr]).length;
          const totalCount = groupReminders.length;
          const Icon = block.icon;

          return (
            <div
              key={block.id}
              className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-xs transition-transform hover:-translate-y-0.5"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${block.color}`}>
                    <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{block.label}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{block.hours}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  {totalCount === 0
                    ? "0 pills"
                    : `${takenCount}/${totalCount} taken`}
                </span>
              </div>

              {/* Sub-list of reminders in this timing block */}
              {totalCount > 0 ? (
                <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-50">
                  {groupReminders.map((reminder) => {
                    const isTaken = !!reminder.history?.[todayStr];
                    const patient = profiles.find((p) => p.id === reminder.patientProfileId);

                    return (
                      <div
                        key={reminder.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isTaken
                            ? "bg-slate-50/70 border-slate-100/50 text-slate-400"
                            : "bg-slate-50 border-transparent text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Toggle Taken Checkbox */}
                          <button
                            onClick={() => onToggleTakenToday(reminder.id)}
                            className="text-slate-400 active:scale-95 transition-transform cursor-pointer"
                          >
                            {isTaken ? (
                              <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500 fill-emerald-50" />
                            ) : (
                              <Circle className="w-5.5 h-5.5 text-slate-350 bg-white rounded-full" />
                            )}
                          </button>

                          <div className="truncate">
                            <h4
                              className={`text-xs font-extrabold leading-snug ${
                                isTaken ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {reminder.medicineName}
                            </h4>
                            <p className="text-[10.5px] mt-0.5 flex items-center gap-1.5 font-medium text-slate-400">
                              <span>Dose: {reminder.dose}</span>
                              {reminder.time && <span>• At {reminder.time}</span>}
                              {patient && (
                                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px]">
                                  {patient.name}
                                </span>
                              )}
                            </p>
                            <p className="text-[9.5px] mt-1 font-bold text-blue-500">
                              {(reminder.daysOfWeek?.length ? reminder.daysOfWeek : ([1, 2, 3, 4, 5, 6, 7] as WeekdayNumber[])).map(dayLabel).join(" ")}
                            </p>
                          </div>
                        </div>

                        {/* Delete reminder button */}
                        <button
                          onClick={() => {
                            if (confirm("Delete this reminder permanently?")) {
                              onDeleteReminder(reminder.id);
                            }
                          }}
                          className="text-slate-350 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed text-center py-2">
                  No pills added for this time
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* OVERALL EMPTY STATE */}
      {reminders.length === 0 && (
        <div className="mt-6 border border-slate-100 bg-white p-7 rounded-3xl text-center shadow-xs">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3.5">
            <Plus className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mb-1">No reminders yet</h3>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            Tap the + button to add your first pill reminder, or scan a prescription and TediMed AI can generate reminders instantly!
          </p>
        </div>
      )}

      {/* ADD_MODAL / BOTTOM SHEET */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end justify-center transition-opacity duration-300">
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl max-h-[85%] overflow-y-auto animate-slide-up relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 mb-1">Add Reminder</h3>
            <p className="text-[11px] text-slate-400 mb-5">Configure daily schedules manual settings.</p>

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Nexium, Amoxicillin"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Dosage / Dose</label>
                  <input
                    type="text"
                    required
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 1 Tablet"
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Take Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Reminder Days</label>
                <div className="grid grid-cols-4 gap-2">
                  {dayOptions.map((day) => {
                    const checked = selectedDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`rounded-xl border px-2 py-2 text-[10.5px] font-extrabold flex items-center justify-center gap-1.5 ${
                          checked
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                        }`}>
                          {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </span>
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Timing Group</label>
                  <select
                    value={timingGroup}
                    onChange={(e) => setTimingGroup(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Assign to Family Profile</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">-- Myself (Default) --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Doctor Instructions / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take after medicine meals, do not drink with cold milk..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3.5 rounded-xl mt-3 shadow-md tracking-wider cursor-pointer"
              >
                Create Reminder Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
