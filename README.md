# PLC Frontend - AI-Powered Ladder Logic Generator

An intelligent IDE for converting natural language automation descriptions into Mitsubishi PLC ladder logic diagrams using AI. Built with Next.js and powered by Groq's LLaMA API for real-time logic generation.

## 🎯 What This Project Does

This application is a **development environment for PLC programmers** that:
- Converts **natural language descriptions** (e.g., "Start motor on X0, stop on X1") into **structured ladder logic**
- Generates **visual diagrams** showing the logic flow
- Provides **code explanations** so developers understand what the AI generated
- Exports to **industry-standard formats** (PLCopen XML, GX Works CSV)
- Runs **locally with security** (rate limiting, input validation, secure API handling)

## ✨ Current Features

- 🤖 **AI-powered ladder logic generation** using Groq LLaMA 3.3 70B
- 🔌 **Visual ladder diagram rendering** with real-time updates
- 📝 **Real-time syntax explanation** and instruction breakdown
- 📊 **Export capabilities** to PLCopen XML and GX Works CSV formats
- 🎨 **Dark/Light theme support** for comfortable development
- 🔒 **Enterprise-grade security** with rate limiting and input validation
- ⚡ **Fast responses** with 30s timeout optimization for AI calls





**⚠️ Security Note:** `.env.local` is in `.gitignore` — never commit API keys to git.

### Step 3: Verify Setup

```bash
# Start development server
npm run dev

# You should see:
# > Local:        http://localhost:3000
# Ready in X.XXXs
```


## 🔐 API Security & Architecture

### How Requests Flow Through the System

```
Frontend (Input Text)
    ↓
useGenerateLogic Hook (React Query)
    ↓
POST /api/generate-logic
    ↓
apiMiddleware.ts (Validation & Rate Limiting)
    ↓
Groq LLaMA API (AI Processing)
    ↓
Response → State Management (Zustand)
    ↓
UI Components (LadderPreview, ExplanationPanel, OutputConsole)
```

### Security Implementation

**Rate Limiting** ([apiMiddleware.ts](src/lib/apiMiddleware.ts))
- Per-IP rate limit: 10 requests per minute
- Tracks unique client IPs using `x-forwarded-for` header
- In-memory store resets based on `API_RATE_WINDOW_MS`

**Input Validation**
- Content-Type enforcement: Only `application/json` accepted
- Max payload size: 5,000 characters per request
- Prevents malformed or oversized inputs from reaching Groq API

**API Key Protection**
- Groq API key stored **only in `.env.local`** (not committed to git)
- Private Next.js route ([route.ts](src/app/api/generate-logic/route.ts)) ensures key never exposed to client
- Never logged or transmitted in error messages

**Error Handling**
- Detailed errors logged server-side for debugging
- Generic errors returned to client (no sensitive info leaked)
- Timeout: 30 seconds for Groq API calls

### POST /api/generate-logic

**Authentication:** Private route (Groq API key required, stored server-side)

**Request Format:**
```json
{
  "input": "Start motor when X0 is pressed. Stop on X1 release. Emergency stop X2."
}
```

**Success Response (200 OK):**
```json
{
  "ladder": [
    { "type": "contact", "label": "X0" },
    { "type": "contact_nc", "label": "X1" },
    { "type": "contact_nc", "label": "X2" },
    { "type": "coil", "label": "Y0" }
  ],
  "explanation": "- X0: Normally open (start button)\n- X1: NC contact (stop button)\n- Y0: Output to motor",
  "instructionList": "LD X0\nANI X1\nANI X2\nOUT Y0\nEND"
}
```

**Error Response (400/429/500):**
```json
{
  "error": "Rate limit exceeded. Max 10 requests per minute."
}
```

| Status | Reason |
|--------|--------|
| 400 | Invalid Content-Type or input too long |
| 429 | Rate limit exceeded |
| 500 | Groq API error or malformed response |

## 📁 Project Structure & Developer Guide

### Core Entry Points

