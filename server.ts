import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://localhost,http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Enable JSON payload parsing with larger limit for images
app.use(express.json({ limit: "15mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Initialize Gemini Client
const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const geminiVisionModel = process.env.GEMINI_VISION_MODEL || process.env.VITE_GEMINI_VISION_MODEL || "gemini-2.5-flash-lite";

let ai: GoogleGenAI | null = null;
if (geminiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. SCAN PRESCRIPTION API (GEMINI VISION)
app.post("/api/scan-prescription", async (req, res) => {
  try {
    if (!ai) {
      return res.status(403).json({
        error: "Missing API Key",
        message: "Gemini API key is not configured on the server. Please add VITE_GEMINI_API_KEY in your Secrets."
      });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Extract base64 clean data
    let base64Data = image;
    let mimeType = "image/jpeg";
    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "You are an expert prescription OCR reader. Scan this prescription or medicine bottle and extract all details with extreme precision. Analyze handwriting, typescript, medicine names, dosages, durations, and instructions. For purpose, describe in simple, warm, everyday human-friendly terms what the medicine does (e.g. 'Reduces fever and body pain' or 'Relieves bloating and gas'). Map the medicine's timing to exact categories: Morning, Afternoon, Evening, or Night. If unsure, guess the most likely timing category based on instructions (e.g. 'take at bedtime' -> Night). For side effects and precautions, list mild everyday-understandable elements.",
    };

    const response = await ai.models.generateContent({
      model: geminiVisionModel,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doctorName: { type: Type.STRING, description: "Doctor's name if readable, otherwise empty" },
            clinicName: { type: Type.STRING, description: "Clinic, hospital or pharmacy name if readable, otherwise empty" },
            patientName: { type: Type.STRING, description: "Patient's name if visible, otherwise empty" },
            condition: { type: Type.STRING, description: "The underlying medical condition or disease if stated or implied (e.g. 'Fever/Flu', 'High blood pressure')" },
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Precise name of the medicine" },
                  dosage: { type: Type.STRING, description: "Dosage detail, e.g. 500mg, 1 tablet, 5ml, 1 puff" },
                  timing: { type: Type.STRING, description: "Strictly ONE of: Morning, Afternoon, Evening, Night. Categorize based on instructions." },
                  duration: { type: Type.STRING, description: "Treatment duration, e.g., 5 days, 1 month, ongoing" },
                  instructions: { type: Type.STRING, description: "Plain simple instructions, e.g. Take after breakfast, Take with water" },
                  purpose: { type: Type.STRING, description: "Simple, easy, human words purpose of the medicine, e.g., 'Relieves severe cough and throat tickle'" },
                  sideEffects: { type: Type.STRING, description: "1-2 very common light side effects, e.g. Drowsiness, dry mouth" },
                  precautions: { type: Type.STRING, description: "1 key precaution, e.g. Avoid driving, do not take on empty stomach" }
                },
                required: ["name", "dosage", "timing", "duration", "instructions", "purpose"]
              }
            }
          },
          required: ["medicines"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini model");
    }

    const payload = JSON.parse(response.text.trim());
    return res.json(payload);

  } catch (error: any) {
    console.error("OCR Parse Error:", error);
    return res.status(500).json({
      error: "Scanning failed",
      message: error.message || "An unexpected error occurred while parsing the prescription image."
    });
  }
});

// 2. HEALTH BOT API (OPENAI CHAT)
app.post("/api/chat", async (req, res) => {
  try {
    const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(403).json({
        error: "Missing API Key",
        message: "OpenAI API key is not configured on the server. Please add VITE_OPENAI_API_KEY in your Secrets."
      });
    }

    const { messages, contextData } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    // Embed Context if requested and user granted permission
    const systemContext = `You are MediBot, the warm and practical health assistant inside MediMait.
Your goal is to explain medicines, offer care tips, explain potential symptoms, and guide normal people in simple words.

CRITICAL SAFETY RULES:
1. You MUST NOT diagnose any condition with absolute certainty. Always speak in terms of possibilities and encourage speaking with a doctor.
2. You MUST NOT tell users to start, stop, or change any prescription medicines without explicit doctor or pharmacist approval.
3. For severe, serious, or alarming symptoms (e.g., chest pain, breathing difficulty, severe bleeding, continuous high fever, sudden numbness), IMMEDIATELY advise seeking urgent medical emergency care.
4. Keep answers short, useful, and easy to read on a phone.
5. Do not use markdown symbols. Do not use asterisks, hashtags, tables, or code formatting.
6. Use simple plain section labels when useful, such as Summary, What it could mean, What to do, Watch out, and When to seek care.
7. Answer the user's exact question first, then add safety guidance only where it helps.

${contextData ? `Here is the current patient's medical records/profiles context which the user has permitted you to view:
${JSON.stringify(contextData, null, 2)}
Use this to personalize answers safely, keeping in mind the patient details and any allergies.` : "The user has not shared their saved records path. Do not make assumptions about their saved prescription history."}

Always end with one short sentence: Friendly guidance only, not a diagnosis.`;

    const chatPayload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContext },
        ...messages.map((m: any) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      ],
      temperature: 0.7
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(chatPayload)
    });

    if (!response.ok) {
      const errInfo = await response.json().catch(() => ({}));
      throw new Error(errInfo.error?.message || `OpenAI request failed with status ${response.status}`);
    }

    const result = await response.json();
    const replyText = result.choices?.[0]?.message?.content;

    return res.json({ reply: replyText });

  } catch (error: any) {
    console.error("Chat Server Error:", error);
    return res.status(500).json({
      error: "Chat failed",
      message: error.message || "Could not retrieve guide response from AI assistant."
    });
  }
});

// Setup dev server with Vite, or static server in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediMait server is running on http://localhost:${PORT}`);
  });
}

startServer();
