# DropLit Integration Guide

This guide explains how to integrate DropLit with Syntrise CORE.

## Overview

```
DropLit (PWA)
    │
    ├── On save drop ──────► /api/drops/sync
    │
    ├── On Aski chat ──────► /api/ai/chat
    │
    └── On search ─────────► /api/drops/search
```

## Setup

### 1. Environment Variables

Add to DropLit's configuration:

```javascript
const SYNTRISE_URL = 'https://syntrise-core.vercel.app';
const SYNTRISE_ENABLED = true;
```

### 2. Authentication

DropLit needs to authenticate users via Supabase:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ughfdhmyflotgsysvrrc.supabase.co',
  'your-anon-key'
);

// Get access token for API calls
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}
```

## Integration Points

### 1. Sync Drops on Save

When a drop is created or updated, sync to Syntrise CORE:

```javascript
async function syncDrop(drop) {
  if (!SYNTRISE_ENABLED) return;
  
  const token = await getToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${SYNTRISE_URL}/api/drops/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        drops: [{
          id: drop.id,
          content: drop.text,
          category: drop.category,
          tags: drop.tags || [],
          created_at: drop.created
        }]
      })
    });
    
    const result = await response.json();
    console.log('Synced to Syntrise:', result);
    
  } catch (error) {
    console.error('Sync failed:', error);
    // Queue for retry
    queueForRetry(drop);
  }
}
```

### 2. Enhanced Aski Chat

Replace direct Claude API call with Syntrise CORE:

```javascript
async function askiChat(message, conversationId = null) {
  const token = await getToken();
  
  // If no token, fall back to basic Claude
  if (!token || !SYNTRISE_ENABLED) {
    return basicClaudeChat(message);
  }
  
  try {
    const response = await fetch(`${SYNTRISE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        include_context: true
      })
    });
    
    const result = await response.json();
    
    return {
      text: result.message,
      conversationId: result.conversation_id,
      contextUsed: result.context_used
    };
    
  } catch (error) {
    console.error('Syntrise chat failed:', error);
    return basicClaudeChat(message);
  }
}
```

### 3. Semantic Search

Add voice search for drops:

```javascript
async function searchDrops(query) {
  const token = await getToken();
  if (!token) return [];
  
  try {
    const response = await fetch(`${SYNTRISE_URL}/api/drops/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        limit: 5,
        threshold: 0.7
      })
    });
    
    const result = await response.json();
    return result.results || [];
    
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
```

### 4. Idea Collision Detection

Check for similar ideas when saving a drop:

```javascript
async function checkSimilarDrops(dropId) {
  const token = await getToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${SYNTRISE_URL}/api/drops/similar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        drop_id: dropId,
        threshold: 0.75,
        limit: 3
      })
    });
    
    const result = await response.json();
    
    if (result.similar_drops?.length > 0) {
      // Show notification to user
      showSimilarIdeasNotification(result.similar_drops);
    }
    
    return result.similar_drops;
    
  } catch (error) {
    console.error('Similar check failed:', error);
    return null;
  }
}
```

## User Authentication Flow

### Sign Up

```javascript
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw error;
  return data.user;
}
```

### Sign In

```javascript
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data.user;
}
```

### Sign Out

```javascript
async function signOut() {
  await supabase.auth.signOut();
}
```

### Listen for Auth Changes

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Enable Syntrise features
    SYNTRISE_ENABLED = true;
    syncAllLocalDrops();
  } else if (event === 'SIGNED_OUT') {
    SYNTRISE_ENABLED = false;
  }
});
```

## Offline Support

DropLit should work offline and sync when back online:

```javascript
// Queue drops for sync when offline
const syncQueue = [];

async function queueForRetry(drop) {
  syncQueue.push(drop);
  localStorage.setItem('syntrise_queue', JSON.stringify(syncQueue));
}

// Sync queue when back online
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('syntrise_queue') || '[]');
  
  for (const drop of queue) {
    await syncDrop(drop);
  }
  
  localStorage.removeItem('syntrise_queue');
});
```

## Error Handling

Always have fallbacks:

```javascript
async function withFallback(syntriseCall, fallbackCall) {
  try {
    return await syntriseCall();
  } catch (error) {
    console.warn('Syntrise unavailable, using fallback:', error);
    return await fallbackCall();
  }
}

// Usage
const response = await withFallback(
  () => askiChat(message),
  () => basicClaudeChat(message)
);
```
