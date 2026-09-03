# RAG System Documentation

## Overview

The RAG (Retrieval-Augmented Generation) system enhances the PLC AI assistant by grounding responses in actual PLC documentation from PDF files. Instead of relying solely on the language model's training data, the system:

1. **Retrieves** relevant context from local PDF knowledge base
2. **Augments** the AI prompt with retrieved documentation
3. **Generates** more accurate, reference-backed PLC ladder logic

## Architecture

### Components

```
Dataset (PDF files)
    ↓
PDF Processor (pdf-parse) → Extract text, split into chunks
    ↓
Embedding Service (@xenova/transformers) → Generate embeddings locally
    ↓
Vector Database (.vector-cache/) → Store embeddings & search
    ↓
RAG Service → Similarity search & context retrieval
    ↓
API Route (/api/generate-logic) → Enhanced with context
    ↓
Response Validator → Ensure valid output
    ↓
Groq LLaMA API → Generate ladder logic
    ↓
Frontend UI → Display results
```

### Key Services

| Service | Purpose | Location |
|---------|---------|----------|
| **pdfProcessor** | Load and parse PDFs, split into chunks | `src/services/pdfProcessor.ts` |
| **embeddingService** | Generate embeddings, manage vector DB | `src/services/embeddingService.ts` |
| **ragService** | Retrieve relevant context, construct prompts | `src/services/ragService.ts` |
| **responseValidator** | Validate AI responses, auto-fix issues | `src/services/responseValidator.ts` |

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. The RAG system uses:
- **pdf-parse**: Extract text from PDFs
- **@xenova/transformers**: Generate embeddings locally (384-dim, all-MiniLM-L6-v2)
- **js-tiktoken**: Token counting
- **dotenv**: Environment variables

### 2. Prepare PDF Dataset

Place your PLC documentation PDFs in the `dataset/` folder:

```
dataset/
  ├── pdf1.pdf
  ├── pdf2.pdf
  ├── pdf3.pdf
  └── ... more PDFs
```

Currently supported:
- pdf1.pdf through pdf9 analog con.pdf ✅

### 3. Initialize Vector Database

Run the initialization script to process PDFs and build the vector database:

```bash
npm run rag:init
```

This will:
- ✅ Load all PDFs from `dataset/`
- ✅ Extract text and split into ~500 char chunks
- ✅ Generate 384-dimensional embeddings for each chunk
- ✅ Save embeddings in `.vector-cache/`
- ✅ Display statistics and confirm readiness

**Time:** First run takes 5-15 minutes (embedding model downloads ~100MB)

**Output:**
```
✅ INITIALIZATION COMPLETE

📊 STATISTICS:
  • Embeddings stored: 1,245
  • Embedding dimension: 384
  • Database location: .vector-cache
  • Database size: ~1.90 MB
```

### 4. Start Development Server

```bash
npm run dev
```

The API will automatically detect the initialized vector database and start using RAG.

## How RAG Works at Runtime

### User Workflow

```
1. User enters: "Turn on motor Y0 when start button X0 is pressed"
   ↓
2. API receives request
   ↓
3. Query embedding generated (384 dims)
   ↓
4. Semantic search finds top 4 similar chunks from PDFs
   ↓
5. Retrieved chunks combined into context
   ↓
6. Prompt constructed:
      System instructions + PDF context + User input
   ↓
7. Sent to Groq LLaMA API
   ↓
8. AI generates ladder logic using documented references
   ↓
9. Response validated for safety & correctness
   ↓
10. Results returned to frontend with source attribution
```

### Context Retrieval Process

The system uses **cosine similarity** to find relevant chunks:

```typescript
// Example retrieval
Query: "Turn on motor Y0"
  ↓
Embedding generated → [0.12, -0.45, 0.89, ...]
  ↓
Vector DB searched
  ↓
Top 4 results:
  1. "Motor control uses Y addresses (Y0-Y377)..." [95% match]
  2. "Output coil symbol is -(  )-..." [92% match]
  3. "Mitsubishi Y addresses are outputs..." [88% match]
  4. "Motor rated for 3-phase AC..." [82% match]
  ↓
Context = Combined text of top 4
  ↓
Included in prompt
```

## Configuration

### Chunk Settings

Edit in `src/services/pdfProcessor.ts`:

```typescript
const CHUNK_SIZE = 500;      // Characters per chunk
const CHUNK_OVERLAP = 50;    // Overlap between chunks
```

**Recommendations:**
- **Smaller chunks (200-300):** For precise Q&A
- **Medium chunks (500-800):** Balanced (default)
- **Large chunks (1000+):** For complex topics

### Embedding Model

Currently using: **Xenova/all-MiniLM-L6-v2**
- 384 dimensions
- Trained on paraphrase detection
- Lightweight (~100MB)
- Runs locally on Node.js

