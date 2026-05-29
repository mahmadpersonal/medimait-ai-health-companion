![MediMait Banner](https://i.ibb.co/39pppVdh/your-image-name.png)

# MediMait - AI Health Companion

MediMait is a mobile-first healthcare companion built to make prescription management easier for families. The app scans prescription images, extracts medicine details with AI OCR, organizes medical records by profile, schedules pill reminders, and provides a safety-aware health chat assistant.

> Friendly health guidance only. MediMait is not a diagnostic tool and does not replace a doctor, pharmacist, or emergency care.

## Highlights

- Prescription scanning with Gemini OCR
- Medicine extraction for dosage, timing, duration, instructions, purpose, side effects, and precautions
- Pill reminder scheduling with Android local notifications
- Medical files and profile-based record management
- MediBot chat assistant powered by OpenAI GPT-4o-mini
- Saved-profile and saved-record context support for more personalized responses
- Phone-first UI packaged as an Android app with Capacitor
- Backend proxy design to keep AI API keys out of the APK

## Product Screens

- Scan: capture or upload prescription images and review extracted medicines
- Pills: manage reminders by selected weekdays and timing groups
- Files: save, edit, view, and delete prescription records
- Chat: ask MediBot about medicines, symptoms, and care guidance
- Me: manage personal and family health profiles

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Mobile packaging: Capacitor Android
- Backend: Express, Node.js
- AI OCR: Google Gemini 2.5 Flash Lite
- AI chat: OpenAI GPT-4o-mini
- Storage: browser localStorage for local app data
- Notifications: Capacitor Local Notifications
- Deployment: Render-ready Node web service

## Architecture

The Android app runs a Capacitor-wrapped Vite frontend. AI requests are routed through the deployed Express backend so production API keys remain server-side.

```text
Android APK
  -> Capacitor WebView
  -> React/Vite app
  -> Express API backend
  -> Gemini OCR / OpenAI Chat APIs
```

## Security Notes

- Real API keys should be configured as backend environment variables.
- Do not hardcode OpenAI or Gemini keys into the mobile APK.
- `.env` files are intentionally ignored by Git.
- The backend accepts mobile app requests from the Capacitor origin.

## Environment Variables

Create a `.env` file locally or configure these variables in your deployment platform:

```env
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"
GEMINI_VISION_MODEL="gemini-2.5-flash-lite"
NODE_ENV="production"
ALLOWED_ORIGINS="https://localhost,http://localhost:3000,http://localhost:5173"
VITE_API_BASE_URL="https://your-backend-url.example.com"
```

## Local Development

```bash
npm install
npm run dev
```

The development server runs the Express API and Vite app together.

## Production Build

```bash
npm run build
npm start
```

## Android Build

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Deployment

This repository includes `render.yaml` for Render deployment. Add the required secret environment variables in Render before deploying.

## Portfolio Summary

MediMait demonstrates a full-stack, AI-assisted mobile health workflow: OCR extraction, medical record organization, reminder scheduling, contextual chat, backend API security, and native Android packaging from a React/Vite codebase.
