import { useState, useTransition } from "react";
import { PhoneWrapper } from "./components/layout/PhoneWrapper";
import { BottomNavigation, NavTab } from "./components/layout/BottomNavigation";

// Import Pages
import { ScanPage } from "./pages/ScanPage";
import { PillsPage } from "./pages/PillsPage";
import { FilesPage } from "./pages/FilesPage";
import { ChatPage } from "./pages/ChatPage";
import { MePage } from "./pages/MePage";

// Import Hooks
import { useProfiles } from "./hooks/useProfiles";
import { useReminders } from "./hooks/useReminders";
import { useRecords } from "./hooks/useRecords";
import { useChat } from "./hooks/useChat";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("scan");
  const [, startTransition] = useTransition();

  // Custom persistent hooks
  const { profiles, addProfile, deleteProfile } = useProfiles();
  const { reminders, addReminder, deleteReminder, toggleTakenToday, getTodayStr, isReminderDueOn } = useReminders();
  const { records, addRecord, updateRecord, deleteRecord } = useRecords();
  const {
    messages,
    loading,
    error,
    useSavedRecords,
    setUseSavedRecords,
    sendMessage,
    clearChat,
  } = useChat();

  // Handle Bottom tab click
  const handleTabChange = (tab: NavTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  // Dynamically render active views
  const renderActiveScreen = () => {
    switch (activeTab) {
      case "scan":
        return (
          <ScanPage
            onAddRecord={addRecord}
            onAddReminder={addReminder}
            profiles={profiles}
            setActiveTab={handleTabChange}
            pillsCount={activePillsCount}
          />
        );
      case "pills":
        return (
          <PillsPage
            reminders={reminders}
            onAddReminder={addReminder}
            onDeleteReminder={deleteReminder}
            onToggleTakenToday={toggleTakenToday}
            profiles={profiles}
            getTodayStr={getTodayStr}
          />
        );
      case "files":
        return (
          <FilesPage
            records={records}
            onAddRecord={addRecord}
            onDeleteRecord={deleteRecord}
            onUpdateRecord={updateRecord}
            onAddReminder={addReminder}
            profiles={profiles}
            setActiveTab={handleTabChange}
          />
        );
      case "chat":
        return (
          <ChatPage
            messages={messages}
            loading={loading}
            error={error}
            useSavedRecords={useSavedRecords}
            onSetUseSavedRecords={setUseSavedRecords}
            onSendMessage={sendMessage}
            onClearChat={clearChat}
            profiles={profiles}
            reminders={reminders}
            records={records}
          />
        );
      case "me":
        return (
          <MePage
            profiles={profiles}
            onAddProfile={addProfile}
            onDeleteProfile={deleteProfile}
          />
        );
      default:
        return (
          <ScanPage
            onAddRecord={addRecord}
            onAddReminder={addReminder}
            profiles={profiles}
            setActiveTab={handleTabChange}
            pillsCount={activePillsCount}
          />
        );
    }
  };

  // Count active untreated pills for Bottom Navigation Badge
  const todayStr = getTodayStr();
  const activePillsCount = reminders.filter((r) => isReminderDueOn(r, new Date()) && !r.history?.[todayStr]).length;

  return (
    <PhoneWrapper>
      {/* Scrollable Viewport area */}
      <div className="flex-1 overflow-hidden flex flex-col h-full relative bg-slate-50 text-slate-900">
        {renderActiveScreen()}
      </div>

      {/* Bottom Nav fixed inside shell container */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        pillsCount={activePillsCount}
      />
    </PhoneWrapper>
  );
}