To use a different model:
```typescript
// In embeddingService.ts
pipeline = await transformersPipeline(
  "feature-extraction",
  "Xenova/your-model-name", // Change here
  { ... }
);
```

### Search Parameters

Edit in `src/services/ragService.ts`:

```typescript
export async function retrieveContext(
  userInput: string,
  topK: number = 4  // Number of chunks to retrieve
): Promise<RetrievedContext> { ... }
```

**Recommendations:**
- `topK = 3-4`: For compact context
- `topK = 5-6`: For complex queries
- `topK > 6`: Risk of context dilution

## API Endpoints

### POST `/api/generate-logic`

**Request:**
```json
{
  "input": "Turn on motor Y0 when start button X0 is pressed"
}
```

**Response:**
```json
{
  "ladder": [
    { "type": "contact", "label": "X0", "id": "block-0" },
    { "type": "coil", "label": "Y0", "id": "block-1" }
  ],
  "explanation": "Motor control circuit...",
  "instructionList": "LD X0\nOUT Y0\nEND",
  "_meta": {
    "ragStatus": "active",
    "sourceDocuments": ["pdf2.pdf", "pdf5.pdf"]
  }
}
```

**RAG Status Values:**
- `"active"`: Context successfully retrieved
- `"no_results"`: DB initialized but no similar chunks found
- `"not_initialized"`: Vector DB not yet built
- `"error"`: RAG error (continues without context)
- `"disabled"`: RAG not enabled

## Management Commands

### Initialize/Reinitialize Database
```bash
npm run rag:init
```
- Processes all PDFs
- Regenerates all embeddings
- Overwrites existing database
- **Use when:** Adding new PDFs, updating existing ones

### Clear Database
```bash
npm run rag:clear
```
- Deletes `.vector-cache/` directory
- Space freed: Typically 1-3 MB
- **Use when:** Troubleshooting, freeing space

## Performance & Optimization

### Processing Time
- **First initialization:** 5-15 minutes (model download + embedding)
- **Subsequent initializations:** 2-5 minutes
- **Per-query retrieval:** <1 second
- **Embedding generation:** ~100ms per 500-char chunk

### Memory Usage
- **Embedding model:** ~150 MB RAM
- **Vector database:** ~2-3 MB per 1,000 chunks
- **Runtime memory:** ~300-500 MB total

### Storage
- **Model cache:** ~100 MB (first run)
- **Vector database:** ~1-3 MB depending on PDF size
- **Total:** ~100-150 MB

### Optimization Tips

1. **Smaller PDFs:**
   - Replace with extracted text-only versions
   - Reduces processing time by 50%

2. **Larger chunk size:**
   - Change `CHUNK_SIZE` to 800-1000
   - Reduces number of embeddings
   - Slightly faster but less precise

3. **Batch processing:**
   - Add `rag:init` to build process
   - Initialize once, not per-request

## Validation & Safety

### Response Validation

The system validates all AI responses:

✅ **Checks:**
- Valid JSON structure
- Block types in `[contact, contact_nc, coil, timer, counter]`
- Valid Mitsubishi addresses (X0-X377, Y0-Y377, etc.)
- Proper ladder structure (contacts before coils)
- At least one coil per rung
- Maximum 20 blocks per rung

⚠️ **Auto-fixes:**
- Adding missing block IDs
- Reordering blocks (contacts first)
- Ensuring no duplicate addresses
- Adding missing "END" instruction

❌ **Rejects:**
- Invalid addresses
- No coils (outputs)
- Impossible instruction sequences

### Example Validation Flow

```
Raw Response
  ↓
validateResponse(response)
  ├─ Structure check ✓
  ├─ Block validation ✓
  ├─ Address validation ✗ (Invalid address)
  └─ Returns errors
  ↓
attemptToFixResponse()
  ├─ Can fix? Yes
  └─ Returns fixed version
  ↓
Retry validation ✓
  ↓
Return fixed response to frontend
```

## Troubleshooting

### Vector Database Not Found

**Error:** `⚠️ RAG not initialized`

**Solution:**
```bash
npm run rag:init
```

### Slow Initialization

**Symptom:** Takes >20 minutes

**Causes:**
- Large PDFs (>1000 pages)
- Slow disk I/O
- First-time model download

**Solutions:**
```bash
# Split large PDFs
# Ensure SSD is used
# Check network (model downloads for first time)
```

### Out of Memory

**Error:** `... heap out of memory`

**Solution:**
```bash
# Increase Node.js memory
node --max-old-space-size=4096 scripts/initializeRAG.js

# Or process PDFs in batches
# Edit pdfProcessor.ts to load one PDF at a time
```

### Embeddings Not Generated

**Error:** `Failed to generate embedding`

