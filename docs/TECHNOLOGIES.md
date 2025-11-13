# Technologies & Libraries

## Table of Contents
1. [Technology Stack Overview](#technology-stack-overview)
2. [OpenAI APIs](#openai-apis)
3. [LangChain.js](#langchainjs)
4. [DataStax Astra DB](#datastax-astra-db)
5. [Vercel AI SDK](#vercel-ai-sdk)
6. [Next.js & React](#nextjs--react)
7. [Puppeteer](#puppeteer)
8. [TypeScript](#typescript)
9. [Technology Comparison & Alternatives](#technology-comparison--alternatives)

## Technology Stack Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│  Next.js 16 • React 19 • TypeScript • Vercel AI SDK    │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│      API Routes • Business Logic • Type System          │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    AI/ML Layer                          │
│     OpenAI GPT-4 • OpenAI Embeddings • LangChain       │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                           │
│        Astra DB • Vector Storage • Puppeteer            │
└─────────────────────────────────────────────────────────┘
```

### Why This Stack?

| Requirement | Technology | Justification |
|-------------|-----------|---------------|
| **LLM Integration** | OpenAI GPT-4 | State-of-the-art language understanding and generation |
| **Vector Search** | Astra DB | Scalable, managed vector database with low latency |
| **Document Processing** | LangChain | Industry-standard RAG framework with rich tooling |
| **Streaming Responses** | Vercel AI SDK | Best-in-class streaming support for React |
| **Full-Stack Framework** | Next.js | Unified frontend/backend, excellent DX, Vercel integration |
| **Web Scraping** | Puppeteer | Reliable, handles JavaScript-rendered content |
| **Type Safety** | TypeScript | Catches errors at compile time, better IDE support |

## OpenAI APIs

### Overview

OpenAI provides two critical APIs for F1Bot:
1. **Embeddings API** - Converts text to vectors
2. **Chat Completions API** - Generates conversational responses

### Embeddings API

#### Model: text-embedding-3-small

**Specifications**:
- **Dimensions**: 1536
- **Max Input**: 8,191 tokens
- **Encoding**: Float32
- **Cost**: $0.00002 per 1K tokens
- **Latency**: ~100-300ms per request

**Usage in F1Bot**:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: textChunk,
    encoding_format: "float",
});

const vector = embeddingResponse.data[0].embedding;
// vector is an array of 1536 numbers
```

**Why text-embedding-3-small?**

| Factor | text-embedding-3-small | text-embedding-3-large | Ada-002 (previous gen) |
|--------|----------------------|----------------------|------------------------|
| Dimensions | 1536 | 3072 | 1536 |
| Performance | Excellent | Better | Good |
| Cost | $0.02/1M tokens | $0.13/1M tokens | $0.10/1M tokens |
| Speed | Fast | Slower | Fast |
| **Decision** | ✅ Best balance | Overkill for use case | Outdated |

**Mathematical Properties**:

```python
# Embeddings have useful mathematical properties
embedding("king") - embedding("man") + embedding("woman") ≈ embedding("queen")

# Similarity can be computed via dot product
similarity = dot(embedding1, embedding2)
```

### Chat Completions API

#### Model: GPT-4

**Specifications**:
- **Context Window**: 8,192 tokens (gpt-4) / 128,000 tokens (gpt-4-turbo)
- **Max Output**: 4,096 tokens
- **Cost**: $0.03/1K input tokens, $0.06/1K output tokens
- **Capabilities**: Advanced reasoning, context understanding, instruction following

**Usage in F1Bot**:

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt, // Includes retrieved context
    messages: conversationHistory,
});
```

**Why GPT-4?**

Compared to alternatives:

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| **GPT-4** | Best reasoning, most accurate | Most expensive | ✅ Chosen - Quality matters for factual accuracy |
| GPT-3.5-Turbo | Faster, cheaper | Less accurate, more hallucinations | ❌ Too many errors for F1 facts |
| Claude 3 | Good reasoning, large context | Requires separate API | ❌ Adds complexity |
| Llama 3 | Open source, free | Requires hosting, setup complexity | ❌ Not worth self-hosting for academic project |

**Streaming Benefits**:
- Tokens arrive as soon as generated
- Better user experience (TTFT < 1s)
- Can cancel generation early
- Reduces perceived latency

### Token Management

**Understanding Tokens**:
```
"Hello, world!" = ~4 tokens
"Max Verstappen won the 2024 championship" = ~8 tokens

Rule of thumb: 1 token ≈ 0.75 words (English)
              or 1 token ≈ 4 characters
```

**F1Bot Token Usage per Query**:
```
System Prompt:        ~150 tokens
Retrieved Context:    ~640 tokens (5 docs × 512 chars ÷ 4)
User Message:         ~20 tokens
Conversation History: ~100 tokens
-----------------
Total Input:          ~910 tokens → Cost: $0.027

Generated Response:   ~200 tokens → Cost: $0.012

Total Cost per Query: ~$0.039
```

## LangChain.js

### Overview

LangChain is a framework for developing applications powered by language models. F1Bot uses LangChain for document processing.

**Website**: https://js.langchain.com/
**License**: MIT
**Version Used**: 1.0.4

### Components Used

#### 1. Document Loaders

**PuppeteerWebBaseLoader**:

```typescript
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
    evaluate: async (page, browser) => {
        const result = await page.evaluate(() => {
            // Custom extraction logic
        });
        await browser.close();
        return result;
    }
});

const content = await loader.scrape();
```

**Features**:
- Handles JavaScript-rendered content
- Waits for page load
- Allows custom extraction logic
- Automatic browser management

**Alternatives Considered**:

| Loader | Pros | Cons | Decision |
|--------|------|------|----------|
| **PuppeteerWebBaseLoader** | Handles JS, flexible | Heavier, slower | ✅ Needed for modern websites |
| CheerioWebBaseLoader | Faster, lighter | Can't handle JS | ❌ Many F1 sites use JS |
| PlaywrightWebBaseLoader | More features | Larger dependency | ❌ Puppeteer sufficient |

#### 2. Text Splitters

**RecursiveCharacterTextSplitter**:

```typescript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});

const chunks = await splitter.splitText(content);
```

**How it Works**:

```
1. Try to split on double newlines (\n\n) - paragraph boundaries
2. If chunks too large, split on single newlines (\n) - line boundaries
3. If still too large, split on spaces - word boundaries
4. If still too large, split on characters - last resort
```

**Why Recursive?**

```javascript
// Standard CharacterTextSplitter
text.split('') // Just splits on characters, breaks words

// RecursiveCharacterTextSplitter
// Tries multiple separators in order:
const separators = ['\n\n', '\n', ' ', '']
// Preserves document structure better
```

**Parameters Explained**:

```typescript
{
    chunkSize: 512,      // Target size in characters
    chunkOverlap: 100,   // Overlap between consecutive chunks

    // Why 512?
    // - Small enough for focused retrieval
    // - Large enough for coherent context
    // - Fits well in embedding model
    // - ~128 tokens (well under 8191 limit)

    // Why 100 overlap?
    // - ~20% overlap prevents context loss
    // - Catches information split across boundaries
    // - Minimal storage overhead
}
```

### LangChain Ecosystem

**What We Use**:
- `@langchain/community` - Community-contributed integrations
- `@langchain/core` - Core abstractions
- `@langchain/textsplitters` - Text splitting utilities

**What We Don't Use (but could)**:
- Chains - Pre-built LLM chains
- Agents - Autonomous decision-making systems
- Memory - Conversation memory management
- Retrievers - Abstraction over vector stores

**Why Minimal LangChain?**

F1Bot uses LangChain primarily for data preprocessing, not runtime:
- ✅ Excellent document loaders
- ✅ Battle-tested text splitters
- ❌ Don't need complex chains (simple RAG pattern)
- ❌ Vercel AI SDK better for streaming
- ❌ Direct Astra DB client more flexible than LangChain retrievers

## DataStax Astra DB

### Overview

Astra DB is a cloud-native, multi-cloud database built on Apache Cassandra with vector search capabilities.

**Website**: https://www.datastax.com/products/datastax-astra
**Type**: Managed DBaaS (Database as a Service)
**License**: Proprietary (Free tier available)

### Why Astra DB for Vectors?

**Comparison with Alternatives**:

| Database | Type | Pros | Cons | Decision |
|----------|------|------|------|----------|
| **Astra DB** | Managed, Cassandra-based | Easy setup, good docs, generous free tier | Proprietary, vendor lock-in | ✅ Best for academic project |
| Pinecone | Managed, purpose-built | Purpose-built for vectors | Expensive, limited free tier | ❌ Cost prohibitive |
| Weaviate | Self-hosted/managed | Open source, feature-rich | Complex setup, requires hosting | ❌ Too much ops work |
| pgvector | Postgres extension | Use existing Postgres | Limited scale, basic features | ❌ Not optimal for vectors |
| ChromaDB | Embedded/server | Simple, open source | Not production-ready | ❌ Academic/prototype only |
| Qdrant | Self-hosted/managed | Fast, feature-rich | Self-hosting complexity | ❌ Unnecessary for project scale |

### Architecture

**Astra DB Stack**:
```
Application (F1Bot)
        ↓
@datastax/astra-db-ts (SDK)
        ↓
REST API (HTTPS)
        ↓
Astra DB (Cassandra + Vector Search)
        ↓
Multi-region Storage
```

**Key Features Used**:

1. **Vector Collections**
   - Store documents with vector embeddings
   - Automatic indexing for fast similarity search
   - Configurable dimensions and similarity metrics

2. **Similarity Search**
   - Dot product, cosine, or euclidean distance
   - Sub-200ms query times
   - Top-K retrieval

3. **JSON Document Storage**
   - Store vectors alongside metadata
   - Flexible schema
   - Easy to query

### SDK Usage

#### Installation

```bash
npm install @datastax/astra-db-ts
```

#### Connection

```typescript
import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(
    process.env.ASTRA_DB_APPLICATION_TOKEN
);

const db = client.db(
    process.env.ASTRA_DB_API_ENDPOINT,
    { keyspace: process.env.ASTRA_DB_NAMESPACE }
);
```

**Authentication**:
- Token-based (Application Token)
- Generated in Astra DB dashboard
- Scoped to specific database

#### Collection Creation

```typescript
await db.createCollection("f1gpt", {
    vector: {
        dimension: 1536,           // Must match embedding model
        metric: "dot_product",     // or "cosine", "euclidean"
    },
});
```

**Similarity Metrics Explained**:

```
Dot Product: a · b = Σ(a[i] × b[i])
- Fast to compute
- Works well with normalized vectors
- Used by F1Bot ✅

Cosine Similarity: (a · b) / (||a|| × ||b||)
- Measures angle between vectors
- Normalized, always [-1, 1]
- Good for text similarity

Euclidean Distance: ||a - b|| = √(Σ(a[i] - b[i])²)
- Measures straight-line distance
- More intuitive geometric interpretation
- Slower to compute
```

#### Insert Documents

```typescript
const collection = await db.collection("f1gpt");

await collection.insertOne({
    $vector: embeddingVector,  // 1536-dimensional array
    text: documentText,        // Original text
    // Can add any other metadata:
    // url: sourceUrl,
    // timestamp: Date.now(),
    // category: "drivers",
});
```

#### Vector Search

```typescript
const results = await collection.find(
    {},  // Empty filter = search all documents
    {
        sort: { $vector: queryVector },  // Sort by similarity
        limit: 5,                        // Top 5 results
    }
).toArray();

// Returns documents sorted by similarity (highest first)
```

**Behind the Scenes**:
1. Astra DB uses HNSW (Hierarchical Navigable Small World) index
2. Approximate nearest neighbor search
3. Trade-off: Speed vs. accuracy (configured in collection)
4. F1Bot: Accuracy prioritized (small dataset)

### Scalability

**Astra DB Capabilities**:
- Millions of vectors supported
- Automatic sharding across nodes
- Multi-region replication available
- Horizontal scaling

**F1Bot Scale**:
- Current: ~2,000 documents (20 pages × ~100 chunks each)
- Potential: Could scale to 100,000+ documents
- Query performance: Stable up to millions of vectors

### Cost & Limits

**Free Tier** (Used by F1Bot):
- 80GB storage
- 20M read/write ops per month
- More than sufficient for academic project

**Estimated Usage**:
```
Storage:
- 2,000 documents × (1536 floats × 4 bytes + ~500 bytes text)
- ≈ 2,000 × 7KB = 14MB
- Well under 80GB limit

Operations:
- Development: ~1,000 queries/day × 30 = 30,000/month
- Well under 20M limit
```

## Vercel AI SDK

### Overview

The Vercel AI SDK is a TypeScript toolkit for building AI applications with React and other frameworks.

**Website**: https://sdk.vercel.ai/
**License**: Apache 2.0
**Version Used**: 5.0.93

### Packages Used

#### 1. `ai` (Core Package)

**Capabilities**:
- LLM integrations (OpenAI, Anthropic, etc.)
- Streaming text generation
- Message conversion
- Transport layers

**Key Functions Used**:

```typescript
import { streamText, convertToModelMessages } from "ai";

// Streaming text generation
const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
});

// Convert to HTTP response
return result.toTextStreamResponse();
```

**`streamText` Options**:
```typescript
{
    model: LanguageModel,      // LLM to use
    system?: string,           // System prompt
    messages: Message[],       // Conversation history
    temperature?: number,      // Randomness (0-2)
    maxTokens?: number,        // Max response length
    topP?: number,             // Nucleus sampling
    frequencyPenalty?: number, // Repetition penalty
    presencePenalty?: number,  // Topic diversity
}
```

#### 2. `@ai-sdk/openai`

OpenAI-specific integration:

```typescript
import { openai } from "@ai-sdk/openai";

// Use with streamText
const model = openai("gpt-4");
const model = openai("gpt-4-turbo");
const model = openai("gpt-3.5-turbo");
```

**Benefits over raw OpenAI SDK**:
- Standardized interface across providers
- Built-in streaming support
- Error handling
- Type safety

#### 3. `@ai-sdk/react`

React hooks for AI interactions:

```typescript
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' })
});
```

**`useChat` Return Values**:
```typescript
{
    messages: UIMessage[],     // Conversation history
    sendMessage: (msg) => void, // Send new message
    status: ChatStatus,        // 'idle' | 'streaming' | 'submitted'
    error: Error | undefined,  // Error state
    stop: () => void,          // Stop generation
    regenerate: () => void,    // Regenerate last response
}
```

### Transport Layer

**TextStreamChatTransport**:

Handles communication between client and server:

```typescript
// Client
const transport = new TextStreamChatTransport({
    api: '/api/chat',
    credentials: 'same-origin',
    headers: { 'Custom-Header': 'value' },
});

