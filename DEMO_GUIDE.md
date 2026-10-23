# StudyMate AI — Demo & Presentation Guide 🎓✨

**College Mini-Project Title:** *AI-Powered Personalized Study Planner and Quiz Generator*  
**Academic Degree / Year:** Undergraduate Computer Science Mini-Project  
**Author / Presenter:** Ritika Shaikh  

---

## 1. Project Objective & Scope

College students frequently struggle with cognitive overload, fragmented study materials, and poor revision scheduling before exams. **StudyMate AI** addresses this challenge through a cohesive, web-based academic companion that provides:
1. **Algorithmic Study Scheduling:** Calculates realistic study timetables based on daily available hours, exam deadlines, topic count, and understanding levels using spaced repetition principles.
2. **AI-Driven Note Summarization:** Condenses dense lecture transcripts and textbook passages into structured study guides (overview, key points, terms with definitions, formulas, and revision takeaways).
3. **Active Recall Quiz Generation:** Formulates grounded practice quizzes directly from notes, pairing each question with Bloom’s taxonomy difficulty levels and pedagogical explanations.
4. **Empirical Learning Analytics:** Tracks syllabus task adherence and quiz mastery performance without fabricating metrics or relying on third-party cloud trackers.
5. **Privacy-Preserving Architecture:** All user data is persisted in browser local storage; AI requests are mediated through a secure server proxy without exposing API credentials to client bundles.

---

## 2. Technologies Actually Used in the Project

Every tool and dependency listed below is actively configured and utilized in this repository:

| Layer | Technology | Purpose in Project |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19.3.1** | Component-based interactive user interface with hooks and pure rendering. |
| **Language** | **TypeScript 6.0.3** | Strict type safety across models, API responses, engines, and UI components. |
| **Build Tool & Dev Server**| **Vite 8.3.5** | High-performance bundling, Hot Module Replacement (HMR), and Connect middleware. |
| **Routing** | **React Router 7.18.4** | Client-side Single Page Application (SPA) routing, layout nesting, and 404 fallback. |
| **Real AI Integration** | **@google/genai 2.30.0** | Official Google GenAI SDK interfacing with `gemini-2.5-flash` on the server. |
| **Icons** | **Lucide React 1.61.0** | Consistent academic and UI iconography throughout navigation, forms, and cards. |
| **Design System** | **Vanilla CSS + Tokens** | Custom design system using CSS variables (Deep Navy `#0B132A`, Violet `#8B5CF6`, etc.). |
| **Data Persistence** | **Browser LocalStorage** | Structured, type-safe client-side storage with corrupted-data error recovery. |
| **Code Quality** | **Oxlint 1.88.0** | Modern, ultra-fast linter validating imports, syntax, and React best practices. |
| **Server Backend** | **Node.js HTTP Server** | Built-in Connect middleware in Vite dev mode & `server/standalone.mjs` for production. |

---

## 3. AI Tools & Distinct Roles

StudyMate AI features a dual-engine architecture designed for reliability and transparency:

```
                                 ┌────────────────────────────────────────────────────────┐
                                 │                   StudyMate AI UI                      │
                                 └───────────────────────────┬────────────────────────────┘
                                                             │
                                        Mode Selection (AI vs Offline Demo)
                                                             │
                           ┌─────────────────────────────────┴─────────────────────────────────┐
                           ▼                                                                   ▼
       ┌───────────────────────────────────────┐                   ┌───────────────────────────────────────┐
       │   Google Gemini 2.5 Flash (Cloud)     │                   │     Local Rule-Based Offline Engine   │
       │   `server/geminiService.ts`           │                   │   `summarizerEngine` & `quizEngine`   │
       ├───────────────────────────────────────┤                   ├───────────────────────────────────────┤
       │ • Deep semantic concept synthesis     │                   │ • Pure TypeScript running in browser  │
       │ • Multilingual & complex prose parsing│                   │ • Sentence segmentation & heuristics  │
       │ • Natural Bloom's taxonomy questions  │                   │ • Factual sentence transformation     │
       │ • Strict JSON schema output via SDK   │                   │ • 100% offline; zero API key required │
       │ • Server-side secret protection       │                   │ • Honestly labeled `isRuleBasedDemo`  │
       └───────────────────────────────────────┘                   └───────────────────────────────────────┘
```

