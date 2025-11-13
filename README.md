# F1Bot - AI-Powered Formula 1 Chatbot with RAG

![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

An intelligent AI chatbot that provides accurate and up-to-date Formula 1 information using Retrieval-Augmented Generation (RAG).

## Project Overview

F1Bot is a web application developed as an academic project demonstrating the implementation of a complete RAG (Retrieval-Augmented Generation) system. The bot combines GPT-4's language generation capabilities with a vector database containing up-to-date Formula 1 information, enabling it to answer questions with specific context and recent data.

### Key Features

- **Real-time chat** with streaming responses
- **Updateable knowledge base** via web scraping
- **Semantic search** using vector embeddings
- **Modern and responsive interface** with Next.js 16
- **Scalable architecture** with TypeScript

## Technologies Used

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Static typing
- **Vercel AI SDK** - LLM integration and streaming

### Backend & AI
- **OpenAI GPT-4** - Language model
- **OpenAI Embeddings** (text-embedding-3-small) - Vector generation
- **LangChain.js** - Document processing pipeline
- **DataStax Astra DB** - Vector database

### Development Tools
- **Puppeteer** - Automated web scraping
- **ts-node** - TypeScript script execution

## System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    User     │ ───> │   Next.js    │ ───> │   OpenAI    │
│  (Browser)  │ <─── │   Frontend   │ <─── │    GPT-4    │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │  API Route   │ ───> │  Astra DB   │
                     │  /api/chat   │ <─── │  (Vectors)  │
                     └──────────────┘      └─────────────┘
                            │
                            │
                     ┌──────▼──────┐
                     │  Embeddings │
                     │   OpenAI    │
                     └─────────────┘
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- OpenAI account with API key
- DataStax Astra DB account

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd f1bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the project root:

```env
# Astra DB Configuration
ASTRA_DB_NAMESPACE="default_keyspace"
ASTRA_DB_COLLECTION="f1gpt"
ASTRA_DB_API_ENDPOINT="your-astra-db-endpoint"
ASTRA_DB_APPLICATION_TOKEN="your-astra-token"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
```

4. **Load initial data**

This step downloads and processes F1 information from multiple web sources:

```bash
npm run seed
```

This process will take 10-15 minutes and load information about:
- F1 history and rules
- Current teams
- Featured drivers
- Recent seasons
- Technical aspects

## Usage

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build application for production |
| `npm start` | Start production server |
| `npm run seed` | Load data into vector database |
| `npm run clear-db` | Delete all data from database |
| `npm run check-db` | Verify database contents |
| `npm run reseed` | Clear and reload all data |
| `npm run lint` | Run linter |

## Project Structure

```
f1bot/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API endpoint with RAG logic
│   ├── components/
│   │   ├── Bubble.tsx             # Message component
│   │   ├── LoadingBubble.tsx      # Loading indicator
│   │   ├── PromptSuggestionButton.tsx
│   │   └── PromptSuggestionsRow.tsx
│   ├── page.tsx                   # Main chat page
│   ├── layout.tsx                 # Root layout
│   └── global.css                 # Global styles
├── scripts/
│   ├── loadDb.ts                  # Data loading script
│   ├── clearDb.ts                 # Database cleanup script
│   └── checkDb.ts                 # Database verification script
├── docs/                          # Technical documentation
├── types/                         # TypeScript type definitions
├── .env                           # Environment variables (not in git)
├── package.json
├── tsconfig.json
└── README.md
```

## RAG Pipeline (Retrieval-Augmented Generation)

### 1. Data Ingestion

```typescript
Web Pages → Puppeteer → HTML → Text Extraction →
Text Splitter → Chunks (512 chars) → OpenAI Embeddings →
Vectors (1536 dims) → Astra DB
```

### 2. Query Flow

```typescript
User Question → OpenAI Embeddings → Query Vector →
Astra DB Similarity Search → Top 5 Results →
Context Injection → GPT-4 → Streaming Response → User
```

## Additional Documentation

For more detailed technical information, see:

- [RAG Architecture](./docs/RAG_ARCHITECTURE.md) - In-depth explanation of the RAG system
- [Technologies & Libraries](./docs/TECHNOLOGIES.md) - Analysis of tools used
- [Implementation Guide](./docs/IMPLEMENTATION.md) - Technical implementation details

## Technical Specifications

### Vector Search

- **Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Metric**: Dot Product
- **Top-K**: 5 most relevant results
- **Chunk size**: 512 characters with 100 character overlap

### Response Generation

- **Model**: GPT-4
- **Mode**: Streaming
- **Context window**: System prompt + 5 relevant documents
- **Format**: Markdown

### Document Processing

- **Sources**: 20+ Wikipedia pages and official sites
- **Cleaning**: Removal of navigation elements and scripts
- **Updates**: Manual via scripts

## Development Considerations

### Performance

- Embeddings cached in database
- Response streaming for improved UX
- Optimized chunking for precision/context balance

### Scalability

- Astra DB supports millions of vectors
- Stateless API for easy horizontal scaling
- Can integrate more data sources without architectural changes

### Limitations

- Data requires manual updates
- Dependent on external API availability (OpenAI, Astra DB)
- Cost per OpenAI API usage

## Future Improvements

- [ ] Automatic data updates via cron jobs
- [ ] Caching system for frequent queries
- [ ] Multi-language support
- [ ] Persistent conversation history
- [ ] Usage metrics and analytics
- [ ] Model fine-tuning with F1-specific data
- [ ] Integration with real-time APIs (race results)

## Contributing

This is an academic project, but suggestions and improvements are welcome.

## License

MIT License - See LICENSE file for details

## Author

Project developed as part of academic work on RAG systems and conversational AI.

## Acknowledgments

- OpenAI for embeddings and GPT-4 APIs
- DataStax for Astra DB
- Vercel for the AI SDK
- LangChain community
- Wikipedia and F1 sites for information

## Contact

For questions or comments about this academic project, please open an issue in the repository.

---

**Note**: This project is for educational and demonstrative purposes only.
