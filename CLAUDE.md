# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1Bot is a RAG (Retrieval-Augmented Generation) chatbot that provides instant, up-to-date Formula One information using:
- **Next.js 16** with App Router
- **TypeScript** - Type-safe development
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) - LLM integration with streaming
- **LangChain.js** - Document processing and text splitting
- **Astra DB** (DataStax) - Vector database for semantic search
- **OpenAI** - Embeddings (text-embedding-3-small) and chat completions (GPT-4)
- **Puppeteer** - Web scraping for F1 data

## Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed vector database with F1 data (scripts/loadDb.ts)
```

## Architecture

### RAG Pipeline

The application implements a complete RAG pipeline:

1. **Document Ingestion** (`scripts/loadDb.ts`)
   - Scrapes F1 websites using Puppeteer
   - Chunks text with RecursiveCharacterTextSplitter (512 chars, 100 overlap)
   - Generates embeddings with OpenAI text-embedding-3-small (1536 dimensions)
   - Stores in Astra DB vector collection with dot_product similarity metric

2. **Query Flow** (`app/api/chat/route.ts`)
   - User query → Generate embedding → Vector search (top 5 results)
   - Retrieved context injected into system prompt
   - Streaming response via Vercel AI SDK's `streamText()`
   - Uses GPT-4 with augmented context

3. **Frontend** (`app/page.tsx`)
   - Client component using `useChat()` hook from `@ai-sdk/react`
   - Real-time streaming display with custom Bubble components
   - Message format uses UIMessage with parts structure

### Environment Variables

Required in `.env`:
```
ASTRA_DB_NAMESPACE          # Astra DB keyspace
ASTRA_DB_COLLECTION         # Collection name for vectors
ASTRA_DB_API_ENDPOINT       # Astra DB endpoint URL
ASTRA_DB_APPLICATION_TOKEN  # Astra DB auth token
OPENAI_API_KEY              # OpenAI API key
```

### Project Structure

```
app/
  page.tsx              # Main chat UI (client component)
  layout.tsx            # Root layout
  global.css            # Global styles
  components/           # React components
    Bubble.tsx          # Message display
    LoadingBubble.tsx   # Loading indicator
    PromptSuggestionsRow.tsx
    PromptSuggestionButtom.tsx
  api/
    chat/
      route.ts          # POST endpoint for chat with RAG
scripts/
  loadDb.ts             # Vector DB seeding script
types/                  # TypeScript type definitions
```

### Key Implementation Details

- **Vercel AI SDK Integration**: Uses `streamText()` with `convertToModelMessages()` to handle UI message format conversion
- **Vector Search**: Astra DB collection.find() with `$vector` sort for similarity search
- **Message Structure**: Messages have a `parts` array where each part has `type` and `text` properties
- **Streaming**: API route returns `result.toTextStreamResponse()` which the `useChat()` hook processes automatically
- **TypeScript Config**: Uses `target: ES2017` and `module: esnext` with paths alias `@/*` pointing to root
- **ts-node**: Configured with `module: commonjs` for scripts execution
