import { PrescriptionScanResult } from "../types";
import { apiUrl, hasApiBaseUrl, isPackagedAndroidWebView } from "./apiConfig";

export interface ScanResponse {
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  condition?: string;
  medicines: Array<{
    name: string;
    dosage: string;
    timing: string;
    duration: string;
    instructions: string;
    purpose: string;
    sideEffects?: string;
    precautions?: string;
  }>;
}

const openAiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const openAiVisionModel = import.meta.env.VITE_OPENAI_VISION_MODEL || "gpt-4o-mini";
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const geminiVisionModel = import.meta.env.VITE_GEMINI_VISION_MODEL || "gemini-2.5-flash-lite";

function toPrescriptionResult(data: ScanResponse): PrescriptionScanResult {
  const medicines = (data.medicines || []).map((m, idx) => ({
    id: `med_${Date.now()}_${idx}`,
    name: m.name || "",
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
    doctorName: data.doctorName || "",
    clinicName: data.clinicName || "",
    patientName: data.patientName || "",
    condition: data.condition || "",
    medicines,
  };
}

async function scanWithServer(base64Image: string): Promise<PrescriptionScanResult> {
  const response = await fetch(apiUrl("/api/scan-prescription"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server responded with status ${response.status}`);
  }

  return toPrescriptionResult(await response.json());
}

async function scanWithOpenAI(base64Image: string): Promise<PrescriptionScanResult> {
  if (!openAiKey) {
    throw new Error(
      "AI prescription scanning is not configured. Add VITE_OPENAI_API_KEY for direct mobile OCR or VITE_API_BASE_URL for the MediMait API server."
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
            "You are MediMait's prescription OCR parser. Return only valid JSON with doctorName, clinicName, patientName, condition, and medicines. medicines must be an array of objects with name, dosage, timing, duration, instructions, purpose, sideEffects, precautions. Use empty strings when unreadable. Never invent medicines that are not visible.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Read this prescription image carefully. Extract only visible prescription details. Map timing to Morning, Afternoon, Evening, or Night when possible.",
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

async function scanWithGemini(base64Image: string): Promise<PrescriptionScanResult> {
  if (!geminiKey) {
    throw new Error(
      "Gemini prescription scanning is not configured. Add VITE_GEMINI_API_KEY for direct mobile OCR or VITE_API_BASE_URL for the MediMait API server."
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
                  "You are MediMait's prescription OCR parser. Read this prescription image carefully and return only valid JSON with doctorName, clinicName, patientName, condition, and medicines. medicines must be an array of objects with name, dosage, timing, duration, instructions, purpose, sideEffects, precautions. Use empty strings when unreadable. Never invent medicines that are not visible. Map timing to Morning, Afternoon, Evening, or Night when possible.",
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
  async scanPrescriptionImage(base64Image: string): Promise<PrescriptionScanResult> {
    try {
      if (hasApiBaseUrl() || !isPackagedAndroidWebView()) {
        return await scanWithServer(base64Image);
      }
      if (geminiKey) return await scanWithGemini(base64Image);
      return await scanWithOpenAI(base64Image);
    } catch (error: any) {
      if (!hasApiBaseUrl() && geminiKey) {
        return scanWithGemini(base64Image);
      }
      if (!hasApiBaseUrl() && openAiKey) {
        return scanWithOpenAI(base64Image);
      }
      console.error("AI scanPrescriptionImage Service Error:", error);
      throw error;
    }
  },
};
