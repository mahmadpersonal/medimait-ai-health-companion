import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, ShieldAlert, ArrowRight, Trash2, Heart, Shield, RefreshCw } from "lucide-react";
import { ChatMessage, Profile, Reminder, MedicalRecord } from "../types";

interface ChatPageProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  useSavedRecords: boolean;
  onSetUseSavedRecords: (enabled: boolean) => void;
  onSendMessage: (text: string, contextData?: any) => Promise<void>;
  onClearChat: () => void;
  profiles: Profile[];
  reminders: Reminder[];
  records: MedicalRecord[];
}

export function ChatPage({
  messages,
  loading,
  error,
  useSavedRecords,
  onSetUseSavedRecords,
  onSendMessage,
  onClearChat,
  profiles,
  reminders,
  records,
}: ChatPageProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chats
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    // Gather context records data if authorization toggle is set on
    let contextPayload: any = null;
    if (useSavedRecords) {
      contextPayload = {
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
        })),
        pastPrescriptionFilesCount: records.length,
      };
    }

    onSendMessage(inputText.trim(), contextPayload);
    setInputText("");
  };

  const handleQuickQuestion = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative select-none">
      
      {/* STATIC TOP HEADER BAR */}
      <div className="px-5 pt-3 pb-3 border-b border-slate-150 bg-white/95 backdrop-blur-md flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Health Chat</h1>
          <p className="text-[10px] text-slate-400 font-medium">Explain medicines and care suggestions.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CHAT MESSAGES PORT */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-[90px] space-y-4">
        
        {/* RECORDS CONTEXT PERMISSION TOGGLE BANNER (Image 2 design) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-2xs flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800">Use my saved records</p>
              <p className="text-[10px] text-slate-400 font-medium">Personalize answers with profiles data</p>
            </div>
          </div>

          {/* Simple Slider Switch */}
          <button
            onClick={() => onSetUseSavedRecords(!useSavedRecords)}
            className={`w-[46px] h-[24px] rounded-full flex items-center p-0.5 transition-all outline-none cursor-pointer ${
              useSavedRecords ? "bg-blue-600" : "bg-slate-205"
            }`}
          >
            <div
              className={`bg-white w-[20px] h-[20px] rounded-full shadow-sm transition-transform ${
                useSavedRecords ? "translate-x-5" : "translate-x-0"
              }`}
            ></div>
          </button>
        </div>

        {/* EMPTY STATE CHAT WINDOW (Matching Image 2 design) */}
        {messages.length === 0 && (
          <div className="py-12 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2.5xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6.5 h-6.5 stroke-[1.8]" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">Start a conversation</h3>
            <p className="text-[11px] text-slate-450 leading-relaxed max-w-[250px] mx-auto">
              Ask about medications, symptoms, side effects, or general care tips.
            </p>

            {/* Quick action chips */}
            <div className="mt-8 space-y-2 px-6">
              <button
                onClick={() => handleQuickQuestion("What are the side effects of taking Amoxicillin?")}
                className="w-full text-left bg-white border border-slate-100 hover:bg-slate-50 transition-colors rounded-xl p-3 text-[10.5px] font-semibold text-slate-700 flex justify-between items-center cursor-pointer"
              >
                <span>What are Amoxicillin side effects?</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleQuickQuestion("Explain Acute Acid Reflux in very simple words.")}
                className="w-full text-left bg-white border border-slate-100 hover:bg-slate-50 transition-colors rounded-xl p-3 text-[10.5px] font-semibold text-slate-700 flex justify-between items-center cursor-pointer"
              >
                <span>Explain Acid Reflux in simple words</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleQuickQuestion("When should I see a doctor urgently for high fever?")}
                className="w-full text-left bg-white border border-slate-100 hover:bg-slate-50 transition-colors rounded-xl p-3 text-[10.5px] font-semibold text-slate-700 flex justify-between items-center cursor-pointer"
              >
                <span>When should I see doctor for high fever?</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Medical guidance label at the extreme bottom (Match Image 2) */}
            <div className="mt-8 inline-flex items-center gap-1.5 bg-[rgba(16,185,129,0.06)] border border-emerald-500/10 text-emerald-700 font-bold text-[10px] py-1 px-3 rounded-full">
              <Shield className="w-3 h-3 text-emerald-600" />
              General guidance only · Not medical advice
            </div>
          </div>
        )}

        {/* CHAT MESSAGES DISPLAY */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                isUser ? "ml-auto items-end" : "mr-auto items-start animate-fade-in"
              }`}
            >
              <div
                className={`p-4 rounded-3xl text-xs leading-relaxed shadow-3xs ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-sm"
                    : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm markdown-body"
                }`}
              >
                {/* Basic pseudo markdown interpretation for safe bubble rendering */}
                {msg.text.split("\n").map((line, lIdx) => {
                  let formatted = line;
                  // Handle bold markdown highlights
                  if (formatted.includes("**")) {
                    const parts = formatted.split("**");
                    return (
                      <p key={lIdx} className="mb-1 last:mb-0">
                        {parts.map((p, pIdx) => (pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold text-blue-600">{p}</strong> : p))}
                      </p>
                    );
                  }
                  
                  // Bullet lists
                  if (formatted.trim().startsWith("-") || formatted.trim().startsWith("*")) {
                    return (
                      <li key={lIdx} className="ml-2.5 list-disc mt-0.5">
                        {formatted.replace(/^[-*]\s*/, "")}
                      </li>
                    );
                  }

                  return (
                    <p key={lIdx} className="mb-1 last:mb-0">
                      {formatted}
                    </p>
                  );
                })}
              </div>
              <span className="text-[9.5px] text-slate-400 mt-1 font-medium px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {/* BOT IS THINKING SPIN */}
        {loading && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-sm flex items-center gap-2.5 shadow-3xs">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="text-[11px] text-slate-400 font-semibold italic">TediMed Assistant is typing...</span>
            </div>
          </div>
        )}

        {/* Safe Scroll Target */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT ZONE FIXED ABSOLUTE ABOVE BOTTOM NAVIGATION (Image 2 design) */}
      <div className="absolute bottom-3 inset-x-0 px-4 bg-transparent z-40">
        <form
          onSubmit={handleSend}
          className="bg-white border border-slate-150 rounded-2.5xl p-2.5 flex items-center shadow-lg shadow-slate-100 gap-2 focus-within:ring-2 focus-within:ring-blue-100"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about medications, general care, safety advice..."
            className="flex-1 text-xs px-3 focus:outline-none placeholder:text-slate-400 text-slate-800"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-colors shadow-xs active:scale-95 disabled:bg-slate-150 disabled:text-slate-400 cursor-pointer"
          >
            <Send className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>
      </div>
    </div>
  );
}