// Server
return result.toTextStreamResponse();
```

**Flow**:
```
User Input → useChat → TextStreamChatTransport
    ↓
POST /api/chat with messages
    ↓
API Route processes with RAG
    ↓
streamText() generates response
    ↓
toTextStreamResponse() creates stream
    ↓
TextStreamChatTransport receives stream
    ↓
useChat updates messages state
    ↓
UI re-renders with new message
```

### Why Vercel AI SDK?

**Alternatives Considered**:

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **Vercel AI SDK** | Best React integration, streaming, multiple providers | Relatively new | ✅ Perfect for Next.js + React |
| LangChain.js | Mature, many features | React integration clunky, heavy | ❌ Better for backend-only |
| Raw OpenAI SDK | Direct control, simple | No React hooks, manual streaming | ❌ Too much boilerplate |
| llamaindex.ts | Good RAG support | Less React-focused | ❌ Vercel AI SDK more polished |

**Key Advantages**:
1. **Streaming First**: Built for streaming responses
2. **React Hooks**: `useChat` handles all state management
3. **Type Safety**: Full TypeScript support
4. **Multi-Provider**: Easy to switch from OpenAI to Anthropic
5. **Vercel Integration**: Optimized for Next.js deployment

## Next.js & React

### Next.js 16

**Key Features Used**:

#### 1. App Router

Modern routing system:

```
app/
  page.tsx           → / (home page)
  layout.tsx         → Root layout
  api/
    chat/
      route.ts       → /api/chat (API endpoint)
