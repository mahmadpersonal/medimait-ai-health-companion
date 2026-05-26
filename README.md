# TediMed - Phone-First Healthcare Companion

TediMed is a smooth, premium, mobile-first health companion web application designed for families and users. It lets users scan prescriptions via Gemini OCR, structure instructions into everyday plain words, schedule pill reminders, create profiles and files, and chat with an AI health advisor powered by OpenAI GPT-4o-mini.

## Main Key Features

1. **Scan Prescriptions**: Easily upload images of handwriting or printed medicine sheets and dissect names, timing groups, treatment durations, simple purposes, actions, warning lists, and precautions.
2. **Pill Tracker/Box**: Reminds users to take medications categorized across morning, afternoon, evening, and night slots.
3. **Medical Files**: Consolidates multiple scanned prescriptions as local cards searchable and filterable by doctor, date, or profile.
4. **General ChatBot**: Compassionate medical guide bot utilizing OpenAI to detail conditions, side-effects, or simple terms safely under rigid safety guards.
5. **Me Profiles**: Manage custom family profiles (Myself, Father, Mother, Other) with distinct ages, allergies, and preconditions.

---

## Technical Specifications

The application uses **React, TypeScript, Vite, and Tailwind CSS (v4)**, with a customized **Express Backend** proxy to keep sensitive AI API Keys completely hidden from client bundle queries.

- **Vite SPA Frontend Mode**
- **Express Backend Server**
- **Google GenAI SDK** for scanning
- **OpenAI gpt-4o-mini API Interface** for clinical guidance

---

## Setup Instructions

Ensure you have [Node.js (v18+)](https://nodejs.org/) installed inside your workspace.

### 1. Configure the Secrets (Environment Variables)

Create `.env` file at the root or add the following keys inside AI Studio Secrets tab:

```env
VITE_GEMINI_API_KEY="your-google-gemini-key"
VITE_OPENAI_API_KEY="your-openai-api-key"
```

### 2. Installations

Execute package dependency downloads:

```bash
npm install
```

### 3. Execution (Development Dev Mode)

Run the local development Express + Vite multi-port cluster:

```bash
npm run dev
```

The application will bind onto port **3000** automatically.

### 4. Build Strategy

Compile both TypeScript frontend static layers and esbuild Node CommonJS server routines:

```bash
npm run build
npm start
```
