# Technical Implementation Guide

## Table of Contents
1. [Project Setup](#project-setup)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Data Pipeline Implementation](#data-pipeline-implementation)
5. [Code Walkthrough](#code-walkthrough)
6. [Testing & Debugging](#testing--debugging)
7. [Deployment Considerations](#deployment-considerations)
8. [Common Issues & Solutions](#common-issues--solutions)

## Project Setup

### Initial Setup Steps

#### 1. Create Next.js Project

```bash
npx create-next-app@latest f1bot --typescript --app --no-src-dir
cd f1bot
```

**Options Selected**:
- ✅ TypeScript
- ✅ App Router
- ✅ No `src/` directory
- ❌ No Tailwind CSS (using custom CSS)

#### 2. Install Core Dependencies

```bash
# AI & LLM
npm install ai @ai-sdk/openai @ai-sdk/react openai

# Vector Database
npm install @datastax/astra-db-ts

# Document Processing
npm install @langchain/community @langchain/core langchain

# Web Scraping
npm install puppeteer

# Environment Variables
npm install dotenv

# TypeScript Runtime
npm install --save-dev ts-node
```

**Dependency Breakdown**:

| Package | Purpose | Size | Critical? |
|---------|---------|------|-----------|
| `ai` | Vercel AI SDK core | ~500KB | ✅ Yes |
| `@ai-sdk/openai` | OpenAI integration | ~50KB | ✅ Yes |
| `@ai-sdk/react` | React hooks | ~100KB | ✅ Yes |
| `openai` | OpenAI client | ~200KB | ✅ Yes |
| `@datastax/astra-db-ts` | Astra DB client | ~150KB | ✅ Yes |
| `@langchain/community` | Document loaders | ~1MB | ✅ Yes |
| `puppeteer` | Web scraping | ~300MB | ⚠️ Dev only |

#### 3. Configure TypeScript

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"],
  "ts-node": {
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}
```

**Key Settings**:
- `target: "ES2017"`: Modern JavaScript features
- `strict: true`: All type checking enabled
- `module: "esnext"`: ES modules for Next.js
- `ts-node.compilerOptions.module: "commonjs"`: For running scripts

#### 4. Setup Environment Variables

**.env** (template):
```env
# Astra DB
ASTRA_DB_NAMESPACE="default_keyspace"
ASTRA_DB_COLLECTION="f1gpt"
ASTRA_DB_API_ENDPOINT="https://your-db-id.apps.astra.datastax.com"
ASTRA_DB_APPLICATION_TOKEN="AstraCS:..."

# OpenAI
OPENAI_API_KEY="sk-proj-..."
```

**.env.example** (for repo):
```env
ASTRA_DB_NAMESPACE="default_keyspace"
ASTRA_DB_COLLECTION="f1gpt"
ASTRA_DB_API_ENDPOINT="your-endpoint-here"
ASTRA_DB_APPLICATION_TOKEN="your-token-here"
OPENAI_API_KEY="your-api-key-here"
```

**.gitignore** additions:
```
.env
.env.local
.env.production
```

## Frontend Implementation

### 1. Main Chat Page (`app/page.tsx`)

**Key Implementation Details**:

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState } from "react";

export default function Home() {
    // Initialize chat hook with transport
    const { messages, sendMessage, status } = useChat({
        transport: new TextStreamChatTransport({ api: '/api/chat' })
    });

    // Local input state (not managed by useChat)
    const [input, setInput] = useState("");

    // Derived state
    const noMessages = !messages || messages.length === 0;
    const isLoading = status === "streaming";

    // Render logic...
}
```

**Why This Approach?**

1. **TextStreamChatTransport**: Required for streaming from custom API
2. **Local Input State**: Better UX control than built-in input handling
3. **Derived State**: Cleaner component logic

**Message Submission**:

```typescript
// From prompt suggestions
<PromptSuggestionsRow
    onPromptClick={(prompt) => {
        sendMessage({ text: prompt });
    }}
/>

// From form
<form onSubmit={(e) => {
    e.preventDefault();
    if (input.trim()) {
        sendMessage({ text: input });
        setInput(""); // Clear input
    }
}}>
```

**Status Handling**:

```typescript
const isLoading = status === "streaming";

// Show loading indicator
{isLoading && <LoadingBubble />}

// Could also handle other states:
// - "idle": No ongoing request
// - "submitted": Request sent, waiting for response
// - "streaming": Receiving response
```

### 2. Message Display (`app/components/Bubble.tsx`)

**Implementation Approach**:

```typescript
import { UIMessage } from "ai";

interface BubbleProps {
    message: UIMessage;
}

export default function Bubble({ message }: BubbleProps) {
    const isUser = message.role === "user";

    // Extract text from message parts
    const messageText = message.parts
        ?.filter(part => part.type === "text")
        .map(part => part.text)
        .join("");

    return (
        <div className={isUser ? "user-bubble" : "assistant-bubble"}>
            {messageText}
        </div>
    );
}
```

**UIMessage Structure**:

```typescript
type UIMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    parts: Array<{
        type: "text" | "tool-call" | "tool-result";
        text?: string;
        // ... other fields for tools
    }>;
    createdAt?: Date;
}
```

**Why Parts Array?**

- Supports multi-modal messages (text + images + tools)
- Extensible for future features
- Standard format across Vercel AI SDK

### 3. Loading Indicator (`app/components/LoadingBubble.tsx`)

**Simple Animation Implementation**:

```typescript
export default function LoadingBubble() {
    return (
        <div className="loading-bubble">
            <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    );
}
```

**CSS Animation**:

```css
.loading-dots span {
    animation: pulse 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
    animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes pulse {
    0%, 80%, 100% {
        opacity: 0.4;
        transform: scale(1);
    }
    40% {
        opacity: 1;
        transform: scale(1.2);
    }
}
```

### 4. Prompt Suggestions

**Row Component** (`app/components/PromptSuggestionsRow.tsx`):

```typescript
interface PromptSuggestionsRowProps {
    onPromptClick: (prompt: string) => void;
}

export default function PromptSuggestionsRow({ onPromptClick }: PromptSuggestionsRowProps) {
    const prompts = [
        "Who is head of racing for Aston Martin's F1 Academy team?",
        "Who is the highest paid F1 driver?",
        "Who will be the newest driver for Ferrari?",
        "Who is the current Formula One World Driver's Champion?",
    ];

    return (
        <div className="prompt-suggestions-row">
            {prompts.map((prompt, index) => (
                <PromptSuggestionButton
                    key={index}
                    text={prompt}
                    onClick={() => onPromptClick(prompt)}
                />
            ))}
        </div>
    );
}
```

**Button Component** (`app/components/PromptSuggestionButton.tsx`):

```typescript
interface PromptSuggestionButtonProps {
    text: string;
    onClick: () => void;
}

export default function PromptSuggestionButton({ text, onClick }: PromptSuggestionButtonProps) {
    return (
        <button
            className="prompt-suggestion-btn"
            onClick={onClick}
        >
            {text}
        </button>
    );
}
```

**Why Separate Components?**

- Reusability
- Easier styling
- Clear separation of concerns
- Testability

## Backend Implementation

### API Route (`app/api/chat/route.ts`)

**Complete Implementation Walkthrough**:

#### Step 1: Imports and Configuration

```typescript
import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

// Load environment variables
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
} = process.env;

// Initialize clients
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
});
```

**Why Two OpenAI Clients?**

1. `openai` (from `@ai-sdk/openai`): For Vercel AI SDK's `streamText()`
2. `OpenAI` (from `openai`): For embeddings API

Different packages, different use cases.

#### Step 2: POST Handler

```typescript
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Extract user query
        const lastMessage = messages[messages.length - 1];
        let userQuery = "";

        if (lastMessage?.parts) {
            // UIMessage format with parts
            const textParts = lastMessage.parts.filter((part: any) => part.type === "text");
            userQuery = textParts.map((part: any) => part.text).join("");
        } else if (lastMessage?.content) {
            // Simple format
            userQuery = lastMessage.content;
        }

        // ... RAG logic ...

    } catch (error) {
        console.error("Error in POST /api/chat:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
```

**Error Handling Strategy**:
- Try-catch wraps entire handler
- Log errors for debugging
- Return generic error to client (don't leak internals)
- Return 500 status code

#### Step 3: Generate Query Embedding

```typescript
// Generate embedding for the user query
const embeddingResponse = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuery,
});
const queryEmbedding = embeddingResponse.data[0].embedding;
```

**Potential Optimization**:

```typescript
// Could cache frequent queries
const cacheKey = `emb:${hash(userQuery)}`;
let queryEmbedding = await cache.get(cacheKey);

if (!queryEmbedding) {
    const embeddingResponse = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: userQuery,
    });
    queryEmbedding = embeddingResponse.data[0].embedding;
    await cache.set(cacheKey, queryEmbedding, { ttl: 3600 });
}
```

#### Step 4: Vector Search

```typescript
// Search for similar documents in Astra DB
const collection = await db.collection(ASTRA_DB_COLLECTION);
const searchResults = await collection
    .find(
        {},
        {
            sort: { $vector: queryEmbedding },
            limit: 5,
        }
    )
    .toArray();
```

**Search Configuration**:
- Empty filter `{}`: Search all documents
- Sort by `$vector`: Similarity to query
- Limit 5: Balance between context and noise

**Advanced: Filtered Search**:

```typescript
// Could filter by metadata
const searchResults = await collection
    .find(
        {
            category: "drivers",  // Only search driver documents
            year: { $gte: 2020 }  // Only recent information
        },
        {
            sort: { $vector: queryEmbedding },
            limit: 5,
        }
    )
    .toArray();
```

#### Step 5: Build Context

```typescript
const docContext = searchResults.map((doc: any) => doc.text).join("\n\n") || "";
```

**Alternative Formats**:

```typescript
// With source attribution
const docContext = searchResults
    .map((doc: any, index: number) =>
        `[Source ${index + 1}]\n${doc.text}`
    )
    .join("\n\n");

// With relevance scores (if available)
const docContext = searchResults
    .map((doc: any, index: number) =>
        `[Relevance: ${doc.similarity}]\n${doc.text}`
    )
    .join("\n\n");
```

#### Step 6: Create System Prompt

```typescript
const systemPrompt = `You are an AI assistant who knows everything about Formula One.
Use the below context to augment what you know about Formula One racing.
The context will provide you with the most recent page data from wikipedia,
the official F1 website and others.

If the context doesn't include the information you need answer based on your
existing knowledge and don't mention the source of your information or
what the context does or doesn't include.
Format responses using markdown where applicable and don't return images.

----------
START CONTEXT
${docContext}
END CONTEXT
----------`;
```

**Prompt Engineering Principles**:

1. **Clear Identity**: "You are an AI assistant..."
2. **Instruction**: "Use the below context..."
3. **Fallback Behavior**: "If the context doesn't include..."
4. **Formatting**: "Format responses using markdown..."
5. **Delimiters**: `START CONTEXT` / `END CONTEXT` for clarity

**Advanced: Dynamic Prompts**:

```typescript
// Adjust based on query type
const isFactualQuery = detectFactualQuery(userQuery);

const systemPrompt = isFactualQuery
    ? `You are a factual F1 information assistant. Only provide information that is in the context below. If you don't know, say so.`
    : `You are a helpful F1 assistant. Use the context when available, but feel free to engage conversationally.`;
```

#### Step 7: Stream Response

```typescript
const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
});

return result.toTextStreamResponse();
```

**Why convertToModelMessages?**

Converts UIMessage format to OpenAI's format:

```typescript
// UIMessage
{
    role: "user",
    parts: [{ type: "text", text: "Hello" }]
}

// Converts to OpenAI format
{
    role: "user",
    content: "Hello"
}
```

**Streaming Options**:

```typescript
const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),

    // Optional parameters:
    temperature: 0.7,          // Creativity (0-2)
    maxTokens: 500,            // Limit response length
    topP: 0.9,                 // Nucleus sampling
    frequencyPenalty: 0.0,     // Penalize repetition
    presencePenalty: 0.0,      // Encourage topic diversity
});
```

## Data Pipeline Implementation

### Script: `scripts/loadDb.ts`

**Complete Implementation Breakdown**:

#### Configuration

```typescript
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

// Environment variables
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
} = process.env;