```

**Benefits**:
- File-system based routing
- Co-located API routes
- Server and client components
- Layouts and templates

#### 2. Server Components

```typescript
// Server Component (default)
export default function Layout({ children }) {
    // Runs on server
    // Can access databases directly
    return <div>{children}</div>;
}
```

#### 3. Client Components

```typescript
"use client";  // Must specify

export default function ChatPage() {
    // Runs in browser
    // Can use hooks, event handlers
    const { messages } = useChat();
    return <div>...</div>;
}
```

**F1Bot Usage**:
- `app/page.tsx`: Client component (needs useChat hook)
- `app/api/chat/route.ts`: Server-side API route (accesses Astra DB)

#### 4. API Routes

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
    const { messages } = await req.json();
    // Process with RAG
    return new Response(stream);
}
```

**Advantages**:
- Co-located with frontend code
- TypeScript across stack
- Easy deployment
- Built-in serverless functions (on Vercel)

### React 19

**Key Features**:
- Concurrent rendering
- Automatic batching
- Server components
- Suspense improvements

**F1Bot Usage**:
- Component-based UI
- Hooks for state management
- Streaming UI updates

## Puppeteer

### Overview

Puppeteer is a Node library providing a high-level API to control Chrome/Chromium over the DevTools Protocol.

**Website**: https://pptr.dev/
**License**: Apache 2.0
**Version Used**: 24.30.0

