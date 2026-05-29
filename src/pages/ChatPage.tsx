import React, { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, ArrowRight, Trash2, Shield, RefreshCw, Plus, Pencil, Check, X } from "lucide-react";
import { ChatMessage, ChatThread, Profile, Reminder, MedicalRecord } from "../types";

interface ChatPageProps {
  messages: ChatMessage[];
  threads: ChatThread[];
  activeThreadId: string;
  loading: boolean;
  error: string | null;
  useSavedRecords: boolean;
  onSetUseSavedRecords: (enabled: boolean) => void;
  onSendMessage: (text: string, contextData?: any) => Promise<void>;
  onClearChat: () => void;
  onCreateThread: () => boolean;
  onSelectThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  profiles: Profile[];
  reminders: Reminder[];
  records: MedicalRecord[];
}

function cleanBotLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function MessageText({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split("\n").map(cleanBotLine).filter(Boolean);

  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const bullet = line.match(/^[-*]\s+(.*)$/);
        if (bullet && !isUser) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 shrink-0"></span>
              <p>{bullet[1]}</p>
            </div>
          );
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export function ChatPage({
  messages,
  threads,
  activeThreadId,
  loading,
  error,
  useSavedRecords,
  onSetUseSavedRecords,
  onSendMessage,
  onClearChat,
  onCreateThread,
  onSelectThread,
  onRenameThread,
  profiles,
  reminders,
  records,
}: ChatPageProps) {
  const [inputText, setInputText] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [threadNotice, setThreadNotice] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId);

  const buildContextPayload = () => ({
    patientProfiles: profiles.map((p) => ({
      name: p.name,
      type: p.type,
      age: p.age,
      allergies: p.allergies,
      medicalConditions: p.medicalConditions,
    })),
    activeMedicines: reminders.map((r) => ({
      name: r.medicineName,
      dose: r.dose,
      frequency: r.frequency,
      time: r.time,
      daysOfWeek: r.daysOfWeek,
    })),
    pastPrescriptionFilesCount: records.length,
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText.trim(), useSavedRecords ? buildContextPayload() : undefined);
    setInputText("");
  };

  const handleCreateThread = () => {
    const created = onCreateThread();
    if (!created) {
      setThreadNotice("Maximum 3 chat tabs allowed.");
      window.setTimeout(() => setThreadNotice(""), 1800);
    }
  };

  const startRename = (thread: ChatThread) => {
    setRenamingId(thread.id);
    setRenameText(thread.title);
  };

  const saveRename = () => {
    if (!renamingId) return;
    onRenameThread(renamingId, renameText);
    setRenamingId(null);
    setRenameText("");
  };

  const quickQuestions = [
    "I have fever and body pain. What should I watch for?",
    "Can you explain my saved medicines in simple words?",
    "When should cough symptoms need a doctor?",
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative select-none">
      <div className="px-5 pt-3 pb-3 border-b border-slate-150 bg-white/95 backdrop-blur-md shrink-0">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">MediBot</h1>
            <p className="text-[10px] text-slate-400 font-medium">Clear medicine and symptom guidance.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetUseSavedRecords(!useSavedRecords)}
              className={`h-8 px-2.5 rounded-full text-[10px] font-extrabold border transition-colors ${
                useSavedRecords
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              Records {useSavedRecords ? "On" : "Off"}
            </button>
            {messages.length > 0 && (
              <button
                onClick={onClearChat}
                className="w-8 h-8 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl flex items-center justify-center"
                title="Clear this chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {threads.map((thread) => {
            const active = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                className={`shrink-0 h-9 rounded-2xl border flex items-center gap-1.5 px-2 ${
                  active ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                {renamingId === thread.id ? (
                  <>
                    <input
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="w-24 bg-transparent text-[10px] font-bold focus:outline-none"
                      autoFocus
                    />
                    <button onClick={saveRename} className="p-1"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setRenamingId(null)} className="p-1"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onSelectThread(thread.id)} className="max-w-[112px] truncate text-[10px] font-extrabold">
                      {thread.title}
                    </button>
                    <button onClick={() => startRename(thread)} className="p-1 opacity-80" title="Rename chat">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          <button
            onClick={handleCreateThread}
            disabled={threads.length >= 3}
            title={threads.length >= 3 ? "Maximum 3 chat tabs allowed" : "New chat"}
            className="shrink-0 w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {threadNotice && <p className="mt-1 text-[10px] font-semibold text-slate-500">{threadNotice}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-[92px] space-y-4">
        {messages.length === 0 && (
          <div className="py-10 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2.5xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6.5 h-6.5 stroke-[1.8]" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">
              {activeThread?.title || "New chat"}
            </h3>
            <p className="text-[11px] text-slate-450 leading-relaxed max-w-[250px] mx-auto">
              Ask about symptoms, medicines, side effects, or when care should be urgent.
            </p>

            <div className="mt-7 space-y-2 px-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => setInputText(question)}
                  className="w-full text-left bg-white border border-slate-100 hover:bg-slate-50 transition-colors rounded-xl p-3 text-[10.5px] font-semibold text-slate-700 flex justify-between items-center"
                >
                  <span>{question}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>

            <div className="mt-7 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-[10px] py-1 px-3 rounded-full">
              <Shield className="w-3 h-3 text-emerald-600" />
              General guidance only
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[86%] ${isUser ? "ml-auto items-end" : "mr-auto items-start animate-fade-in"}`}
            >
              <div
                className={`p-4 rounded-3xl text-xs leading-relaxed shadow-3xs ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-sm"
                    : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                }`}
              >
                <MessageText text={msg.text} isUser={isUser} />
              </div>
              <span className="text-[9.5px] text-slate-400 mt-1 font-medium px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-sm flex items-center gap-2.5 shadow-3xs">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="text-[11px] text-slate-400 font-semibold italic">MediBot is typing...</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-3 inset-x-0 px-4 bg-transparent z-40">
        <form
          onSubmit={handleSend}
          className="bg-white border border-slate-150 rounded-2.5xl p-2.5 flex items-center shadow-lg shadow-slate-100 gap-2 focus-within:ring-2 focus-within:ring-blue-100"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask MediBot..."
            className="flex-1 text-xs px-3 focus:outline-none placeholder:text-slate-400 text-slate-800 min-w-0"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-colors shadow-xs active:scale-95 disabled:bg-slate-150 disabled:text-slate-400"
          >
            <Send className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>
      </div>
    </div>
  );
}