// Initialize clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

// Configure text splitter
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});
```

#### Data Sources

```typescript
const f1Data = [
    // General F1 info
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://en.wikipedia.org/wiki/History_of_Formula_One',

    // Current season
    'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',

    // Teams
    'https://en.wikipedia.org/wiki/Red_Bull_Racing',
    'https://en.wikipedia.org/wiki/Scuderia_Ferrari',
    // ... more teams

    // Drivers
    'https://en.wikipedia.org/wiki/Max_Verstappen',
    'https://en.wikipedia.org/wiki/Lewis_Hamilton',
    // ... more drivers

    // Technical
    'https://en.wikipedia.org/wiki/Formula_One_car',
];
```

**Source Selection Criteria**:
1. Authoritative (Wikipedia, official sites)
2. Current information (2024 season)
3. Comprehensive coverage (teams, drivers, rules)
4. Stable URLs (won't break)

#### Collection Creation

```typescript
const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536,
                metric: similarityMetric,
            },
        });
        console.log("Collection created:", res);
    } catch (error: any) {
        if (error.message?.includes("already exists")) {
            console.log("Collection already exists, skipping creation");
        } else {
            throw error;
        }
    }
};
```

**Error Handling**:
- Catch "already exists" error gracefully
- Allow script to be re-run without failing

#### Data Loading

```typescript
const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    let totalChunks = 0;

    for await (const url of f1Data) {
        console.log(`\nScraping: ${url}`);

        // 1. Scrape page
        const content = await scrapePage(url);

        // 2. Split into chunks
        const chunks = await splitter.splitText(content);
        console.log(`  Found ${chunks.length} chunks`);

        // 3. Process each chunk
        let chunkCount = 0;
        for await (const chunk of chunks) {
            // 3a. Generate embedding
            const embedding = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float",
            });

            const vector = embedding.data[0].embedding;

            // 3b. Store in database
            await collection.insertOne({
                $vector: vector,
                text: chunk,
            });

            chunkCount++;
            totalChunks++;

            // Progress indicator
            if (chunkCount % 10 === 0) {
                process.stdout.write(`  Processed ${chunkCount}/${chunks.length} chunks\r`);
            }
        }

        console.log(`  ✓ Completed ${chunks.length} chunks`);
    }

    console.log(`\n✓ Loading complete! Total chunks inserted: ${totalChunks}`);
};
```

**Progress Tracking**:
- Log each URL being scraped
- Show chunk count per page
- Update progress every 10 chunks
- Final summary with total count

#### Web Scraping

```typescript
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "domcontentloaded",
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => {
                // Remove unwanted elements
                const elementsToRemove = [
                    'script', 'style', 'nav', 'header', 'footer',
                    'aside', 'iframe', 'noscript', '.navigation',
                    '.menu', '.sidebar', '.footer', '.header',
                    '[role="navigation"]', '[role="banner"]',
                    '.toc', '#toc', '.mw-editsection',
                ];

                elementsToRemove.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });

                // Get main content
                const contentSelectors = [
                    'main',
                    'article',
                    '[role="main"]',
                    '.content',
                    '#content',
                    '.main-content',
                    '#mw-content-text',
                    '.article-body',
                ];

                for (const selector of contentSelectors) {
                    const content = document.querySelector(selector);
                    if (content) {
                        return content.textContent || '';
                    }
                }

                return document.body.textContent || '';
            });

            await browser.close();
            return result;
        }
    });

    const rawContent = await loader.scrape();

    // Clean up the text
    return rawContent
        ?.replace(/<[^>]*>?/gm, '')  // Remove HTML tags
        .replace(/\s+/g, ' ')         // Normalize whitespace
        .replace(/\[edit\]/g, '')     // Remove Wikipedia edit links
        .trim() || '';
};
```

**Scraping Strategy**:

1. **Remove unwanted elements**: Navigation, headers, footers
2. **Extract main content**: Try multiple selectors in priority order
3. **Clean text**: Remove HTML, normalize whitespace
4. **Handle failures**: Return empty string if scraping fails

#### Main Runner

```typescript
const run = async () => {
    try {
        console.log("Starting database setup...");
        await createCollection();
        await loadSampleData();
        console.log("\n✓ All done! Database is ready.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();
```

**Process Management**:
- Explicit `process.exit(0)` on success
- Exit code 1 on error
- Proper error logging

### Helper Scripts

#### Check Database (`scripts/checkDb.ts`)

```typescript
import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const checkData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);

    console.log(`\nCollection: ${ASTRA_DB_COLLECTION}`);

    // Get sample documents
    const samples = await collection.find({}, { limit: 3 }).toArray();

    console.log("\n=== Sample Documents ===");
    samples.forEach((doc: any, index: number) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log("Text length:", doc.text?.length || 0);
        console.log("Text preview:", doc.text?.substring(0, 300));
        console.log("---");
    });
};

