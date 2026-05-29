import { useEffect, useMemo, useState } from "react";
import { ChatMessage, ChatThread } from "../types";
import { storageService } from "../services/storageService";
import { chatService } from "../services/chatService";
import { usageLimitService } from "../services/usageLimitService";

const makeThread = (title = "New chat"): ChatThread => {
  const now = new Date().toISOString();
  return {
    id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

const getStarterTitle = (text: string) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 28 ? `${cleaned.slice(0, 28)}...` : cleaned || "New chat";
};

export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSavedRecords, setUseSavedRecords] = useState(false);

  useEffect(() => {
    const savedThreads = storageService.getChatThreads();
    const initialThreads = savedThreads.length ? savedThreads.slice(0, 3) : [makeThread("New chat")];
    const savedActiveId = storageService.getActiveChatThreadId();
    const activeId = initialThreads.some((thread) => thread.id === savedActiveId)
      ? savedActiveId!
      : initialThreads[0].id;

    setThreads(initialThreads);
    setActiveThreadId(activeId);
    storageService.saveChatThreads(initialThreads);
    storageService.saveActiveChatThreadId(activeId);
  }, []);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  const messages = activeThread?.messages || [];

  const persistThreads = (nextThreads: ChatThread[]) => {
    const limited = nextThreads.slice(0, 3);
    setThreads(limited);
    storageService.saveChatThreads(limited);
  };

  const selectThread = (id: string) => {
    setActiveThreadId(id);
    storageService.saveActiveChatThreadId(id);
    setError(null);
  };

  const createThread = () => {
    if (threads.length >= 3) return false;
    const thread = makeThread(`Chat ${threads.length + 1}`);
    const nextThreads = [thread, ...threads].slice(0, 3);
    persistThreads(nextThreads);
    selectThread(thread.id);
    return true;
  };

  const renameThread = (id: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    persistThreads(
      threads.map((thread) =>
        thread.id === id ? { ...thread, title: cleanTitle.slice(0, 36), updatedAt: new Date().toISOString() } : thread
      )
    );
  };

  const updateActiveThreadMessages = (nextMessages: ChatMessage[]) => {
    const now = new Date().toISOString();
    const nextThreads = threads.map((thread) => {
      if (thread.id !== activeThreadId) return thread;
      const title = thread.messages.length === 0 && nextMessages.length > 0
        ? getStarterTitle(nextMessages[0].text)
        : thread.title;
      return { ...thread, title, messages: nextMessages, updatedAt: now };
    });
    persistThreads(nextThreads);
  };

  const sendMessage = async (text: string, contextData?: any) => {
    if (!text.trim() || !activeThread) return;

    setError(null);

    if (!usageLimitService.canUse("chatInputs", 20)) {
      const limitMessage: ChatMessage = {
        id: `chat_${Date.now()}_limit`,
        sender: "assistant",
        text: usageLimitService.message,
        timestamp: new Date().toISOString(),
      };
      updateActiveThreadMessages([...messages, limitMessage]);
      setError(usageLimitService.message);
      return;
    }

    usageLimitService.recordUse("chatInputs");

    const userMessage: ChatMessage = {
      id: `chat_${Date.now()}_u`,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    updateActiveThreadMessages(updatedMessages);
    setLoading(true);

    try {
      const assistantReply = await chatService.sendMessage(
        updatedMessages,
        useSavedRecords,
        contextData
      );

      const botMessage: ChatMessage = {
        id: `chat_${Date.now()}_a`,
        sender: "assistant",
        text: assistantReply,
        timestamp: new Date().toISOString(),
      };

      updateActiveThreadMessages([...updatedMessages, botMessage]);
    } catch (err: any) {
      console.error("AI Communication Error:", err);
      const message = err.message || "Something went wrong. Please check your internet connection and AI settings.";
      setError(message);

      const errorMessageReply: ChatMessage = {
        id: `chat_${Date.now()}_err`,
        sender: "assistant",
        text: `MediBot could not respond right now.\n\n${message}`,
        timestamp: new Date().toISOString(),
      };

      updateActiveThreadMessages([...updatedMessages, errorMessageReply]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    updateActiveThreadMessages([]);
    setError(null);
  };

  return {
    messages,
    threads,
    activeThreadId,
    loading,
    error,
    useSavedRecords,
    setUseSavedRecords,
    sendMessage,
    clearChat,
    createThread,
    selectThread,
    renameThread,
  };
}