### Usage in F1Bot

**Purpose**: Web scraping for RAG data ingestion

```typescript
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
        headless: true,  // No GUI
    },
    gotoOptions: {
        waitUntil: "domcontentloaded",  // Wait for DOM
    },
    evaluate: async (page, browser) => {
        const result = await page.evaluate(() => {
            // Runs in browser context
            // Remove unwanted elements
            document.querySelectorAll('nav').forEach(el => el.remove());

            // Extract main content
            return document.querySelector('main')?.textContent;
        });

        await browser.close();
        return result;
    }
});
```

### Why Puppeteer?

**Comparison**:

| Tool | Pros | Cons | Decision |
|------|------|------|----------|
| **Puppeteer** | Mature, reliable, good docs | Larger dependency | ✅ Industry standard |
| Playwright | More features, multi-browser | Heavier, overkill | ❌ Don't need extra features |
| Cheerio | Fast, lightweight | Can't handle JS | ❌ F1 sites use JavaScript |
| jsdom | Simple, no browser | Limited JS support | ❌ Not reliable enough |

**Key Capabilities**:
- Execute JavaScript on page
- Wait for dynamic content
- Manipulate DOM before extraction
- Handle single-page apps (SPAs)

### Performance Considerations

**Optimization Strategies**:

```typescript
{
    headless: true,              // No GUI = faster
    waitUntil: "domcontentloaded", // Don't wait for all resources

    // Could add:
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
    ],
}
```

