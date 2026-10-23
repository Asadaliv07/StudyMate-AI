# StudyMate AI 🎓✨

> **Your Intelligent Academic Co-Pilot**  
> A browser-based educational SaaS platform engineered with React, TypeScript, and modern academic design principles.

---

## 🏛️ Overview & Design System

**StudyMate AI** is designed around cognitive science and active recall principles. It combines a deep navy primary palette (`#0B132A`), subtle violet accents (`#8B5CF6`), clean neutral backgrounds (`#F8FAFC`), modern typography (*Plus Jakarta Sans*), rounded cards, and restrained ambient shadows.

### Core Modules
1. **Home (`/`)**: Landing page with hero showcase, cognitive science pillars, and interactive module preview tabs.
2. **Dashboard (`/dashboard`)**: Student mission control with study streak tracking, upcoming high-yield tasks, recent note condensations, and quiz shortcuts.
3. **Study Planner (`/planner`)**: Spaced-repetition study session scheduler, interactive 25m/5m Pomodoro focus timer, and exam countdown tracker.
4. **Notes Summarizer (`/summarizer`)**: Lecture transcript condensation engine with format selectors (bullet points, flashcards, concept maps), word-count compression stats, and instant copy/export.
5. **Quiz Generator (`/quiz`)**: Active recall simulator with Bloom's taxonomy difficulty tags, interactive question runner, instant rationale explanations, and score tracking.
6. **Progress Analytics (`/progress`)**: Ebbinghaus forgetting curve modeling, course syllabus mastery bars, weekly velocity chart, and cognitive decay alerts.
7. **Custom 404 (`/404` or unknown routes)**: Academic-themed fallback page guiding scholars back to active curriculum modules.

---

## 📁 Project Architecture

