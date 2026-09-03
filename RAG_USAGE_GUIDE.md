# 🚀 RAG + Ladder Logic Generation System - User Guide

## Overview

You now have a **complete automatic ladder logic generation system** with RAG (Retrieval-Augmented Generation) integration. Here's how it works:

```
User Input (Natural Language)
    ↓
RAG System (Retrieves relevant PLC examples)
    ↓
AI Model (Groq - llama-3.3-70b)
    ↓
Ladder Logic Generator
    ↓
Output: Ladder Logic Blocks + Explanation + Instructions
```

---

## 🎯 What You Can Do

### 1. **Input Any Natural Language Description**
Type a natural language description of what you want the PLC to do:
- "Start motor when button X0 is pressed, stop with X1, output to Y0"
- "Emergency stop with safe interlock, 5-second delay before motor starts"
- "Conveyor belt control with multiple safety checks"
- "Timer-based sequential control with reset"

### 2. **System Automatically Generates:**
✅ **Ladder Logic Blocks** - Contact/coil structure for PLC  
✅ **Explanation** - What each part does  
✅ **Mitsubishi Instructions** - GX Works mnemonics (LD, AND, OUT, etc.)  
✅ **Tags** - All PLC addresses (X0, Y0, M0, T0, C0, D0, etc.)  

---

## 🔧 System Architecture

### Core Components

#### 1. **RAG Service** (`ragService.ts`)
- Loads vector database from `.vector-cache/embeddings.json`
- Searches for semantically similar examples
- Returns top 4 relevant chunks from knowledge base
- Constructs enhanced prompts with context

#### 2. **AI Service** (`aiService.ts`)
- Sends query + RAG context to Groq API
- Uses `llama-3.3-70b-versatile` model
- Returns structured JSON: `{ladder, explanation, instructionList}`

#### 3. **Response Validator** (`responseValidator.ts`)
- Validates JSON structure
- Checks PLC addresses (X0-X377, Y0-Y377, M0-M9999, D0-D9999)
- Ensures ladder logic rules (contacts before coils, one coil per rung)
- Auto-fixes common issues

#### 4. **API Endpoint** (`/api/generate-logic`)
- Orchestrates the entire pipeline:
  1. Validates input
  2. Retrieves RAG context
  3. Calls Groq AI with enhanced prompt
  4. Parses JSON response
  5. Validates & returns result

---

## 📊 PLC Address Reference

| **Type** | **Range** | **Use Case** |
|----------|-----------|------------|
| **X** (Input) | X0-X377 | Sensors, buttons, switches |
| **Y** (Output) | Y0-Y377 | Motors, lamps, actuators |
| **M** (Memory) | M0-M9999 | Internal relays, flags |
| **D** (Data) | D0-D9999 | Registers, counters, timers |
| **T** (Timer) | T0-T99 | Delay timing |
| **C** (Counter) | C0-C99 | Pulse counting |

### Mitsubishi Ladder Instructions

```
LD    = Load first NO contact      (normally open)
LDI   = Load first NC contact      (normally closed)
AND   = AND series NO contact
ANI   = AND series NC contact
OUT   = Output to coil/relay
END   = End of program
```

**Example:**
```
Start motor if X0 pressed AND X1 not pressed, output to Y0:
LD X0      → Start with button X0 (NO)
ANI X1     → AND stop button X1 (NC = inverted)
OUT Y0     → Output to motor
END
```

---

## 🎮 How to Use (Step-by-Step)

### Step 1: Start the Application
```bash
npm run dev
```
Opens browser tab: `http://localhost:3000`

### Step 2: Enter Your Automation Logic
Click on the **"INSTRUCTION INPUT"** panel on the left side and type:

**Example 1 - Motor Control:**
```
Start motor with button X0.
Stop motor with button X1.
Motor output to Y0.
Emergency stop X2 must break the circuit.
```

**Example 2 - Conveyor Belt:**
```
Conveyor start button X0.
Emergency stop X1.
Motor output Y0.
Running indicator lamp Y1.
```

**Example 3 - Timer Delay:**
```
Start button X0.
After 5 seconds delay, activate Y0.
Stop button X1 resets the timer.
```

### Step 3: Click "GENERATE"
The system will:
1. ✅ Retrieve relevant ladder logic examples from the knowledge base
2. ✅ Pass examples to AI model for accurate generation
3. ✅ Generate ladder logic with correct addresses
4. ✅ Validate the output
5. ✅ Display results

### Step 4: Review Results
- **Left Panel**: Your instruction input
- **Middle Panel**: Visual ladder logic preview
- **Right Panel**: Detailed explanation & tags
- **Bottom Panel**: Mitsubishi GX Works instructions

---

## 📁 Template Examples

### Pre-built Templates in UI:

#### Template 1: Motor Start / Stop
```
Start motor on X0. Stop on X1. Emergency stop X2. Output to Y0.
```
**Generated Output:**
```json
{
  "ladder": [
    {"type": "contact", "label": "X0"},
    {"type": "contact_nc", "label": "X1"},
    {"type": "contact_nc", "label": "X2"},
    {"type": "coil", "label": "Y0"}
  ],
  "explanation": "- X0 (NO) Start pushbutton\n- X1 (NC) Stop pushbutton\n- X2 (NC) Emergency stop interlock\n- Y0 Motor contactor",
  "instructionList": "LD X0\nANI X1\nANI X2\nOUT Y0\nEND"
}
```

#### Template 2: Safety Interlock
```
Start signal X0. Safety interlock X1 (normally closed). Fault reset X2. Output relay Y0.
```