| File | Purpose |
|------|---------|
| [src/app/page.tsx](src/app/page.tsx) | Main UI page - renders the IDE layout |
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout with Ant Design provider setup |
| [src/app/globals.css](src/app/globals.css) | Global styles and CSS variables |

### Key Modules Explained

#### **State Management** ([src/store/](src/store/))
Uses **Zustand** for lightweight global state:

| File | Responsibilities |
|------|------------------|
| [plcStore.ts](src/store/plcStore.ts) | Stores ladder data, explanation, instruction list, loading states, and errors |
| [themeStore.ts](src/store/themeStore.ts) | Manages dark/light theme toggle |

**Example - Reading state in a component:**
```typescript
import { usePlcStore } from '@/store/plcStore';

function MyComponent() {
  const { ladderData, explanation, isLoading } = usePlcStore();
  return <div>{explanation}</div>;
}
```

#### **Type Definitions** ([src/types/](src/types/))

Centralized type definitions for all PLC structures:

| File | Purpose |
|------|---------|
| [ladder.ts](src/types/ladder.ts) | Core PLC domain types: `LadderBlock`, `LadderRung`, `LadderProject`, `Tag` |

**Example - Using types safely:**
```typescript
import type { LadderBlock, LadderProject, Tag } from '@/types/ladder';

const block: LadderBlock = {
  id: "contact_1",
  type: "contact",
  label: "X0"
};
```

#### **Validation & Parsing Services** ([src/services/](src/services/))

| File | Purpose |
|------|---------|
| [plcApi.ts](src/services/plcApi.ts) | Axios client for `/api/generate-logic` endpoint |
| [aiService.ts](src/services/aiService.ts) | AI integration with full error handling and HTTP status code mapping |
| [ladderParser.ts](src/services/ladderParser.ts) | Type-safe JSON validation and parsing from AI responses |

**Error Handling Strategy:**
```typescript
// aiService handles:
- HTTP errors (400, 401, 403, 500, 503)
- Network failures with descriptive messages
- API response validation

// ladderParser validates:
- Block types and structure
- Rung integrity
- Project completeness
```

#### **React Hooks** ([src/hooks/](src/hooks/))

| File | Purpose |
|------|---------|
| [useGenerateLogic.ts](src/hooks/useGenerateLogic.ts) | React Query mutation hook that handles AI request lifecycle |

**Usage in components:**
```typescript
import { useGenerateLogic } from '@/hooks/useGenerateLogic';

function Editor() {
  const { mutate, isPending } = useGenerateLogic();
  
  const handleGenerate = (text: string) => {
    mutate(text); // Triggers API call, updates store on success
  };
}
```

#### **UI Components** ([src/components/](src/components/))

| Component | Responsibility |
|-----------|-----------------|
| [InstructionEditor.tsx](src/components/editor/InstructionEditor.tsx) | Text input field where users describe their logic |
| [LadderPreview.tsx](src/components/ladder/LadderPreview.tsx) | Renders the visual ladder diagram |
| [ExplanationPanel.tsx](src/components/explanation/ExplanationPanel.tsx) | Shows AI's explanation of the generated logic |
| [OutputConsole.tsx](src/components/console/OutputConsole.tsx) | Displays exported code and debug info |

#### **Layouts** ([src/layout/](src/layout/))

| File | Purpose |
|------|---------|
| [IDELayout.tsx](src/layout/IDELayout.tsx) | Main IDE layout: splits screen into editor, preview, and console |

#### **API Route** ([src/app/api/](src/app/api/))

| File | Purpose |
|------|---------|
| [route.ts](src/app/api/generate-logic/route.ts) | Next.js API handler - receives text, validates, calls Groq, returns structured ladder logic |

The API route:
1. Validates incoming requests using [apiMiddleware.ts](src/lib/apiMiddleware.ts)
2. Calls Groq LLaMA API with system prompt
3. Validates response using [ladderParser.ts](src/services/ladderParser.ts)
4. Returns typed `LadderBlock[]` matching schema in [src/types/ladder.ts](src/types/ladder.ts)