```
ritika-s-ai-project/
├── index.html                   # HTML entry with Google Fonts & StudyMate meta
├── package.json                 # React 19, TypeScript, React Router 7, Lucide Icons
├── vite.config.ts               # Vite build configuration
├── src/
│   ├── main.tsx                 # Application bootstrap & global style imports
│   ├── App.tsx                  # RouterProvider root component
│   │
│   ├── router/
│   │   └── index.tsx            # react-router-dom route tree & 404 fallbacks
│   │
│   ├── layouts/
│   │   ├── RootLayout.tsx       # Shared layout (sticky Navbar, content Outlet, Footer)
│   │   └── RootLayout.css
│   │
│   ├── pages/
│   │   ├── Home/                # Marketing landing & interactive showcase
│   │   ├── Dashboard/           # Student command center & prioritized queue
│   │   ├── Planner/             # Spaced-repetition planner & Pomodoro timer
│   │   ├── Summarizer/          # AI note synthesis & key takeaway viewer
│   │   ├── Quiz/                # Active recall question runner & quiz bank
│   │   ├── Progress/            # Retention curves & weekly velocity charts
│   │   └── NotFound/            # Custom 404 error page
│   │
│   ├── components/
│   │   ├── common/              # Button, Card, Badge, SectionHeader, StatCard
│   │   └── navigation/          # Navbar (desktop + mobile drawer), Footer
│   │
│   ├── hooks/
│   │   ├── useMediaQuery.ts     # Viewport breakpoints (mobile, tablet, desktop)
│   │   └── useLocalStorage.ts   # Safe typed client-side storage hook
│   │
│   ├── services/
│   │   ├── api.ts               # Base API architecture & response envelope
│   │   └── studyService.ts      # Study items, course quizzes, and analytics data
│   │
│   ├── types/
│   │   └── index.ts             # Domain interfaces (Tasks, Summaries, Quizzes, Profile)
│   │
│   ├── utils/
│   │   ├── constants.ts         # Brand configs, routes, mock student profile
│   │   └── formatters.ts        # Date, time duration, and percentage formatting
│   │
│   └── styles/
│       ├── tokens.css           # Academic CSS design tokens & CSS variables
│       └── globals.css          # CSS reset, typography scale, buttons, card system
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (version 18 or later recommended)
- npm or yarn

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

### 4. Build for Production
To validate TypeScript types and build optimized production assets:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 🤖 Real AI Integration & Server Architecture (Google Gemini)

StudyMate AI integrates server-side artificial intelligence powered by **Google Gemini 2.5 Flash** (`gemini-2.5-flash`), replacing rule-based heuristics for notes summarization and practice quiz generation while preserving offline local fallbacks.

### 🛡️ Security Architecture & Secret Protection
- **Server-Side Execution Only**: All calls to the Google GenAI SDK are executed exclusively on the server (`server/geminiService.ts`).
- **Zero Frontend Secret Leaks**: The frontend client bundles (`dist/assets/*.js`) contain **no** API keys, no `VITE_` exposed secrets, and no credentials.
- **Environment Isolation**: Keys are loaded via server-side Node `process.env`.
- **Git Exclusions**: The `.gitignore` file strictly excludes `.env`, `.env.local`, `.env.*.local`, and `*.env`.
- **Request Guards**: Input length is strictly enforced (minimum 20 characters, maximum 25,000 characters) to prevent cost spikes and denial of service.
- **Prompt Injection Defense**: User notes are wrapped in untrusted data boundaries with system instructions forbidding override commands.
- **Secret Redaction**: Any error returned by the server automatically scrubs potential Google API key patterns (`AIza...`) before reaching the client.

---

### 🔑 Getting an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google Account.
3. Click **"Get API key"** and select **"Create API key"** in a new or existing Google Cloud project.
4. Copy the generated key.

---

### ⚙️ Local Environment Configuration

1. Copy the provided `.env.example` template:
```bash
cp .env.example .env
```

2. Open `.env` and set your configuration (using placeholder format):
```env
# Google Gemini API Key (keep this strictly private)
GEMINI_API_KEY=your_gemini_api_key_here

# Model identifier (defaults to gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Application Port
PORT=5173
```

> [!NOTE]
> If `GEMINI_API_KEY` is not present, StudyMate AI will run gracefully in **Fallback Demo Mode**. It will never crash, and the user interface clearly displays an honest badge indicating when results are generated via the local rule-based engine.

---

### 🧪 Testing the AI Integration

#### 1. Testing AI Notes Summarizer (`/summarizer`)
- Navigate to `/summarizer`.
- Select one of the pre-loaded academic samples (e.g., *Attention is All You Need* or *Raft Consensus*) or paste your own notes.
- Select the **"✨ Google Gemini 2.5 Flash"** engine toggle.
- Click **"Summarize Notes"**.
- The server will return a structured, grounded summary with:
  - Concise academic overview.
  - Main ideas & key points.
  - Term definitions grounded in the text.
  - Empirical facts, formulas, and discovery dates.
  - Revision takeaways.
- Notice the **`✨ Powered by Gemini 2.5 Flash · Server Verified`** badge confirming live AI generation.

#### 2. Testing AI Quiz Generator (`/quiz`)
- Forward notes from the summarizer or paste notes directly in `/quiz`.
- Configure difficulty (*Easy*, *Medium*, *Hard*) and question type (*Mixed*, *Multiple Choice*, *True/False*).
- Click **"Generate Practice Quiz"**.
- The server generates grounded practice questions with 4 distinct options (MCQ) or boolean options (T/F).
- Take the quiz: answer checking and final score calculation remain strictly **client-side** in React, ensuring zero answer leaks before submission.

#### 3. Testing Without Credentials (Offline & Missing Key Path)
- If `.env` is omitted or contains an empty key, the application displays a friendly setup notice:
  - *"GEMINI_API_KEY is not configured on the server."*
  - Provides a 1-click **"Use Rule-Based Demo Instead"** fallback button so students are never blocked.
  - Displays a clean 4-step setup checklist.

---

### 📋 Feature Engine Matrix

| Feature | Primary Engine | Fallback Engine | Notes |
| :--- | :--- | :--- | :--- |
| **Notes Summarizer** | Google Gemini 2.5 Flash | Rule-Based NLP Engine | User can toggle engines freely |
| **Quiz Generator** | Google Gemini 2.5 Flash | Rule-Based Fact Extractor | Answers verified client-side |
| **Study Planner** | Algorithmic Scheduler | Local Storage Persisted | Deterministic spaced-repetition logic |
| **Progress Analytics** | Local Client Engine | Browser Storage | Ebbinghaus decay simulation |

---

### 🔬 Automated Verification Suites

Run the automated verification scripts to validate all feature milestones:

```bash
# Verify Prompt 6: End-to-end persistent data, progress tracking, and integration (12-step sequence)
npm run test:prompt6

# Verify Prompt 5: AI server endpoints, security, secret non-leakage, and validation
npm run test:prompt5

# Verify Prompt 4: Summarizer and quiz scenarios (grounding, capacity limits, scoring)
npm run test:scenarios

# Verify Prompt 3: Study planner constraints, feasibility, and timetable generation
npm run test:planner
```

---

## 💾 Data Persistence & Privacy Model (Prompt 6)

### Centralized Storage Architecture (`src/services/storageService.ts`)
- **Single Source of Truth:** All modules (Study Planner, Notes Summarizer, Quiz Generator, Dashboard, and Progress) interact through `storageService.ts`.
- **Event-Driven Reactivity:** Storage updates dispatch a custom `studymate_data_changed` event and native `storage` events. When a student marks a task done on the Planner or completes a quiz on the Quiz page, Dashboard and Progress metrics refresh immediately without needing a page reload.
- **Stable IDs:** Notes, quizzes, and tasks use permanent unique IDs. Editing an existing note updates its record in-place rather than creating duplicate entries.
- **Client-Side Scoring Integrity:** Quiz answers are evaluated and scored strictly on the client; correct answers are never revealed before submission, nor does the application rely on external AI for scoring calculation.
- **Real Metrics Only:** Dashboard and Progress statistics (active plans, completion rates, upcoming exam deadlines, quiz mastery averages) are calculated entirely from stored user records. Zero fake or hardcoded stats.
- **Privacy & Security:**
  - Academic records are preserved solely in the student's browser via `localStorage`.
  - No personal data or credentials are submitted to external analytics or databases.
  - No API keys or secrets are ever saved in `localStorage`.
  - Students can review, delete individual notes/quizzes, or use the **"Clear All Saved Data"** action to wipe local storage cleanly.

