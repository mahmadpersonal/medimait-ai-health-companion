import { AppLanguage, PrescriptionScanResult } from "../types";
import { apiUrl, hasApiBaseUrl, isPackagedAndroidWebView } from "./apiConfig";

export interface ScanResponse {
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  condition?: string;
  medicines: Array<{
    name: string;
    salt?: string;
    dosage: string;
    timing: string;
    duration: string;
    instructions: string;
    purpose: string;
    sideEffects?: string;
    precautions?: string;
  }>;
}

function normalizeScanData(data: ScanResponse | ScanResponse["medicines"] | any): ScanResponse {
  if (Array.isArray(data)) {
    return { medicines: data };
  }

  if (data && !Array.isArray(data.medicines) && data.name) {
    return { medicines: [data] };
  }

  return {
    ...data,
    medicines: Array.isArray(data?.medicines) ? data.medicines : [],
  };
}

const openAiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const openAiVisionModel = import.meta.env.VITE_OPENAI_VISION_MODEL || "gpt-4o-mini";
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const geminiVisionModel = import.meta.env.VITE_GEMINI_VISION_MODEL || "gemini-2.5-flash-lite";

const languageInstruction = (language: AppLanguage = "en") =>
  language === "ur"
    ? "Write condition, purpose, instructions, sideEffects, and precautions in Urdu. Keep medicine names and salt/generic ingredients unchanged in their original visible language."
    : "Write condition, purpose, instructions, sideEffects, and precautions in clear English.";

async function optimizeImageForOcr(imageDataUrl: string): Promise<string> {
  if (typeof window === "undefined" || !imageDataUrl.startsWith("data:image/")) return imageDataUrl;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1600;
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(imageDataUrl);
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => resolve(imageDataUrl);
    image.src = imageDataUrl;
  });
}

function toPrescriptionResult(data: ScanResponse): PrescriptionScanResult {
  const normalized = normalizeScanData(data);
  const medicines = (normalized.medicines || []).map((m, idx) => ({
    id: `med_${Date.now()}_${idx}`,
    name: m.name || "",
    salt: m.salt || "",
    dosage: m.dosage || "",
    timing: m.timing || "Morning",
    duration: m.duration || "",
    instructions: m.instructions || "",
    purpose: m.purpose || "",
    sideEffects: m.sideEffects || "",
    precautions: m.precautions || "",
  }));

  return {
    id: `scan_${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    doctorName: normalized.doctorName || "",
    clinicName: normalized.clinicName || "",
    patientName: normalized.patientName || "",
    condition: normalized.condition || "",
    medicines,
  };
}

async function scanWithServer(base64Image: string, language: AppLanguage): Promise<PrescriptionScanResult> {
  const response = await fetch(apiUrl("/api/scan-prescription"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: base64Image, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server responded with status ${response.status}`);
  }

  return toPrescriptionResult(await response.json());
}

async function scanWithOpenAI(base64Image: string, language: AppLanguage): Promise<PrescriptionScanResult> {
  if (!openAiKey) {
    throw new Error(
      "Prescription scanning is unavailable right now. Please check your internet connection and try again."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: openAiVisionModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are MediMait's prescription OCR parser. Return only valid JSON with doctorName, clinicName, patientName, condition, and medicines. medicines must be an array of objects with name, salt, dosage, timing, duration, instructions, purpose, sideEffects, precautions. name is the visible brand/medicine name. salt is the generic ingredient/composition if visible or confidently inferable from the medicine name; otherwise empty. Extract every visible medicine or prescribed item, with no maximum count. Use empty strings when unreadable. Never invent medicines that are not visible.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Read this prescription image carefully. Extract all visible prescription details and every visible medicine row/item. Map timing to Morning, Afternoon, Evening, or Night when possible. For each medicine, write purpose and instructions as 2-3 short helpful lines. ${languageInstruction(language)}`,
            },
            {
              type: "image_url",
              image_url: { url: base64Image },
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errInfo = await response.json().catch(() => ({}));
    throw new Error(errInfo.error?.message || `OpenAI OCR failed with status ${response.status}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI OCR returned an empty response.");

  return toPrescriptionResult(JSON.parse(text.trim()));
}

async function scanWithGemini(base64Image: string, language: AppLanguage): Promise<PrescriptionScanResult> {
  if (!geminiKey) {
    throw new Error(
      "Prescription scanning is unavailable right now. Please check your internet connection and try again."
    );
  }

  let base64Data = base64Image;
  let mimeType = "image/jpeg";
  if (base64Image.startsWith("data:")) {
    const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiVisionModel}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `You are MediMait's prescription OCR parser. Read this prescription image carefully and return only valid JSON with doctorName, clinicName, patientName, condition, and medicines. medicines must be an array of objects with name, salt, dosage, timing, duration, instructions, purpose, sideEffects, precautions. name is the visible brand/medicine name. salt is the generic ingredient/composition if visible or confidently inferable from the medicine name; otherwise empty. Extract every visible medicine or prescribed item, with no maximum count. Use empty strings when unreadable. Never invent medicines that are not visible. Map timing to Morning, Afternoon, Evening, or Night when possible. For each medicine, write purpose and instructions as 2-3 short helpful lines. ${languageInstruction(language)}`,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              doctorName: { type: "STRING" },
              clinicName: { type: "STRING" },
              patientName: { type: "STRING" },
              condition: { type: "STRING" },
              medicines: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    salt: { type: "STRING" },
                    dosage: { type: "STRING" },
                    timing: { type: "STRING" },
                    duration: { type: "STRING" },
                    instructions: { type: "STRING" },
                    purpose: { type: "STRING" },
                    sideEffects: { type: "STRING" },
                    precautions: { type: "STRING" },
                  },
                  required: ["name", "dosage", "timing", "duration", "instructions", "purpose"],
                },
              },
            },
            required: ["medicines"],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errInfo = await response.json().catch(() => ({}));
    throw new Error(errInfo.error?.message || `Gemini OCR failed with status ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini OCR returned an empty response.");

  return toPrescriptionResult(JSON.parse(text.trim()));
}

export const aiVisionService = {
  async scanPrescriptionImage(base64Image: string, language: AppLanguage = "en"): Promise<PrescriptionScanResult> {
    const optimizedImage = await optimizeImageForOcr(base64Image);
    try {
      if (hasApiBaseUrl() || !isPackagedAndroidWebView()) {
        return await scanWithServer(optimizedImage, language);
      }
      if (geminiKey) return await scanWithGemini(optimizedImage, language);
      return await scanWithOpenAI(optimizedImage, language);
    } catch (error: any) {
      if (!hasApiBaseUrl() && geminiKey) {
        return scanWithGemini(optimizedImage, language);
      }
      if (!hasApiBaseUrl() && openAiKey) {
        return scanWithOpenAI(optimizedImage, language);
      }
      console.error("AI scanPrescriptionImage Service Error:", error);
      throw error;
    }
  },
};