1. **Google Gemini 2.5 Flash (`gemini-2.5-flash`)**:
   - Executes exclusively on the server (`server/geminiService.ts`) via the official `@google/genai` library.
   - Summarizes lecture notes into a structured JSON schema.
   - Generates multiple-choice and true/false questions calibrated to student course difficulty.
   - Extracts verbatim quote evidence from the text to guarantee answers are grounded.
2. **Local Rule-Based Offline Engine**:
   - Executes 100% client-side in TypeScript when an API key is not configured or network access is unavailable.
   - Segments paragraphs, extracts key terminology, and generates questions using structural rules.
   - Transparently flags outputs with an *Offline Engine* badge and sets `isRuleBasedDemo = true` (no fake AI claims).
3. **Study Planner Algorithmic Engine (`services/plannerEngine.ts`)**:
   - A deterministic mathematical engine implementing spaced repetition intervals (Initial Study, Deep Dive, Spaced Revision, Practice Quiz, Final Review).
   - Computes study load feasibility by comparing needed hours against available hours before the target exam date.

---

## 4. How to Run the Website Locally

### Prerequisites
- Node.js (version 18 or later recommended)
- A modern web browser (Chrome, Edge, Firefox, or Safari)

### Quick Start Commands
```bash
# 1. Clone or navigate to the project directory
cd "RITIKA'S AI project"

# 2. Install dependencies
npm install

# 3. (Optional) Configure Google Gemini API key for real AI mode
cp .env.example .env
# Edit .env and paste your Gemini API key:
# GEMINI_API_KEY=AIzaSy...

# 4. Start the development server (includes Vite + server-side AI API router)
npm run dev
```

The application will be live at:
```
http://localhost:5173
```

### Verification & Automated Tests
To run the automated verification suites created during development:
```bash
# Run code linter
npm run lint

# Build production bundle
npm run build

# Run data persistence & storage suite
npm run test:prompt6

# Run AI server & provider integration suite
npm run test:prompt5

# Run study planner algorithmic scheduling suite
npm run test:planner

# Run end-to-end user scenario validation suite
npm run test:scenarios
```

---

## 5. Environment Variables

The project uses a single optional environment variable for cloud AI features. Create a `.env` file in the project root:

```ini
# Google Gemini API Key for real generative AI features
# Obtain a free key at: https://aistudio.google.com/
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Optional: Server port (defaults to 5173 in Vite)
PORT=5173
```

> **Security Note:** Never commit `.env` or real API keys to version control. The repository’s `.gitignore` file automatically excludes all `.env` files. If `GEMINI_API_KEY` is omitted, the application runs smoothly using the local offline engine without crashing.

---

## 6. Two-to-Three Minute Demonstration Script

This step-by-step demonstration showcases the complete end-to-end workflow of the project during an evaluation or college viva.