checkData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
```

#### Clear Database (`scripts/clearDb.ts`)

```typescript
import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const clearDatabase = async () => {
    try {
        console.log("Deleting collection...");
        await db.dropCollection(ASTRA_DB_COLLECTION);
        console.log("✓ Collection deleted successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

clearDatabase();
```

## Testing & Debugging

### Debug Logging

Add to `app/api/chat/route.ts`:

```typescript
console.log("=== RAG Search Debug ===");
console.log("User query:", userQuery);
console.log("Number of results found:", searchResults.length);
console.log("First result:", searchResults[0]?.text?.substring(0, 200));
```

**Useful Debug Points**:
1. After message extraction
2. After vector search
3. Before LLM generation
4. Error boundaries

### Testing Queries

**Test Different Query Types**:

```typescript
// Factual queries
"Who won the 2024 F1 championship?"
"What team does Max Verstappen drive for?"

// Comparative queries
"Who has more championships, Hamilton or Verstappen?"

// Definitional queries
"What is DRS in Formula 1?"

// Current information queries
"Who will drive for Ferrari in 2025?"
```

### Debugging Vector Search

**Check search quality**:

```typescript
const searchResults = await collection.find({}, {
    sort: { $vector: queryEmbedding },
    limit: 10,  // Get more results
    includeSimilarity: true,  // If supported
}).toArray();

// Log similarity scores
searchResults.forEach((doc, i) => {
    console.log(`${i + 1}. Score: ${doc.similarity}, Text: ${doc.text.substring(0, 100)}`);
});
```

## Deployment Considerations

### Vercel Deployment

**vercel.json**:

```json
{
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "installCommand": "npm install",
    "framework": "nextjs",
    "regions": ["iad1"]
}
```

**Environment Variables**:

Set in Vercel dashboard:
- `ASTRA_DB_NAMESPACE`
- `ASTRA_DB_COLLECTION`
- `ASTRA_DB_API_ENDPOINT`
- `ASTRA_DB_APPLICATION_TOKEN`
- `OPENAI_API_KEY`

**Build Optimization**:

```json
// package.json
{
    "scripts": {
        "build": "next build",
        "postbuild": "echo 'Build complete'"
    }
}
```

### Performance Optimization

**1. API Route Optimization**:

```typescript
// Cache database connection
let dbConnection: any = null;

export async function POST(req: Request) {
    if (!dbConnection) {
        const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
        dbConnection = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });
    }

    const db = dbConnection;
    // ... rest of code
}
```

**2. Edge Runtime** (future):

```typescript
// app/api/chat/route.ts
export const runtime = 'edge'; // Run on edge network

// Note: Some dependencies may not work with edge runtime
// Would need to verify compatibility
```

### Monitoring

**Add Error Tracking**:

```typescript
// app/api/chat/route.ts
import * as Sentry from "@sentry/nextjs";

export async function POST(req: Request) {
    try {
        // ... existing code
    } catch (error) {
        Sentry.captureException(error);
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500 }
        );
    }
}
```

## Common Issues & Solutions

### Issue 1: Puppeteer in Production

**Problem**: Puppeteer doesn't work in serverless environments

**Solution**: Run scraping locally, deploy only the app

```json
// package.json
{
    "scripts": {
        "seed": "ts-node scripts/loadDb.ts",
        "build": "next build",
        "vercel-build": "next build"
    }
}
```

Don't include scraping in build process.

### Issue 2: Large Bundle Size

**Problem**: Puppeteer increases bundle size

**Solution**: Mark as dev dependency, don't import in app

```json
{
    "dependencies": {
        "next": "^16.0.0",
        // ... other runtime deps
    },
    "devDependencies": {
        "puppeteer": "^24.30.0",  // Only needed for scripts
        "ts-node": "^10.9.2"
    }
}
```

### Issue 3: Environment Variables Not Loading

**Problem**: `.env` file not found

**Solution**: Check file location and naming

```bash
# Correct
.env                    # Root of project
.env.local              # Local override
.env.production         # Production values

