import { useState, useEffect } from "react";
import { ChatMessage } from "../types";
import { storageService } from "../services/storageService";
import { chatService } from "../services/chatService";
import { usageLimitService } from "../services/usageLimitService";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSavedRecords, setUseSavedRecords] = useState(false);

  useEffect(() => {
    setMessages(storageService.getChats());
  }, []);

  const sendMessage = async (text: string, contextData?: any) => {
    if (!text.trim()) return;

    setError(null);

    if (!usageLimitService.canUse("chatInputs", 20)) {
      const limitMessage: ChatMessage = {
        id: `chat_${Date.now()}_limit`,
        sender: "assistant",
        text: usageLimitService.message,
        timestamp: new Date().toISOString(),
      };
      const limitedMessages = [...messages, limitMessage];
      setMessages(limitedMessages);
      storageService.saveChats(limitedMessages);
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
    setMessages(updatedMessages);
    storageService.saveChats(updatedMessages);
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

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      storageService.saveChats(finalMessages);
    } catch (err: any) {
      console.error("AI Communication Error:", err);
      const message = err.message || "Something went wrong. Please check your internet connection and AI settings.";
      setError(message);

      const errorMessageReply: ChatMessage = {
        id: `chat_${Date.now()}_err`,
        sender: "assistant",
        text: `**AI service unavailable:** I could not reach the TediMed chat engine right now.

${message.includes("API key") || message.includes("not configured") ? "*Please configure VITE_OPENAI_API_KEY for direct mobile chat, or VITE_API_BASE_URL for the TediMed API server.*" : ""}`,
        timestamp: new Date().toISOString(),
      };

      const finalMessagesWithErr = [...updatedMessages, errorMessageReply];
      setMessages(finalMessagesWithErr);
      storageService.saveChats(finalMessagesWithErr);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    storageService.saveChats([]);
    setError(null);
  };

  return {
    messages,
    loading,
    error,
    useSavedRecords,
    setUseSavedRecords,
    sendMessage,
    clearChat,
  };
}
