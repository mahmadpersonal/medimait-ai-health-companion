import { Scan, Pill, FileText, MessageSquare, User } from "lucide-react";

export type NavTab = "scan" | "pills" | "files" | "chat" | "me";

interface BottomNavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  // Badges count, e.g. active pills setup
  pillsCount?: number;
  language?: "en" | "ur";
}

const labels = {
  en: {
    scan: "Scan",
    pills: "Pills",
    files: "Files",
    chat: "Chat",
    me: "Me",
  },
  ur: {
    scan: "\u0627\u0633\u06a9\u06cc\u0646",
    pills: "\u062f\u0648\u0627\u0626\u06cc\u06ba",
    files: "\u0641\u0627\u0626\u0644\u06cc\u06ba",
    chat: "\u0686\u06cc\u0679",
    me: "\u0645\u06cc\u06ba",
  },
};

export function BottomNavigation({ activeTab, onChangeTab, pillsCount = 0, language = "en" }: BottomNavigationProps) {
  const tabLabels = labels[language];
  const tabs = [
    { id: "scan" as NavTab, label: tabLabels.scan, icon: Scan },
    { id: "pills" as NavTab, label: tabLabels.pills, icon: Pill, badge: pillsCount },
    { id: "files" as NavTab, label: tabLabels.files, icon: FileText },
    { id: "chat" as NavTab, label: tabLabels.chat, icon: MessageSquare },
    { id: "me" as NavTab, label: tabLabels.me, icon: User },
  ];

  return (
    <div className="absolute bottom-0 inset-x-0 h-[calc(80px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-4 z-50">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-2 select-none relative group transition-all duration-200 cursor-pointer"
          >
            <div
              className={`p-1.5 rounded-2xl transition-all duration-300 relative ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            >
              <IconComponent
                className={`w-5.5 h-5.5 transition-transform duration-300 ${
                  isActive ? "scale-110 stroke-[2.2]" : "stroke-[1.8]"
                }`}
              />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-semibold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-white">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span
              className={`text-[10.5px] font-medium tracking-wide mt-1 transition-all duration-200 ${
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
