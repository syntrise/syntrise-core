# Syntrise CORE

> Cognitive Layer for Complex Systems — AI-powered memory and context engine

## Overview

Syntrise CORE is the brain behind the Syntrise ecosystem:

- **Persistent Memory**: Ideas never forgotten, always retrievable
- **Semantic Search**: Find by meaning, not keywords
- **Idea Collision Detection**: Discover connections
- **Personalized AI**: Aski learns your style
- **Cross-Language Context**: Remember across languages

## Architecture

```
┌─────────────────────────────────────────┐
│            SYNTRISE CORE                │
├─────────────────────────────────────────┤
│  DropLit ──▶ API ──▶ Claude            │
│              │                          │
│         ┌────┴────┐                    │
│         ▼         ▼                    │
│     Supabase   Vectors                 │
│    (Postgres) (pgvector)               │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
git clone https://github.com/syntrise/syntrise-core.git
cd syntrise-core
npm install
cp .env.example .env.local
# Fill in your keys
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/drops/sync` | POST | Sync drops from DropLit |
| `/api/drops/search` | POST | Semantic search |
| `/api/memory/store` | POST | Store user memory |
| `/api/memory/retrieve` | GET | Get user context |
| `/api/ai/chat` | POST | Enhanced Aski with RAG |

## Deploy

```bash
vercel --prod
```

## Environment Variables

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Public key
- `SUPABASE_SERVICE_ROLE_KEY` — Service key
- `ANTHROPIC_API_KEY` — Claude API
- `OPENAI_API_KEY` — Embeddings

## License

MIT — Syntrise Inc.

*"Stop scrolling. Start thinking."*