#### **Utilities & Schema** ([src/utils/](src/utils/) & [src/schema/](src/schema/))

| File | Purpose |
|------|---------|
| [exportUtils.ts](src/utils/exportUtils.ts) | Converts ladder logic to PLCopen XML and GX Works CSV |
| [exportLadder.ts](src/lib/exportLadder.ts) | Additional export helpers |
| [src/schema/](src/schema/) | JSON schema definitions for validation (reserved for future use) |

### Directory Consolidation ✅

This project has been **fully consolidated** into a single, clean architecture (March 2026):

## 🛠️ Patch Update (April 1, 2026)

- Fixed a build error in `src/components/ladder/LadderPreview.tsx`: removed duplicate `contacts` and `coil` declarations in `LadderRung()`.
- Fixed a build error in `src/utils/exportUtils.ts`: removed duplicate `now` and `rungs` declarations in `buildPLCopenXML()`.
- Verifies successful compilation and full feature flow for ladder generation, rendering, and export.


**What was merged:**
- ✅ Moved all PLC type definitions to `src/types/ladder.ts`
- ✅ Consolidated AI services into `src/services/aiService.ts`
- ✅ Added validation layer with `src/services/ladderParser.ts`
- ✅ Unified import paths to use `@/types` for all types
- ✅ Removed duplicate src/ folders and modules

**Benefits:**
- Single source of truth for all types
- Better code organization and maintainability
- Improved build performance (10s with Turbopack)
- 100% TypeScript strict mode compliance
- Production-ready architecture

**Import pattern (use throughout project):**
```typescript
// ✅ CORRECT - Use centralized types
import type { LadderBlock, LadderProject } from '@/types/ladder';
import { parseLadderFromAI } from '@/services/ladderParser';

// ❌ AVOID - Type mixing from different locations
import { generateLogic } from '@/services/plcApi';
// Direct use is fine, but always import types from @/types/ladder
```

### Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend Framework** | Next.js 16.1.6, React 19.2.3, TypeScript 5 (strict mode) |
| **UI Library** | Ant Design 6.3.1 + Tailwind CSS 4 |
| **State Management** | Zustand 5.0.11 |
| **HTTP Client** | Axios 1.13.5 |
| **Data Fetching** | TanStack React Query 5.90.21 |
| **AI Backend** | Groq LLaMA 3.3 70B |
| **Styling** | Tailwind CSS 4 + Ant Design themes |
| **Dev Tools** | ESLint 9, PostCSS 4, Turbopack |
| **Validation** | Full type safety with centralized type definitions |

## 🚀 Available Scripts

```bash
# Start development server (with hot reload)
npm run dev
# → Runs on http://localhost:3000

# Build for production
npm run build
# → Creates .next optimized build folder

# Start production server
npm start
# → Serves the built app (requires npm run build first)

# Run ESLint to check code quality
npm run lint
# → Reports any code quality issues
```

## 👨‍💻 Developer Workflows

### Adding a New Component

1. Create file in `src/components/category/ComponentName.tsx`
2. Use Zustand store to read global state with type safety:
   ```typescript
   import { usePlcStore } from '@/store/plcStore';
   import type { LadderBlock } from '@/types/ladder';
   
   export function MyComponent() {
     const { ladderData } = usePlcStore();
     const blocks: LadderBlock[] = ladderData;
     return <div>{/* component JSX */}</div>;
   }
   ```
3. Import types from `@/types/ladder` for full type safety
4. Add to `IDELayout.tsx` to display it

### Creating a New Service

All services should use types from `@/types/ladder`:

```typescript
// In src/services/myService.ts
import type { LadderProject, Tag } from '@/types/ladder';
import { parseLadderFromAI } from '@/services/ladderParser';

export async function myOperation(data: unknown): Promise<LadderProject> {
  // Validate and parse using centralized validator
  const validated = parseLadderFromAI(data);
  return validated;
}
```

### Modifying the AI System Prompt

