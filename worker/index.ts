export interface Env {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_VISION_MODEL?: string;
  OPENAI_CHAT_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_ALLOWED_ORIGINS = "https://localhost,http://localhost:3000,http://localhost:5173";

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
    },
  });
}

function extractImageData(image: string) {
  let base64Data = image;
  let mimeType = "image/jpeg";

  if (image.startsWith("data:")) {
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  return { base64Data, mimeType };
}

function normalizeGeminiJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeScanPayload(payload: any) {
  if (Array.isArray(payload)) {
    return { medicines: payload };
  }

  if (payload && !Array.isArray(payload.medicines) && payload.name) {
    return { medicines: [payload] };
  }

  return {
    ...payload,
    medicines: Array.isArray(payload?.medicines) ? payload.medicines : [],
  };
}

async function handleScanPrescription(request: Request, env: Env) {
  if (!env.GEMINI_API_KEY) {
    return jsonResponse(request, env, {
      error: "Missing API Key",
      message: "Gemini API key is not configured on the Cloudflare Worker.",
    }, 403);
  }

  const { image } = await request.json() as { image?: string };
  if (!image) {
    return jsonResponse(request, env, { error: "No image provided" }, 400);
  }

  const { base64Data, mimeType } = extractImageData(image);
  const model = env.GEMINI_VISION_MODEL || "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${env.GEMINI_API_KEY}`;

  const prompt = [
    "You are MediMait's prescription OCR parser.",
    "Read this prescription image carefully and return only valid JSON.",
    "Return doctorName, clinicName, patientName, condition, and medicines.",
    "medicines must be an array of objects with name, salt, dosage, timing, duration, instructions, purpose, sideEffects, precautions.",
    "name is the visible brand/medicine name. salt is the generic ingredient/composition if visible or confidently inferable from the medicine name; otherwise empty.",
    "Extract every visible medicine or prescribed item, with no maximum count.",
    "Use empty strings when unreadable. Never invent medicines that are not visible.",
    "Map timing to Morning, Afternoon, Evening, or Night when possible.",
    "For purpose, use simple everyday words.",
  ].join(" ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return jsonResponse(request, env, {
      error: "Scanning failed",
      message: errorBody?.error?.message || `Gemini request failed with status ${response.status}`,
    }, 500);
  }

  const result = await response.json() as any;
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return jsonResponse(request, env, {
      error: "Scanning failed",
      message: "Gemini returned an empty OCR response.",
    }, 500);
  }

  try {
    return jsonResponse(request, env, normalizeScanPayload(JSON.parse(normalizeGeminiJson(text))));
  } catch (error: any) {
    return jsonResponse(request, env, {
      error: "Scanning failed",
      message: error?.message || "Could not parse Gemini OCR JSON.",
    }, 500);
  }
}

function systemPrompt(contextData?: unknown) {
  return `You are MediBot, the warm and practical health assistant inside MediMait.
Your goal is to explain medicines, offer care tips, explain potential symptoms, and guide normal people in simple words.

Critical safety rules:
1. Do not diagnose with absolute certainty.
2. Do not tell users to start, stop, or change prescription medicine without doctor or pharmacist approval.
3. For severe symptoms such as chest pain, breathing difficulty, severe allergic reaction, severe bleeding, confusion, fainting, one-sided weakness, or very high/persistent fever, advise urgent medical care immediately.
4. Keep answers short, useful, and easy to read on a phone.
5. Do not use markdown symbols, asterisks, hashtags, tables, or code formatting.
6. Use simple labels when useful: Summary, What it could mean, What to do, Watch out, When to seek care.
7. Answer the exact question first.

${contextData ? `User-permitted saved context:\n${JSON.stringify(contextData, null, 2)}` : "No saved medical record context was shared."}

End with one short sentence: Friendly guidance only, not a diagnosis.`;
}

async function handleChat(request: Request, env: Env) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(request, env, {
      error: "Missing API Key",
      message: "OpenAI API key is not configured on the Cloudflare Worker.",
    }, 403);
  }

  const { messages, contextData } = await request.json() as { messages?: any[]; contextData?: unknown };
  if (!Array.isArray(messages)) {
    return jsonResponse(request, env, { error: "Invalid messages array" }, 400);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt(contextData) },
        ...messages.map((message) => ({
          role: message.sender === "user" ? "user" : "assistant",
          content: message.text,
        })),
      ],
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return jsonResponse(request, env, {
      error: "Chat failed",
      message: errorBody?.error?.message || `OpenAI request failed with status ${response.status}`,
    }, 500);
  }

  const result = await response.json() as any;
  return jsonResponse(request, env, {
    reply: result?.choices?.[0]?.message?.content || "I could not generate a response this time.",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/") {
        return new Response("MediMait API is running on Cloudflare Workers.", {
          headers: {
            "Content-Type": "text/plain",
            ...corsHeaders(request, env),
          },
        });
      }

      if (url.pathname === "/api/scan-prescription" && request.method === "POST") {
        return handleScanPrescription(request, env);
      }

      if (url.pathname === "/api/chat" && request.method === "POST") {
        return handleChat(request, env);
      }

      return jsonResponse(request, env, { error: "Not found" }, 404);
    } catch (error: any) {
      return jsonResponse(request, env, {
        error: "Server error",
        message: error?.message || "Unexpected Cloudflare Worker error.",
      }, 500);
    }
  },
};