**Causes:**
- Transformers library issue
- Corrupted text chunks
- Network issue (model download)

**Solutions:**
```bash
# Clear cache and retry
npm run rag:clear
npm run rag:init

# Check for PDF parsing issues in logs
```

### Poor Retrieval Results

**Symptom:** Retrieved chunks not relevant

**Solutions:**
1. **Adjust chunk size:**
   ```typescript
   // In pdfProcessor.ts
   const CHUNK_SIZE = 800;  // Larger chunks
   ```

2. **Increase topK:**
   ```typescript
   // In ragService.ts
   const results = retrieveContext(input, 6);  // More chunks
   ```

3. **Verify PDF quality:**
   - Ensure PDFs are text-based (not image-based)
   - Remove scanned documents or OCR them first

## Advanced Usage

### Custom Embedding Model

To use a different embedding model:

```typescript
// src/services/embeddingService.ts
pipeline = await transformersPipeline("feature-extraction", "Xenova/bge-small-en-v1.5", {
  revision: "main"
});

// Update dimension constant
EMBEDDING_DIM = 384;  // Update to match your model
```

Available models:
- `Xenova/all-MiniLM-L6-v2` (384 dims) ← **Default**
- `Xenova/bge-small-en-v1.5` (384 dims)
- `Xenova/all-mpnet-base-v2` (768 dims, slower)

### Custom Response Validation

Create custom validators:

```typescript
// src/services/responseValidator.ts
export function validateCustomRules(response: any): string[] {
  const errors: string[] = [];
  
  // Your custom rules
  if (/* your condition */) {
    errors.push("Custom error message");
  }
  
  return errors;
}
```

### Semantic Reranking

Improve results by reranking:

```typescript
// Retrieve more chunks, then rerank by relevance
const candidates = searchSimilarEmbeddings(queryEmb, vectorDB, 10);
const reranked = candidates.sort((a, b) => 
  calculateCustomRelevance(b) - calculateCustomRelevance(a)
).slice(0, 4);
```

## Monitoring & Logging

### View RAG Activity

RAG operations are logged with prefixes:
- `🔍 [RAG]` - Retrieval operations
- `✅ [RAG]` - Successful retrieval
- `⚠️ [RAG]` - Issues
- `📚` - PDF processing
- `🧮` - Embeddings

**Example logs:**
```
🔍 [RAG] Retrieving context for query: "Turn on motor..."
🧮 Generating query embedding...
🔎 Searching for top 4 similar chunks...
✅ [RAG] Retrieved 4 relevant chunks from 2 document(s)
```

### Monitor Metrics

Vector DB statistics:
```bash
# Check database size (in aiService.ts)
const stats = getVectorDatabaseStats();
console.log(`Embeddings stored: ${stats.count}`);
```

## FAQ

### Q: Can I update PDFs later?
**A:** Yes! Re-run `npm run rag:init` to reprocess everything.

### Q: Does RAG work offline?
**A:** Yes! All embeddings are generated locally. No external API calls.

### Q: Can I use other embedding models?
**A:** Yes! Update `embeddingService.ts` with any Xenova model.

### Q: What if I have 1000s of PDFs?
**A:** Modify `pdfProcessor.ts` to:
1. Load PDFs in batches
2. Stream embeddings to disk
3. Build composite vector DB

### Q: Does RAG work without Groq API?
**A:** RAG retrieval works offline. Groq API still needed for final generation.

### Q: How do I optimize for mobile?
**A:** Move embedding generation to server-only (skip client-side).

## Performance Benchmarks

**Single 500-page PDF:**
- Extraction: 10-15 seconds
- Chunking: <1 second
- Embedding: 2-3 minutes
- Total: ~3 minutes

**Query retrieval:**
- Embedding generation: 50-100ms
- Similarity search: 10-50ms
- Total: <200ms

**Complete response:**
- Retrieval: <200ms
- Groq API: 2-5 seconds
- Total: 2-5.2 seconds

## Next Steps

1. ✅ Initialize DB: `npm run rag:init`
2. ✅ Start server: `npm run dev`
3. ✅ Test RAG: Generate ladder logic with "motor", "relay", "timer" etc.
4. ✅ Monitor logs for `[RAG]` prefix
5. ✅ Optimize based on results

## Support & Debugging

Enable verbose logging:

1. Add console.log to track retrieval:
```typescript
// In ragService.ts
console.log(`Retrieved chunks:`, chunks.map(c => ({
  text: c.text.substring(0, 50),
  similarity: c.similarity,
})));
```

2. Check `.vector-cache/metadata.json` for DB stats

3. Review `.vector-cache/embeddings.json` structure (first entry)

---

**RAG System initialized successfully! 🚀**

For questions: Check logs, review service files, or test with sample inputs.
