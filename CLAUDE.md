# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1Bot is a RAG (Retrieval-Augmented Generation) chatbot built with:
- **Next.js 16** - React framework with Pages Router
- **TypeScript** - Type-safe development
- **LangChain.js** - Framework for building LLM applications (to be added)
- **OpenAI** - LLM provider (to be added)

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Project Structure

```
pages/               # Next.js Pages Router
  index.tsx         # Home page
  _app.tsx          # Custom App component
  _document.tsx     # Custom Document
  api/              # API routes
styles/             # CSS modules and global styles
public/             # Static assets
```

## Architecture

### RAG Pipeline (To Be Implemented)
The core architecture will follow a typical RAG pattern:

1. **Document Ingestion** - Process and chunk F1-related documents for embedding
2. **Vector Storage** - Store embeddings in a vector database for similarity search
3. **Retrieval** - User queries retrieve relevant document chunks via semantic search
4. **Generation** - Retrieved context is passed to OpenAI along with user query to generate responses

### Key Components
- **API Routes** - Create endpoints in `pages/api/` for:
  - `pages/api/chat.ts` - Chat endpoint with streaming support
  - `pages/api/ingest.ts` - Document ingestion endpoint
- **LangChain Integration** - Will manage document loaders, text splitters, embeddings, and chains
- **Vector Store** - Will store and retrieve document embeddings (consider Pinecone, Supabase pgvector, or Vercel Postgres)

## Next Steps for Implementation

1. Install LangChain dependencies:
   ```bash
   npm install langchain @langchain/openai @langchain/community
   ```

2. Install vector store client (choose one):
   ```bash
   npm install @pinecone-database/pinecone  # For Pinecone
   # OR
   npm install @supabase/supabase-js        # For Supabase
   ```

3. Create API routes in `pages/api/`:
   - Chat endpoint with streaming
   - Document ingestion endpoint

4. Set up environment variables in `.env.local`:
   ```
   OPENAI_API_KEY=your_key_here
   # Add vector database credentials
   ```

## Development Notes

### Next.js Pages Router
- All pages are in the `pages/` directory
- API routes are serverless functions in `pages/api/`
- Use `getServerSideProps` or `getStaticProps` for data fetching
- Client-side state management for chat interface

### LangChain.js Patterns
- Use built-in document loaders for consistent document processing
- Leverage RecursiveCharacterTextSplitter for chunking documents
- Implement streaming responses with OpenAI for better UX
- Proper error handling for LLM and vector database operations