**Trade-offs**:
- Speed: ~2-5 seconds per page
- Accuracy: High (executes JS like real browser)
- Resource usage: ~100-200MB RAM per page
- For 20 pages: ~2 minutes total scraping time

## TypeScript

### Overview

TypeScript adds static typing to JavaScript, catching errors at compile time.

**Website**: https://www.typescriptlang.org/
**License**: Apache 2.0
**Version Used**: 5.x

### Configuration

**tsconfig.json** (excerpts):

```json
{
    "compilerOptions": {
        "target": "ES2017",
        "lib": ["ES2017", "DOM"],
        "module": "esnext",
        "moduleResolution": "bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "paths": {
            "@/*": ["./*"]
        }
    }
}
```

### Type Safety Examples

**API Route**:
```typescript
// Strong typing prevents errors
export async function POST(req: Request): Promise<Response> {
    const { messages }: { messages: UIMessage[] } = await req.json();
    //                    ^^^^^^^^^^^^^^^^^^^^^^^^
    //                    Type annotation ensures correct structure

    return result.toTextStreamResponse();
}
```

**Component Props**:
```typescript
interface BubbleProps {
    message: UIMessage;
}

export default function Bubble({ message }: BubbleProps) {
    // TypeScript ensures message has expected structure
    return <div>{message.content}</div>;
}
```