The AI instructions live in [src/app/api/generate-logic/route.ts](src/app/api/generate-logic/route.ts):
- Edit the `SYSTEM_PROMPT` variable to change how LLaMA responds
- Ensure response matches `LadderBlock[]` type in [src/types/ladder.ts](src/types/ladder.ts)
- Response will be validated by [src/services/ladderParser.ts](src/services/ladderParser.ts)
- **Test after changes:** Use the UI to regenerate logic and verify it validates

### Adding Export Formats

1. Create new export function in [src/utils/exportUtils.ts](src/utils/exportUtils.ts)
2. Use `LadderProject` type from `@/types/ladder` for type safety
3. Call it from `OutputConsole` component
4. Add export button to the UI

### Debugging AI Responses

**Check what the AI actually returned:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Trigger logic generation
4. Find the `/api/generate-logic` request
5. View **Response** tab to see raw JSON
6. Look at **Console** for error messages from [src/services/aiService.ts](src/services/aiService.ts)

**Common issues & solutions:**

| Issue | Cause | Check |
|-------|-------|-------|
| **Empty ladder array** | AI returned invalid structure | [aiService.ts](src/services/aiService.ts) logs for validation errors |
| **Malformed JSON** | AI returned non-JSON | Check Groq API status and system prompt |
| **Type validation fails** | Missing required fields | [ladderParser.ts](src/services/ladderParser.ts) shows which field failed |
| **Missing explanation** | Incomplete API response | Groq API quota exceeded or service error |

## 📚 PLC Reference Guide

### Addressing Convention (Mitsubishi FX series)

| Address | Type | Range | Example | Use Case |
|---------|------|-------|---------|----------|
| X | Input | X0 to X377 | X0, X255 | Digital sensors, buttons, switches |
| Y | Output | Y0 to Y377 | Y0, Y100 | Motors, solenoids, lamps, relays |
| M | Internal Relay | M0 to M9999 | M0, M5000 | Flags, timers, intermediate logic |

### Ladder Block Types

| Type | Symbol | Instruction | When to Use |
|------|--------|-------------|------------|
| `contact` | `-\| \|-` | LD / AND | Normally Open (NO) - active when sensor ON |
| `contact_nc` | `-\|/\|-` | LDI / ANI | Normally Closed (NC) - active when sensor OFF |
| `coil` | `-( )-` | OUT | Output coil - energized when rung is true |

### Example Ladder Logic

**Natural Language:**
```
Start the motor (Y0) when button X0 is pressed.
Stop when button X1 is released.
Emergency stop X2 disables everything.
```

**Ladder Diagram:**
```
X0 ─┬─ X1NCI ─┬─ X2NCI ─┬─ Y0
    │         │         │
    └─────────┴─────────┘
```

**Instructions (GX Works):**
```
LD   X0      (Load X0 - start button)
ANI  X1      (AND NOT X1 - stop button)
ANI  X2      (AND NOT X2 - emergency stop)
OUT  Y0      (Output to Y0 - motor)
END          (End of program)
```

### Writing Effective Prompts for the AI

**✅ Good prompts:**
- "Start motor on X0. Stop on X1. Emergency stop X2 to Y0."
- "When temperature sensor X50 activates, turn on cooling fan Y100"
- "Limit switch X30 enables valve Y30. Disable with X31."

**❌ Avoid:**
- "Make some logic" (too vague)
- "Start the thing when the other thing happens" (unclear addresses)
- Multiple unrelated operations (keep it to one rung)

## 🐛 Troubleshooting Guide

### Setup & Installation Issues

| Problem | Solutions |
|---------|-----------|
| `npm install` fails | Clear cache: `npm cache clean --force` then retry |
| Module not found errors | Restart dev server (`npm run dev`) |
| Port 3000 already in use | Kill process: `lsof -ti:3000 \| xargs kill -9` (macOS/Linux) or change port |