#### Template 3: Conveyor Belt
```
Conveyor start X0. Emergency stop X1. Motor output Y0. Running indicator lamp Y1.
```

#### Template 4: Timer Delay Coil
```
Start trigger X0. After 5-second delay, activate output coil Y0. Stop on X1.
```

---

## 🧠 RAG Knowledge Base

The system uses a vector database with PLC ladder logic examples. Currently contains:

✅ Motor start/stop patterns  
✅ Safety interlock examples  
✅ Timer delay applications  
✅ Conveyor control patterns  
✅ Counter logic examples  
✅ Contact type reference  
✅ Addressing guidelines  
✅ Mitsubishi instruction mnemonics  
✅ Analog register processing  
✅ Application-specific patterns  

### To Add More Examples:

**Option 1: Use Real PDFs** (Recommended)
```bash
# Place your PLC manual PDFs in the dataset/ folder
dataset/
  ├── pdf1.pdf
  ├── pdf2.pdf
  └── your_manuals.pdf

# Initialize vector database from PDFs
npm run rag:init
```

**Option 2: Add Sample Data** (For Testing)
Edit `scripts/initializeRAGMock.js` and add more `SAMPLE_CHUNKS`

---

## 🔍 Configuration

### Environment Variables (`.env.local`)
```
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_API_SECRET=your_secret_key_here
API_RATE_LIMIT=10
API_RATE_WINDOW_MS=60000
```

### RAG Settings (`ragService.ts`)
```typescript
const topK = 4;  // Number of similar examples to retrieve
const embeddingDim = 384;  // Vector dimensions
```

### API Server Prompt (`route.ts` - SYSTEM_PROMPT)
Define PLC rules the AI must follow for correct generation

---

## 🚨 Troubleshooting

### Issue: "API not configured"
**Solution:** Add `GROQ_API_KEY` to `.env.local`
```bash
GROQ_API_KEY=your_key_here
npm run dev
```

### Issue: "Vector database not initialized"
**Solution:** Run initialization
```bash
npm run rag:init:mock  # For testing with sample data
# OR
npm run rag:init  # For real PDF processing
```

### Issue: "Response validation failed"
**Solution:** Input might be incomplete. Try:
- Be more specific about inputs (X0, Y0 addresses)
- Include safety requirements (emergency stop)
- Specify output devices clearly

### Issue: Long response time
**Solution:** First query loads the embedding model (~1-2 min). Subsequent queries are fast.

---

## 📈 Performance Tips

1. **Be Specific**: More specific descriptions → Better accuracy
   ```
   ❌ "Control something"
   ✅ "Turn on motor Y0 when start button X0 pressed, stop with X1"
   ```

2. **Include Safety**: Always mention emergency stops
   ```
   ✅ "Emergency stop X2 must be normally closed to cut power"
   ```

3. **Use Standard Terms**: Match Mitsubishi PLC terminology
   ```
   ✅ "Input X0", "Output Y0", "Timer T0", "Counter C0"
   ✅ "Normally open", "normally closed", "coil", "contact"
   ```

---

## 🎓 Learning Path

1. **Start Simple**: Test with motor start/stop logic
2. **Add Complexity**: Include timers, counters, interlocks
3. **Understand Tags**: Learn X0-X377, Y0-Y377, M0-M9999 addressing
4. **Study Output**: Read explanations to understand logic flow
5. **Export & Use**: Copy instructions to your PLC software

---

## 📋 Common Patterns

### Pattern 1: Momentary Pushbutton
```
Momentary start button X0 turns on motor Y0:
LD X0
OUT Y0
END
```

### Pattern 2: Start/Stop Buttons  
```
Start X0, Stop X1:
LD X0
ANI X1
OUT Y0
END
```

### Pattern 3: Emergency Stop (Safety Critical)
```
Must use NC (normally closed) for E-stop X2:
LD X0
ANI X1
ANI X2      ← E-stop must be NC
OUT Y0
END
```

### Pattern 4: Timer with Reset
```
5-second delay on start, reset on stop:
LD X0
OUT T0      ← Start timer
LD T0       ← When timer reaches 5s
OUT Y0      ← Activate output
```

### Pattern 5: Counter to 100
```
Count pulses on X0, output when reaches 100:
LD X0
OUT C0      ← Increment counter
LD (C0 >= 100)  ← When counter >= 100
OUT Y0      ← Activate output
```

---

## 🔗 API Endpoint Reference

### POST `/api/generate-logic`

**Request:**
```json
{
  "input": "Start motor X0, stop X1, output Y0"
}
```

**Response:**
```json
{
  "project": {
    "name": "Generated_Logic_TIMESTAMP",
    "ladder": [
      {"type": "contact", "label": "X0", "id": "block-1"},
      {"type": "contact_nc", "label": "X1", "id": "block-2"},
      {"type": "coil", "label": "Y0", "id": "block-3"}
    ]
  },
  "explanation": "...",
  "instructionList": "LD X0\nANI X1\nOUT Y0\nEND",
  "_meta": {
    "ragStatus": "active",
    "sourceDocuments": [...]
  }
}
```

---

## ✨ Next Steps

1. 🎯 **Test the system** with sample inputs
2. 📚 **Add your own PDFs** to the `dataset/` folder
3. 🔧 **Fine-tune the prompt** in `route.ts` system prompt
4. 🚀 **Deploy to production** when satisfied

---

## 📞 Support

For issues or questions, check:
- `RAG_IMPLEMENTATION_SUMMARY.md` - Technical details
- `RAG_SETUP.md` - Setup instructions
- `.env.local` - Configuration
- API route `/api/generate-logic` - Implementation

---

**Happy PLC programming! 🎉**
