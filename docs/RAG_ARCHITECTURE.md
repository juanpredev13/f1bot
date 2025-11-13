# RAG Architecture - Retrieval-Augmented Generation

## Table of Contents
1. [Introduction to RAG](#introduction-to-rag)
2. [System Components](#system-components)
3. [Data Ingestion Pipeline](#data-ingestion-pipeline)
4. [Query Processing Pipeline](#query-processing-pipeline)
5. [Vector Search Mechanics](#vector-search-mechanics)
6. [Response Generation](#response-generation)
7. [Performance Optimization](#performance-optimization)
8. [Challenges and Solutions](#challenges-and-solutions)

## Introduction to RAG

### What is RAG?

Retrieval-Augmented Generation (RAG) is an AI framework that combines the power of large language models (LLMs) with external knowledge retrieval. Instead of relying solely on the model's pre-trained knowledge, RAG systems:

1. **Retrieve** relevant information from a knowledge base
2. **Augment** the user query with this context
3. **Generate** responses based on both the model's knowledge and retrieved information

### Why RAG for F1Bot?

Traditional LLMs have several limitations that RAG addresses:

| Challenge | LLM Limitation | RAG Solution |
|-----------|---------------|--------------|
| **Knowledge Cutoff** | Training data is frozen at a specific date | Dynamic knowledge base updated with current information |
| **Hallucinations** | Models may generate plausible but incorrect information | Grounds responses in factual retrieved documents |
| **Domain Specificity** | General knowledge may lack depth | Specialized knowledge base with domain-specific information |
| **Transparency** | Difficult to trace source of information | Can reference specific retrieved documents |

For F1Bot, this means:
- ✅ Access to current season information
- ✅ Accurate driver and team data
- ✅ Reduced hallucinations about F1 facts
- ✅ Ability to update knowledge without retraining

## System Components

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      F1Bot RAG System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Data Ingestion  │         │  Query Processing │          │
│  │     Pipeline     │         │     Pipeline      │          │
│  └──────────────────┘         └──────────────────┘          │
│          │                             │                      │
│          │                             │                      │
│          ▼                             ▼                      │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Vector Database │◄────────│  Vector Search   │          │
│  │   (Astra DB)     │         │   Engine         │          │
│  └──────────────────┘         └──────────────────┘          │
│          │                             │                      │
│          │                             ▼                      │
│          │                     ┌──────────────────┐          │
│          │                     │  Context Builder │          │
│          │                     └──────────────────┘          │
│          │                             │                      │
│          │                             ▼                      │
│          │                     ┌──────────────────┐          │
│          └────────────────────►│   LLM (GPT-4)    │          │
│                                └──────────────────┘          │
│                                        │                      │
│                                        ▼                      │
│                                ┌──────────────────┐          │
│                                │  Response Stream │          │
│                                └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Component Descriptions

1. **Data Ingestion Pipeline**: Processes web pages into searchable chunks
2. **Vector Database**: Stores document embeddings for similarity search
3. **Query Processing**: Converts user questions into searchable vectors
4. **Vector Search Engine**: Finds most relevant documents
5. **Context Builder**: Assembles retrieved information
6. **LLM**: Generates human-like responses
7. **Response Stream**: Delivers answers in real-time

## Data Ingestion Pipeline

### Step-by-Step Process

#### 1. Web Scraping

```typescript
URLs → Puppeteer → Raw HTML
```

**Technology**: Puppeteer
**Purpose**: Automated browser to fetch web content
**Configuration**:
- Headless mode for efficiency
- Wait for DOM content loaded
- JavaScript execution enabled

**Code Location**: `scripts/loadDb.ts:102-160`

```typescript
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: { headless: true },
        gotoOptions: { waitUntil: "domcontentloaded" },
        evaluate: async (page, browser) => {
            // Remove navigation elements
            // Extract main content
            // Clean text
        }
    });
};
```

#### 2. Content Extraction

```typescript
Raw HTML → DOM Manipulation → Clean Text
```

**Challenges**:
- Navigation menus
- Sidebar content
- Footer links
- Advertisements
- Script tags

**Solution**: Selective extraction strategy

```typescript
// Elements to remove
const elementsToRemove = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '.navigation',
    '.menu', '.sidebar', '#toc'
];

// Content selectors (priority order)
const contentSelectors = [
    'main', 'article', '[role="main"]',
    '#content', '#mw-content-text'
];
```

#### 3. Text Chunking

```typescript
Clean Text → RecursiveCharacterTextSplitter → Chunks
```

**Technology**: LangChain RecursiveCharacterTextSplitter
**Configuration**:
- Chunk size: 512 characters
- Overlap: 100 characters

**Why these values?**

| Metric | Value | Rationale |
|--------|-------|-----------|
| **Chunk Size** | 512 chars | Balance between context and precision. Small enough for focused retrieval, large enough for coherent context |
| **Overlap** | 100 chars | Prevents information loss at chunk boundaries. Ensures continuity of concepts split across chunks |

**Example**:
```
Original text (1200 chars):
"Max Verstappen is a Dutch racing driver... [512 chars] ...
Red Bull Racing... [412 chars] ... championship victories..."

Becomes 3 chunks:
Chunk 1: chars 0-512
Chunk 2: chars 412-924 (overlaps 100 with chunk 1)
Chunk 3: chars 824-1200 (overlaps 100 with chunk 2)
```

#### 4. Embedding Generation

```typescript
Chunks → OpenAI Embeddings API → Vectors (1536 dimensions)
```

**Technology**: OpenAI text-embedding-3-small
**Input**: Text chunk (max 8191 tokens)
**Output**: 1536-dimensional vector

**What are embeddings?**

Embeddings convert text into high-dimensional vectors where semantically similar texts have vectors close together in vector space.

```
"Max Verstappen" → [0.123, -0.456, 0.789, ..., 0.234] (1536 numbers)
"Lewis Hamilton" → [0.118, -0.448, 0.792, ..., 0.229] (similar vector)
"Pizza recipe"   → [-0.823, 0.234, -0.567, ..., 0.891] (different vector)
```

**Code**:
```typescript
const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunk,
    encoding_format: "float",
});
const vector = embedding.data[0].embedding; // 1536 numbers
```

#### 5. Database Storage

```typescript
Vectors + Text → Astra DB → Indexed Collection
```

**Storage Format**:
```json
{
    "$vector": [0.123, -0.456, ..., 0.234],  // 1536 dimensions
    "text": "Max Verstappen is a Dutch racing driver..."
}
```

**Database Configuration**:
- Collection: `f1gpt`
- Vector dimensions: 1536
- Similarity metric: Dot Product
- Index: Automatic vector indexing

## Query Processing Pipeline

### Step-by-Step Process

#### 1. User Input Reception

```typescript
User Interface → useChat Hook → API Route
```

**Flow**:
1. User types question in chat interface
2. `useChat` hook from Vercel AI SDK manages state
3. Message sent to `/api/chat` endpoint via POST request

**Code Location**: `app/page.tsx:11`

```typescript
const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' })
});
```

#### 2. Message Extraction

```typescript
Request Body → Message Parsing → User Query Text
```

**Challenge**: Messages can have different structures (UIMessage format with parts)

**Solution**: Flexible extraction logic

```typescript
const lastMessage = messages[messages.length - 1];
let userQuery = "";

if (lastMessage?.parts) {
    const textParts = lastMessage.parts.filter(part => part.type === "text");
    userQuery = textParts.map(part => part.text).join("");
} else if (lastMessage?.content) {
    userQuery = lastMessage.content;
}
```

**Code Location**: `app/api/chat/route.ts:26-34`

#### 3. Query Embedding

```typescript
User Query → OpenAI Embeddings API → Query Vector
```

Same process as document embedding, but for the user's question:

```typescript
const embeddingResponse = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuery,
});
const queryEmbedding = embeddingResponse.data[0].embedding;
```

**Example**:
```
Query: "Who is the current F1 champion?"
→ Vector: [0.234, -0.567, 0.890, ..., 0.123] (1536 dims)
```

## Vector Search Mechanics

### Similarity Search Process

#### 1. Vector Comparison

**Concept**: Find documents whose vectors are most similar to the query vector

**Similarity Metric**: Dot Product

```
similarity = query_vector · document_vector
           = Σ(query[i] × document[i])
```

**Why Dot Product?**
- Fast computation
- Works well with normalized vectors
- Captures semantic similarity effectively

#### 2. Database Query

```typescript
const searchResults = await collection.find(
    {},
    {
        sort: { $vector: queryEmbedding },
        limit: 5,
    }
).toArray();
```

**Astra DB Process**:
1. Receives query vector
2. Computes similarity with all document vectors (optimized with indexing)
3. Returns top-K most similar documents
4. Sorted by similarity score (highest first)

**Performance**:
- Indexing enables sub-linear search time
- Typical query time: 50-200ms for thousands of documents

#### 3. Result Ranking

Top 5 documents are returned, ordered by relevance:

```
Results:
1. Similarity: 0.92 - "Max Verstappen won the 2024 championship..."
2. Similarity: 0.88 - "Verstappen clinched his fourth title..."
3. Similarity: 0.85 - "The Dutch driver dominated the season..."
4. Similarity: 0.81 - "Red Bull Racing celebrates another..."
5. Similarity: 0.79 - "Championship standings show Verstappen..."
```

## Response Generation

### Context Assembly

#### 1. Document Context Building

```typescript
const docContext = searchResults
    .map((doc: any) => doc.text)
    .join("\n\n");
```

Retrieved documents are concatenated with double newlines for separation.

**Example Context**:
```
Max Verstappen won the 2024 Formula One World Championship...

Verstappen clinched his fourth consecutive title in Las Vegas...

The Dutch driver dominated the season with 19 victories...
```

#### 2. System Prompt Construction

```typescript
const systemPrompt = `You are an AI assistant who knows everything about Formula One.
Use the below context to augment what you know about Formula One racing.
The context will provide you with the most recent page data from wikipedia,
the official F1 website and others.

If the context doesn't include the information you need answer based on your
existing knowledge and don't mention the source of your information or
what the context does or doesn't include.

----------
START CONTEXT
${docContext}
END CONTEXT
----------`;
```

**Key Instructions**:
- Use retrieved context when available
- Fall back to model knowledge if needed
- Don't mention the context system to users
- Format responses in markdown

### LLM Invocation

#### GPT-4 Streaming

```typescript
const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
});
```

**Process**:
1. System prompt with context sent to GPT-4
2. Conversation history included
3. Model generates response token by token
4. Tokens streamed back to client

**Why Streaming?**
- Improved perceived performance
- Better user experience (see response forming)
- Lower time-to-first-token
- Can show progress for long responses

### Response Delivery

```typescript
return result.toTextStreamResponse();
```

**Flow**:
```
GPT-4 → Token Stream → API Response → useChat Hook → UI Update
```

**User Experience**:
- Sees response appear word-by-word
- Loading indicator shows streaming status
- Can read beginning while rest generates

## Performance Optimization

### Caching Strategy

**What's Cached**: Embeddings in database
**Not Cached**: LLM responses (always fresh)

**Benefits**:
- Don't recompute embeddings for same documents
- Query embeddings computed once per query
- Reduces API calls to OpenAI

### Chunking Optimization

**Trade-offs**:

| Smaller Chunks (256) | Current (512) | Larger Chunks (1024) |
|---------------------|---------------|----------------------|
| More precise retrieval | Balanced | More context |
| May miss context | Good balance | May include noise |
| More API calls | Moderate | Fewer API calls |
| Higher cost | Medium cost | Lower cost |

**Overlap Benefits**:
- Prevents concept splitting
- Improves retrieval quality
- Minimal storage overhead (100/512 = ~20%)

### Database Indexing

**Astra DB Automatic Indexing**:
- Creates vector index on `$vector` field
- Enables fast similarity search
- O(log n) search instead of O(n)

## Challenges and Solutions

### Challenge 1: Web Scraping Quality

**Problem**: Web pages contain navigation, ads, scripts

**Solution**:
```typescript
// Remove unwanted elements
const elementsToRemove = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '.navigation',
    '.menu', '.sidebar', '.toc'
];

// Extract main content only
const contentSelectors = [
    'main', 'article', '[role="main"]',
    '#content', '#mw-content-text'
];
```

### Challenge 2: Context Window Limits

**Problem**: GPT-4 has token limits (8K-128K depending on version)

**Solution**:
- Limit retrieved documents to top 5
- Use chunk size of 512 characters
- Total context: ~2560 characters (~640 tokens)
- Leaves plenty of room for conversation history and response

### Challenge 3: Relevance vs Coverage

**Problem**: Balance between precision and recall

**Solution**:
- Top-K = 5 provides good balance
- Higher K = more coverage but more noise
- Lower K = more precise but may miss relevant info

**Tested Values**:
- K=3: Too restrictive, missed relevant info
- K=5: Optimal balance ✅
- K=10: Too much noise, slower generation

### Challenge 4: Stale Data

**Problem**: Information becomes outdated

**Solution**:
- Manual update via `npm run reseed`
- Future: Automated periodic updates
- Scrape from authoritative sources (Wikipedia, official sites)

### Challenge 5: Cost Management

**Problem**: OpenAI API costs can add up

**Optimization Strategies**:
1. **Embedding Caching**: Store in database, don't regenerate
2. **Efficient Chunking**: Balance quality and quantity
3. **Model Selection**:
   - Embeddings: text-embedding-3-small (cheaper, still effective)
   - Generation: GPT-4 (best quality)
4. **Query Optimization**: Only embed query once
5. **Batch Processing**: During data ingestion, process multiple chunks efficiently

**Cost Breakdown** (approximate):
- text-embedding-3-small: $0.00002 / 1K tokens
- GPT-4: $0.03 / 1K tokens (input), $0.06 / 1K tokens (output)

**Example Query Cost**:
- Query embedding: ~$0.00001
- Context (5 docs × 512 chars): ~$0.003
- Response (200 tokens): ~$0.012
- **Total per query**: ~$0.015

## Conclusion

The F1Bot RAG architecture successfully combines:

1. **Efficient Data Ingestion**: Web scraping → Chunking → Embedding → Storage
2. **Fast Retrieval**: Vector similarity search in sub-200ms
3. **Quality Generation**: GPT-4 with relevant context produces accurate responses
4. **Good UX**: Streaming responses for perceived performance
5. **Scalability**: Can handle thousands of documents with room to grow

**Key Metrics**:
- Query latency: 5-10 seconds (including LLM generation)
- Retrieval accuracy: High relevance with top-5 results
- Response quality: Grounded in factual data
- Cost per query: ~$0.015

This architecture can be adapted for other domain-specific chatbots by changing the data sources and adjusting parameters as needed.