### Runtime Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "GROQ_API_KEY is not configured" | `.env.local` missing or invalid | Verify `.env.local` exists in project root with correct key |
| "Rate limit exceeded" | Too many requests to `/api/generate-logic` | Wait 60 seconds; adjust `API_RATE_LIMIT` and `API_RATE_WINDOW_MS` |
| Empty ladder array response | Groq API returned invalid JSON or error | Check browser console for error details; verify Groq API status |
| 400/Invalid Content-Type error | Frontend not sending `application/json` header | Check [plcApi.ts](src/services/plcApi.ts) headers config |

### AI Response Issues

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| Wrong ladder structure | Check browser DevTools **Network** → `/api/generate-logic` → **Response** | Compare response against expected schema; may need system prompt adjustment |
| Missing explanation or instructions | API returned incomplete response | Verify Groq API quota not exceeded at [https://console.groq.com](https://console.groq.com) |
| Incorrect PLC addresses used | AI misunderstood input | Rephrase prompt with explicit addresses: "Use X0 for sensor input" |
| Logic is backward | AI interpreted NC contacts as NO | Explicitly request "normally closed" contacts in prompt |

### Performance Tuning

**Slow first request?**
- This is normal — Groq's free tier has slower first-token latency
- 30-second timeout in `plcApi.ts` allows time for LLaMA to respond

**Too many state re-renders?**
- Check component memoization in React DevTools Profiler
- Verify Zustand selectors are specific (not selecting entire store)

### Browser DevTools Debugging

**Network Tab:**
1. Open DevTools (F12) → Network tab
2. Generate logic
3. Click `/api/generate-logic` request
4. **Response** tab shows AI's raw JSON output
5. **Headers** tab shows rate limit status

**Console Tab:**
- Error messages logged by `useGenerateLogic.ts`
- Network errors from Axios interceptors

**React DevTools:**
- Install React DevTools browser extension
- Inspect component tree and props
- Check Zustand store state in real-time

## 📖 Learn More & Resources

### Official Documentation
- **[Next.js Docs](https://nextjs.org/docs)** - Framework fundamentals
- **[React Hooks](https://react.dev/reference/react)** - React state and effects
- **[Zustand Guide](https://github.com/pmndrs/zustand)** - State management best practices
- **[TanStack Query](https://tanstack.com/query/docs)** - Server state management
- **[Ant Design Components](https://ant.design/components/overview/)** - UI component library
- **[Groq API Reference](https://console.groq.com/docs)** - LLaMA integration details

### PLC & Automation Resources
- **[Mitsubishi FX Series Manual](https://www.mitsubishielectric.com/fa)** - PLC address reference
- **[PLCopen Standard](https://www.plcopen.org/)** - XML export format specification
- **[Ladder Logic Basics](https://en.wikipedia.org/wiki/Ladder_logic)** - General ladder logic concepts

### Architecture & Best Practices
- **This README** - Start here for project overview
- **[WORK_SUMMARY.md](docs/WORK_SUMMARY.md)** - Implementation details and decisions
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and data flow
- **[API.md](docs/API.md)** - API contract documentation
- **[SECURITY.md](docs/SECURITY.md)** - Security considerations

## 🤝 Contributing

### Before You Start
1. Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the design
2. Review existing [src/](src/) structure to match coding patterns
3. Check [SECURITY.md](docs/SECURITY.md) for security requirements

### Making Changes

**For bug fixes:**
1. Identify the issue file
2. Create focused PR with single issue
3. Add test case if applicable

**For features:**
1. Discuss in an issue first (avoid conflicts)
2. Create feature branch: `feature/description`
3. Update README if adding user-facing changes
4. Keep commits atomic and descriptive

**Code standards:**
- Use TypeScript strict mode (no `any` without justification)
- Follow ESLint rules: `npm run lint`
- Format with Prettier (via ESLint integration)
- Keep components under 300 lines
- Document complex logic with comments

### Testing Your Changes

```bash
# Check for syntax errors
npm run lint

# Build production version
npm run build

# Start dev server and test manually
npm run dev
```

## 📝 Comprehensive File Reference

### 🔧 Root Configuration Files

| File | Purpose | Key Details |
|------|---------|------------|
| [package.json](package.json) | NPM dependencies & scripts | React, Next.js, Ant Design, TanStack Query, Transformers, PDF.js |
| [next.config.ts](next.config.ts) | Next.js configuration | Build output: `.next-build` |
| [tsconfig.json](tsconfig.json) | TypeScript configuration | Path aliases (`@/*`), strict mode, ES2017 target |
| [eslint.config.mjs](eslint.config.mjs) | ESLint rules | Next.js, Web Vitals, TypeScript support |
| [postcss.config.mjs](postcss.config.mjs) | PostCSS configuration | Tailwind CSS processing |
| [ladder_logic_schema.json](ladder_logic_schema.json) | Ladder logic JSON schema | Validation structure for AI responses |
| [next-env.d.ts](next-env.d.ts) | Auto-generated types | Next.js type declarations |
| [RAG_SETUP.md](RAG_SETUP.md) | RAG initialization guide | Vector database setup instructions |
| [RAG_QUICKSTART.md](RAG_QUICKSTART.md) | RAG quick reference | Fast-track RAG implementation |
| [RAG_USAGE_GUIDE.md](RAG_USAGE_GUIDE.md) | RAG usage documentation | How to use RAG features |
| [RAG_IMPLEMENTATION_SUMMARY.md](RAG_IMPLEMENTATION_SUMMARY.md) | RAG implementation details | Technical architecture of RAG system |
| [code-documentation.txt](code-documentation.txt) | Developer notes | Implementation details & decisions |

### 📁 src/app/ - Next.js App Router & Pages

| File | Purpose | Exports/Handlers |
|------|---------|------------------|
| [layout.tsx](src/app/layout.tsx) | Root layout component | Wraps app with AntD Registry, providers, global CSS |
| [page.tsx](src/app/page.tsx) | Home page | Renders `IDELayout` component |
| [providers.tsx](src/app/providers.tsx) | Client-side providers | TanStack Query, AntD theme, Zustand store initialization |
| [globals.css](src/app/globals.css) | Global styles | CSS variables, theme colors, base styles |
| [favicon.ico](src/app/favicon.ico) | Browser tab icon | App branding |
| [api/generate-logic/route.ts](src/app/api/generate-logic/route.ts) | AI logic generation API | POST handler, orchestrates: intent parse → logic build → validation → compilation |
| [api/parse-intent/route.ts](src/app/api/parse-intent/route.ts) | Intent parsing API | POST handler, converts natural language → structured Intent JSON |
| [studio/](src/app/studio/) | Studio directory | Placeholder for future IDE enhancements |

### 🎨 src/components/ - React UI Components

| Component | Purpose | Key Responsibilities |
|-----------|---------|---------------------|
| [console/OutputConsole.tsx](src/components/console/OutputConsole.tsx) | System console panel | Displays instruction list, export buttons (XML/CSV), reset controls |
| [editor/InstructionEditor.tsx](src/components/editor/InstructionEditor.tsx) | Main text editor | User input area (0-500 chars), template buttons, generation trigger |
| [editor/IntentEditor.tsx](src/components/editor/IntentEditor.tsx) | Intent form editor | Motor control fields: start input, stop input, emergency stop, output selection |
| [explanation/ExplanationPanel.tsx](src/components/explanation/ExplanationPanel.tsx) | Explanation display | Shows AI-generated logic breakdown, instruction meanings |
| [ladder/LadderPreview.tsx](src/components/ladder/LadderPreview.tsx) | Ladder diagram viewer | SVG rendering of ladder rungs, blocks, and connections |

### 🪝 src/hooks/ - React Custom Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| [useGenerateLogic.ts](src/hooks/useGenerateLogic.ts) | Logic generation mutation | TanStack Query mutation with API call, loading/error states, store updates |

### 📐 src/layout/ - Layout Components

| File | Purpose | Key Features |
|------|---------|------------|
| [IDELayout.tsx](src/layout/IDELayout.tsx) | Main IDE layout | 4-panel layout: editor, preview, explanation, console; theme toggle; logo |

### 🔧 src/lib/ - Utilities & Middleware

| File | Purpose | Key Exports |
|------|---------|------------|
| [apiMiddleware.ts](src/lib/apiMiddleware.ts) | API security middleware | Rate limiting, request validation, error/success formatting, IP tracking |
| [exportLadder.ts](src/lib/exportLadder.ts) | Export format converters | PLCopen XML builder, GX Works CSV builder, file download handler |

### 🤖 src/services/ - Business Logic & Integration

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| [aiService.ts](src/services/aiService.ts) | AI integration layer | `generateLadderLogic()` - wraps Groq API with validation & error handling |
| [ragService.ts](src/services/ragService.ts) | RAG coordinator | Query embedding generation, PDF chunk retrieval from vector DB |
| [embeddingService.ts](src/services/embeddingService.ts) | Vector embeddings | Transformers.js integration, in-memory model loading, LRU cache management |
| [intentParser.ts](src/services/intentParser.ts) | Intent parsing | Calls `/api/parse-intent`, converts text → Intent objects |
| [ladderCompiler.ts](src/services/ladderCompiler.ts) | Instruction compilation | Converts instruction strings (LD/ANI/OUT) → LadderRung/Block structures |
| [ladderParser.ts](src/services/ladderParser.ts) | Response validation | Type-safe parsing, validates AI JSON → `LadderProject`, comprehensive error checking |
| [logicBuilder.ts](src/services/logicBuilder.ts) | Rule-based logic engine | Intent → PLC instruction sequences (LD/ANI/OUT patterns) |
| [safetyValidator.ts](src/services/safetyValidator.ts) | Safety checking | Detects: duplicate coils, unreachable blocks, missing emergency stops |
| [responseValidator.ts](src/services/responseValidator.ts) | Response repair | Attempts malformed response fixes, validates addresses, block types |
| [pdfProcessor.ts](src/services/pdfProcessor.ts) | PDF ingestion | Text extraction from `dataset/` PDFs, chunk splitting, overlap handling |
| [plcApi.ts](src/services/plcApi.ts) | HTTP client | Axios wrapper for `/api/generate-logic`, 30s timeout |

### 🏪 src/store/ - Zustand State Management

| Store | Purpose | State Keys |
|-------|---------|-----------|
| [plcStore.ts](src/store/plcStore.ts) | Global app state | `input`, `intent`, `ladderData`, `explanation`, `instructionList`, `isLoading`, `error` |
| [themeStore.ts](src/store/themeStore.ts) | Theme state | `isDark` (persisted in localStorage, updates DOM) |

### 📦 src/types/ - TypeScript Type Definitions

| File | Purpose | Key Types |
|------|---------|----------|
| [ladder.ts](src/types/ladder.ts) | Ladder logic types | `LadderBlock`, `LadderRung`, `LadderProject`, `Tag` (centralized source of truth) |
| [intent.ts](src/types/intent.ts) | Intent structures | `MotorIntent` (start/stop/emergency/output), `SimpleSwitchIntent` |

### 🛠️ src/utils/ - Helper Functions

| Utility | Purpose | Key Exports |
|---------|---------|------------|
| [deviceOptions.ts](src/utils/deviceOptions.ts) | Device enumerations | Input options (X0-X10), output options (Y0-Y10) for dropdowns |
| [exportUtils.ts](src/utils/exportUtils.ts) | Export formatters | `downloadFile()`, `buildPLCopenXML()`, `buildGXWorksCSV()` |

### 📂 src/schema/ - Schema Definitions

| Directory | Purpose | Status |
|-----------|---------|--------|
| [src/schema/](src/schema/) | JSON schema directory | Reserved for future schema definitions |

### 🖼️ public/ - Static Assets

| Asset | Type | Purpose |
|-------|------|---------|
| [next.svg](public/next.svg) | SVG | Next.js logo |
| [vercel.svg](public/vercel.svg) | SVG | Vercel logo |
| [file.svg](public/file.svg) | SVG | Document icon |
| [globe.svg](public/globe.svg) | SVG | Network/web icon |
| [window.svg](public/window.svg) | SVG | Window/app icon |

### 🧪 scripts/ - Automation & Testing

| Script | Purpose | Usage |
|--------|---------|-------|
| [initializeRAG.js](scripts/initializeRAG.js) | RAG initialization | Processes PDFs, generates embeddings, populates vector DB |
| [initializeRAGMock.js](scripts/initializeRAGMock.js) | Mock RAG setup | Testing without actual PDF/embedding processing |
| [clearRAG.js](scripts/clearRAG.js) | Cache cleanup | Clears vector DB and `.vector-cache/` |
| [diagnostics.js](scripts/diagnostics.js) | System diagnostics | Checks RAG health, embeddings, vector DB status |
| [testPipeline.js](scripts/testPipeline.js) | Pipeline testing | Tests: PDF → chunks → embeddings → retrieval |
| [testPipeline2.js](scripts/testPipeline2.js) | Alternative pipeline test | Variant pipeline test setup |

**Run commands:**
```bash
npm run rag:init       # Initialize RAG system
npm run rag:clear      # Clear vector database
npm run rag:diag       # Run diagnostics
npm run rag:test       # Test pipeline
```

### 📊 File Statistics

| Directory | File Count | Purpose |
|-----------|-----------|---------|
| `src/` | 35+ | Core application code |
| `src/components/` | 5 | UI components (console, editor, explanation, ladder) |
| `src/services/` | 12 | Business logic & AI integration |
| `src/app/` | 8 | Pages & API routes |
| `scripts/` | 6 | Automation & testing utilities |
| `public/` | 5 | Static assets |

### 🔄 Data Flow Through Files

```
User Input (InstructionEditor.tsx)
    ↓
useGenerateLogic.ts (TanStack Query mutation)
    ↓
plcApi.ts (Axios HTTP client)
    ↓
/api/generate-logic/route.ts (API endpoint)
    ↓
intentParser.ts → logicBuilder.ts → safetyValidator.ts → ladderCompiler.ts
    ↓
aiService.ts (Groq LLaMA API call)
    ↓
ladderParser.ts (Response validation)
    ↓
plcStore.ts (Zustand state update)
    ↓
Components (LadderPreview, ExplanationPanel, OutputConsole)
    ↓
User sees ladder diagram, explanation, exportable code
```

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| Total Package Size | ~500MB (node_modules) |
| Build Time | ~10 seconds (Turbopack) |
| Dev Server Startup | ~3 seconds |
| TypeScript Compilation | 100% strict mode |
| API Response Time | 1-10 seconds (Groq LLaMA) |
| Rate Limit | 10 requests/minute per IP |
| Project Consolidation | ✅ Complete (single src/) |

## ✅ Recent Implementation Status

### ✨ March 2026 - Project Consolidation

✅ **Completed:**
- Consolidated duplicate src/ folders into single structure
- Centralized all types in `@/types/ladder.ts`
- Added comprehensive type validation (aiService.ts, ladderParser.ts)
- Updated all imports to use centralized types
- Full TypeScript strict mode compliance
- Zero technical debt, production-ready

✅ **Architecture:**
- Next.js 19 frontend with React 19
- Zustand state management with centralized types
- Groq LLaMA API integration with error handling
- Rate limiting & security middleware
- Comprehensive input/output validation
- Dark/Light theme support
- Export to PLCopen XML and GX Works CSV

### 🚀 Ready to Extend

- 🔧 Additional PLC models (Siemens, Allen-Bradley)
- 📚 Template library for common scenarios
- 🤝 Collaboration features (shared diagrams)
- ⚡ Simulation mode (test logic without hardware)
- 📊 Project history and versioning
- 🎨 Custom themes and workspace layouts

## License

MIT

