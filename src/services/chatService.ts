import { ChatMessage } from "../types";
import { apiUrl, hasApiBaseUrl, isPackagedAndroidWebView } from "./apiConfig";

export interface ChatServiceResponse {
  reply: string;
}

const openAiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const chatModel = import.meta.env.VITE_OPENAI_CHAT_MODEL || "gpt-4o-mini";

function systemPrompt(contextData?: any) {
  return `You are MediBot, the warm and practical health assistant inside MediMait.

Help users understand symptoms, possible common causes, medicine purposes, side effects, and care steps in simple mobile-friendly language.

Safety rules:
- You may explain what symptoms or conditions can commonly mean, but do not claim a definitive diagnosis.
- Give useful first-pass guidance first, then explain when to consult a doctor.
- Urgent symptoms such as chest pain, breathing trouble, severe allergic reaction, severe bleeding, confusion, fainting, one-sided weakness, or very high/persistent fever should be directed to urgent medical care immediately.
- Never tell the user to start, stop, or change prescription medicine without a doctor or pharmacist.
- Keep answers concise, structured, and helpful.
- Do not use markdown symbols. Do not use asterisks, hashtags, tables, or code formatting.
- Use short plain sections with simple labels like Summary, What it could mean, What to do, Watch out, and When to seek care.
- Answer the user's exact question first. Keep the tone calm, direct, and easy to read on a phone.

${contextData ? `User-permitted saved context:\n${JSON.stringify(contextData, null, 2)}` : "No saved medical record context was shared."}

End with one short sentence: Friendly guidance only, not a diagnosis.`;
}

async function sendWithServer(messages: ChatMessage[], useSavedRecordsEnabled: boolean, contextData?: any) {
  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      contextData: useSavedRecordsEnabled ? contextData : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server responded with status ${response.status}`);
  }

  const data: ChatServiceResponse = await response.json();
  return data.reply;
}

async function sendWithOpenAI(messages: ChatMessage[], contextData?: any) {
  if (!openAiKey) {
    throw new Error(
      "MediBot is not configured. Add VITE_OPENAI_API_KEY for direct mobile chat or VITE_API_BASE_URL for the MediMait API server."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: chatModel,
      messages: [
        { role: "system", content: systemPrompt(contextData) },
        ...messages.map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      ],
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errInfo = await response.json().catch(() => ({}));
    throw new Error(errInfo.error?.message || `OpenAI chat failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "I could not generate a response this time.";
}

export const chatService = {
  async sendMessage(
    messages: ChatMessage[],
    useSavedRecordsEnabled: boolean,
    contextData?: any
  ): Promise<string> {
    try {
      if (hasApiBaseUrl() || !isPackagedAndroidWebView()) {
        return await sendWithServer(messages, useSavedRecordsEnabled, contextData);
      }
      return await sendWithOpenAI(messages, useSavedRecordsEnabled ? contextData : undefined);
    } catch (error: any) {
      if (!hasApiBaseUrl() && openAiKey) {
        return sendWithOpenAI(messages, useSavedRecordsEnabled ? contextData : undefined);
      }
      console.error("Chat service call failed:", error);
      throw error;
    }
  },
};