```
+-----------------------------------------------------------------------------------------------+
| TIMELINE | DEMO STEP                  | ACTION TO PERFORM               | WHAT TO SAY / HIGHLIGHT     |
+----------+----------------------------+---------------------------------+-----------------------------+
| 0:00     | 1. Landing Page & Design   | Open http://localhost:5173      | "StudyMate AI is built with |
|          |                            | Scroll through Hero, Feature    | React 19, TypeScript, and a |
|          |                            | Pillars, and Scientific Method. | custom navy/violet design   |
|          |                            | Click 'Enter Workspace'.        | system focused on cognitive |
|          |                            |                                 | recall science."            |
+----------+----------------------------+---------------------------------+-----------------------------+
| 0:25     | 2. Dashboard Command Center| Show key KPI cards. Note that   | "The dashboard aggregates   |
|          |                            | metrics reflect zero or saved   | real student metrics from   |
|          |                            | data with zero hardcoded fakes. | local storage, showing live |
|          |                            | Click 'Create Study Plan'.      | study tasks and deadlines." |
+----------+----------------------------+---------------------------------+-----------------------------+
| 0:45     | 3. Study Planner Engine    | In Planner, show pre-loaded or  | "The student specifies      |
|          |                            | add two subjects (e.g., OS and  | exam dates, hours, and      |
|          |                            | Machine Learning). Adjust hours | difficulty. The planner     |
|          |                            | and click 'Generate Plan'.      | evaluates timetable         |
|          |                            | Show the Feasibility Report.    | feasibility mathematically."|
+----------+----------------------------+---------------------------------+-----------------------------+
| 1:15     | 4. Interactive Timetable   | Scroll down to the generated    | "Sessions are grouped into  |
|          |    & Task Completion       | schedule. Click the checkmark on| spaced repetition phases.   |
|          |                            | the first task to mark it done. | Notice the Pomodoro station |
|          |                            | Point out the Pomodoro timer.   | for focused intervals."     |
+----------+----------------------------+---------------------------------+-----------------------------+
| 1:40     | 5. Notes Summarizer        | Click 'Summarizer' in navbar.   | "We paste dense lecture     |
|          |                            | Click 'Sample Lecture Notes' to | notes. The engine produces  |
|          |                            | load sample operating systems   | structured key points,      |
|          |                            | text. Click 'Summarize Notes'.  | definitions, formulas, and  |
|          |                            | Show the structured output.     | revision takeaways."        |
+----------+----------------------------+---------------------------------+-----------------------------+
| 2:10     | 6. Shared Notes to Quiz    | In the summary view, click      | "Notes seamlessly flow into |
|          |                            | 'Generate Practice Quiz'.       | the Quiz Generator. Each    |
|          |                            | Select 5 questions, Medium,     | question is paired with a   |
|          |                            | and click 'Generate Quiz'.      | pedagogical explanation and |
|          |                            | Answer questions and submit.    | verified source quote."     |
+----------+----------------------------+---------------------------------+-----------------------------+
| 2:35     | 7. Scoring & Analytics     | Submit the quiz to view score.  | "Client-side scoring shows  |
|          |                            | Click 'Progress' in navbar.     | performance. In Progress,   |
|          |                            | Highlight syllabus adherence vs | syllabus completion is kept |
|          |                            | quiz mastery performance.       | separate from quiz accuracy"|
+----------+----------------------------+---------------------------------+-----------------------------+
| 2:50     | 8. Persistence Check       | Refresh the browser (Cmd/Ctrl+R)| "All progress, marked tasks,|
|          |                            | Verify all metrics and history  | and quiz scores persist in  |
|          |                            | remain intact after reload.     | browser local storage."     |
+-----------------------------------------------------------------------------------------------+
```

---

## 7. Sample Study Notes for Live Demonstration

Copy and paste the text below into the Notes Summarizer during your presentation:

```text
Operating Systems (CS 301): Process Synchronization and Scheduling

An operating system acts as an intermediary between the user of a computer and the computer hardware. The primary purpose of an operating system is to provide an environment in which a user can execute programs in a convenient and efficient manner.

Process Scheduling Algorithms:
1. First-Come, First-Served (FCFS): The process that requests the CPU first is allocated the CPU first. It is non-preemptive and can suffer from the convoy effect, where short processes wait behind long ones.
2. Shortest-Job-First (SJF): Associates with each process the length of its next CPU burst. Optimal in terms of minimizing average waiting time, but difficult to implement because predicting future burst duration requires exponential smoothing.
3. Round Robin (RR): Designed specifically for time-sharing systems. A small unit of time called a time quantum (typically 10 to 100 milliseconds) is defined. The CPU scheduler goes around the ready queue, allocating the CPU to each process for a time interval of up to 1 time quantum. If the time quantum is extremely large, RR degenerates into FCFS; if it is extremely small, context-switch overhead dominates.

The Critical-Section Problem:
A critical section is a piece of code that accesses shared resources, such as variables or files. A valid solution to the critical-section problem must satisfy three fundamental requirements:
1. Mutual Exclusion: If process P is executing in its critical section, no other processes can be executing in their critical sections.
2. Progress: If no process is executing in its critical section and some processes wish to enter, only those processes not in their remainder sections can participate in deciding who enters next.
3. Bounded Waiting: There must be a bound on the number of times other processes are allowed to enter their critical sections after a process has made a request to enter.

Semaphores and Mutex Locks:
A semaphore S is an integer variable accessed only through two standard atomic operations: wait() (historically termed P) and signal() (historically termed V). Binary semaphores behave similarly to mutex locks and range between 0 and 1, whereas counting semaphores can range over an unrestricted domain to control access to a resource pool with multiple instances.
```