**Benefits for F1Bot**:
- Catch bugs before runtime
- Better IDE autocomplete
- Self-documenting code
- Safer refactoring

## Technology Comparison & Alternatives

### RAG Framework Alternatives

| Framework | Language | Strengths | Weaknesses | Best For |
|-----------|----------|-----------|------------|----------|
| **LangChain** | Python/JS | Mature, comprehensive | Complex, opinionated | Production RAG systems |
| LlamaIndex | Python/JS | RAG-focused, simple | Less flexible | RAG-only applications |
| Haystack | Python | Modular, NLP tools | Python-only, steep learning curve | Research projects |
| Custom | Any | Full control | Time-consuming | Specific requirements |

**F1Bot Choice**: LangChain.js for preprocessing + custom RAG logic for runtime

### Vector Database Alternatives

| Database | Deployment | Performance | Features | Cost | Best For |
|----------|------------|-------------|----------|------|----------|
| **Astra DB** | Managed | Excellent | Full-featured | Free tier | Small-medium projects |
| Pinecone | Managed | Excellent | Vector-specific | Expensive | Production apps |
| Weaviate | Self-hosted | Good | ML features | Free (self-host) | ML-heavy apps |
| pgvector | Self-hosted | Moderate | Simple | Free (Postgres) | Postgres users |
| Qdrant | Both | Excellent | Feature-rich | Free/paid | High performance needs |

### LLM Provider Alternatives

| Provider | Models | Pricing | API Quality | Best For |
|----------|--------|---------|-------------|----------|
| **OpenAI** | GPT-4, GPT-3.5 | High | Excellent | Best quality needed |
| Anthropic | Claude 3 | Medium | Excellent | Long context, safety |
| Google | Gemini | Medium | Good | Multimodal needs |
| Open Source | Llama, Mistral | Free* | Varies | Budget constraints, privacy |

*Self-hosting costs apply

## Conclusion

F1Bot's technology stack represents a carefully selected combination of tools that work together seamlessly:

1. **OpenAI**: Industry-leading embeddings and language generation
2. **LangChain**: Battle-tested document processing
3. **Astra DB**: Scalable managed vector storage
4. **Vercel AI SDK**: Modern streaming and React integration
5. **Next.js**: Full-stack framework with great DX
6. **Puppeteer**: Reliable web scraping
7. **TypeScript**: Type safety and better tooling

Each technology was chosen to optimize for:
- **Academic project requirements**: Easy setup, good documentation, free tiers
- **Developer experience**: Modern APIs, good TypeScript support
- **Performance**: Fast queries, streaming responses
- **Scalability**: Room to grow beyond initial dataset
- **Maintainability**: Well-documented, community support

The stack could be adapted for production by:
- Adding caching layers (Redis)
- Implementing rate limiting
- Setting up monitoring (Datadog, Sentry)
- Adding authentication
- Optimizing costs (smaller models, batching)
