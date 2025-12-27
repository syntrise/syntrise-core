# Syntrise CORE API Documentation

## Authentication

All API endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_access_token>
```

Get this token from Supabase Auth after user login.

---

## Endpoints

### Drops

#### POST /api/drops/sync

Sync drops from DropLit to Syntrise CORE.

**Request:**
```json
{
  "drops": [
    {
      "id": "droplit-123",
      "content": "My idea about...",
      "category": "ideas",
      "tags": ["startup", "ai"],
      "created_at": "2025-12-28T12:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync completed",
  "results": {
    "synced": 1,
    "embedded": 1,
    "errors": []
  }
}
```

---

#### POST /api/drops/search

Semantic search across user's drops.

**Request:**
```json
{
  "query": "ideas about AI assistants",
  "limit": 5,
  "threshold": 0.7,
  "category": null
}
```

**Response:**
```json
{
  "success": true,
  "query": "ideas about AI assistants",
  "results": [
    {
      "id": "uuid",
      "content": "Aski should remember...",
      "category": "ideas",
      "similarity": 0.85,
      "created_at": "2025-12-28T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

#### POST /api/drops/similar

Find drops similar to a given drop (Idea Collision Detection).

**Request:**
```json
{
  "drop_id": "uuid",
  "limit": 5,
  "threshold": 0.75
}
```

**Response:**
```json
{
  "success": true,
  "source_drop": {
    "id": "uuid",
    "content": "Original idea..."
  },
  "similar_drops": [
    {
      "id": "uuid2",
      "content": "Similar idea...",
      "similarity": 0.82
    }
  ],
  "count": 1
}
```

---

### Memory

#### POST /api/memory/store

Store information to user's long-term memory.

**Request:**
```json
{
  "key": "preferences",
  "value": {
    "communication_style": "casual",
    "language": "en"
  },
  "source": "conversation",
  "confidence": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "message": "Memory stored",
  "memory": {
    "id": "uuid",
    "key": "preferences",
    "value": {...}
  }
}
```

---

#### GET /api/memory/retrieve

Retrieve user's stored memory.

**Query params:**
- `key` (optional): Specific memory key to retrieve

**Response (all):**
```json
{
  "success": true,
  "memories": [...],
  "count": 5
}
```

**Response (specific key):**
```json
{
  "success": true,
  "memory": {
    "key": "preferences",
    "value": {...}
  }
}
```

---

#### POST /api/memory/context

Build context for AI from user's drops and memory.

**Request:**
```json
{
  "message": "User's current message",
  "include_drops": true,
  "include_memory": true
}
```

**Response:**
```json
{
  "success": true,
  "system_prompt": "You are Aski... [with context]",
  "context": {
    "relevant_drops": [...],
    "memory_keys": ["preferences", "domain_terms"],
    "recent_conversations": 3
  }
}
```

---

### AI

#### POST /api/ai/chat

Chat with Aski with full context.

**Request:**
```json
{
  "message": "What did I think about AI last week?",
  "conversation_id": null,
  "include_context": true,
  "model": "claude-sonnet-4-20250514"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Last week you mentioned...",
  "conversation_id": "uuid",
  "context_used": {
    "drops": 3,
    "memory_keys": 2
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-12-28T12:00:00Z"
}
```

Common status codes:
- `400` - Bad request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (access denied)
- `404` - Not found
- `405` - Method not allowed
- `500` - Internal server error