---

## 8. Recommended Screenshots for College Report & Slides

Capture the following 9 key views for your mini-project presentation deck and report documentation:

1. **`01_landing_hero.png`**: The landing page hero with deep navy/violet academic typography and badge.
2. **`02_dashboard_overview.png`**: The Dashboard with real-time KPI cards, active tasks, and upcoming deadlines.
3. **`03_planner_configuration.png`**: The Study Planner form with multiple subjects, exam dates, and priority badges.
4. **`04_planner_feasibility_report.png`**: The mathematical feasibility report card showing required vs available hours.
5. **`05_planner_timetable_pomodoro.png`**: The generated timetable cards with task checkmarks and Pomodoro station.
6. **`06_notes_summarizer_cards.png`**: The Summarizer displaying structured Overview, Key Points, Terms, and Takeaways.
7. **`07_quiz_runner_question.png`**: The Quiz question interface showing question options, progress bar, and instant feedback.
8. **`08_quiz_results_score.png`**: The Quiz score breakdown with correct answer badges and pedagogical explanations.
9. **`09_progress_mastery_charts.png`**: The Progress page showing syllabus completion bars and verified quiz history log.

---

## 9. Known Limitations & Troubleshooting

### Limitations
- **Local Storage Scope:** Data is saved in the current browser’s `localStorage`. Data will not synchronize across different physical computers, different browsers, or private/incognito browsing windows.
- **Client Storage Quotas:** Browsers typically allow ~5MB of `localStorage`. StudyMate AI includes error handling for quota overages and a "Clear All Saved Data" button to reset the database if needed.
- **Free Tier Rate Limits (Gemini):** If using a free Google AI Studio key, Google enforces a limit (typically 15 requests per minute). When hit, StudyMate AI displays a non-crashing retry banner and offers the offline engine option.
- **Offline Quiz Scope:** The local rule-based offline engine generates questions from grammatical patterns in notes. For highly complex cross-disciplinary reasoning, configuring the Gemini API key is recommended.

### Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Google Gemini API key is missing on server"** | No `.env` file or key is not set. | The app automatically uses the Local Offline Engine. To enable cloud AI, copy `.env.example` to `.env` and add a valid `GEMINI_API_KEY`. |
| **Port 5173 is already in use** | Another local dev server is running. | Vite will automatically offer port 5174, or run `npm run dev -- --port 5180`. |
| **"Corrupt data" in browser storage** | Stale data from previous development. | Open Dashboard, scroll to the bottom privacy card, and click **Clear All Saved Data**. |
| **Task checkmarks don't update on other tabs** | Browser tab event synchronization delay. | StudyMate AI emits a custom `studymate_data_changed` event and listens to `storage` events; refresh the tab to force immediate re-read. |
| **Build fails with type error** | Modified types without updating components. | Run `npm run build` or `npx tsc --noEmit` to inspect the exact file and line number. |

---

## 10. Student Declaration & Verification

- **Code Integrity:** All source files, styles, algorithmic engines, and server middleware were developed specifically for this project.
- **No Fabricated Data:** Statistics displayed in the Dashboard and Progress views reflect actual persisted actions taken by the user.
- **Security Compliance:** Zero secrets or credentials exist in frontend client code or public git history.
- **Autonomous Test Status:** All 4 verification test suites (`test:prompt6`, `test:prompt5`, `test:planner`, `test:scenarios`) pass with 0 errors.