# Incorrect
src/.env                # Wrong location
env.txt                 # Wrong extension
```

### Issue 4: CORS Errors

**Problem**: API route blocked by CORS

**Solution**: Add CORS headers (if needed for external access)

```typescript
export async function POST(req: Request) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    // ... rest of POST handler
}
```

### Issue 5: Streaming Not Working

**Problem**: Response appears all at once

**Solution**: Ensure proper headers and transport

```typescript
// Server
return result.toTextStreamResponse();

// Client
const transport = new TextStreamChatTransport({ api: '/api/chat' });
```

Don't use regular `fetch()` - must use compatible transport.

### Issue 6: Out of Memory Errors

**Problem**: Node runs out of memory during scraping

**Solution**: Increase Node memory limit

```json
// package.json
{
    "scripts": {
        "seed": "node --max-old-space-size=4096 -r ts-node/register scripts/loadDb.ts"
    }
}
```

Or process pages in smaller batches.

## Conclusion

This implementation guide covers:

✅ Complete project setup from scratch
✅ Frontend implementation with React and Vercel AI SDK
✅ Backend RAG pipeline implementation
✅ Data ingestion and processing scripts
✅ Testing and debugging strategies
✅ Deployment considerations
✅ Common issues and solutions

Key takeaways:

1. **Separation of Concerns**: Data pipeline (scripts) separate from runtime (app)
2. **Type Safety**: TypeScript throughout for robustness
3. **Error Handling**: Graceful failures and informative logging
4. **Optimization**: Caching, efficient chunking, proper configuration
5. **Monitoring**: Debug logs and error tracking
6. **Scalability**: Architecture supports growth without major changes

The implementation is production-ready with some enhancements:
- Add authentication
- Implement rate limiting
- Add caching layer
- Set up monitoring
- Optimize for edge deployment

For an academic project, the current implementation demonstrates all core RAG concepts while maintaining clean, understandable code.
