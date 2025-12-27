-- ============================================
-- SYNTRISE CORE v0.1 — Database Schema
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE: profiles (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: drops (synced from DropLit)
-- ============================================
CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,                    -- ID from DropLit
  content TEXT NOT NULL,
  category TEXT DEFAULT 'uncategorized',
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'droplit',       -- droplit, manual, import
  language TEXT DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, external_id)
);

-- ============================================
-- TABLE: embeddings (vectors for semantic search)
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE,
  embedding vector(1536),              -- OpenAI text-embedding-3-small dimensions
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: conversations (chat history with Aski)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]',
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: memory (long-term user memory)
-- ============================================
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                   -- 'preferences', 'speech_patterns', 'domain_terms'
  value JSONB NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source TEXT,                         -- where we learned this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, key)
);

-- ============================================
-- TABLE: connections (links between ideas)
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  drop_id_1 UUID REFERENCES drops(id) ON DELETE CASCADE,
  drop_id_2 UUID REFERENCES drops(id) ON DELETE CASCADE,
  similarity FLOAT,
  connection_type TEXT DEFAULT 'similar',  -- similar, contradicts, evolves, related
  auto_detected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(drop_id_1, drop_id_2)
);

-- ============================================
-- TABLE: sync_log (track sync status)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                -- 'droplit'
  last_sync_at TIMESTAMPTZ,
  items_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',       -- pending, success, error
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drops_category ON drops(category);
CREATE INDEX IF NOT EXISTS idx_drops_external_id ON drops(external_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_drop_id ON embeddings(drop_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_user_key ON memory(user_id, key);

CREATE INDEX IF NOT EXISTS idx_connections_user ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_drop1 ON connections(drop_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_drop2 ON connections(drop_id_2);

-- ============================================
-- VECTOR INDEX for semantic search
-- ============================================
-- Using ivfflat for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own drops" ON drops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drops" ON drops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drops" ON drops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drops" ON drops FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own embeddings" ON embeddings FOR SELECT 
USING (EXISTS (SELECT 1 FROM drops WHERE drops.id = embeddings.drop_id AND drops.user_id = auth.uid()));
CREATE POLICY "Users can insert own embeddings" ON embeddings FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM drops WHERE drops.id = embeddings.drop_id AND drops.user_id = auth.uid()));

CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memory" ON memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory" ON memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory" ON memory FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own connections" ON connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync_log" ON sync_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync_log" ON sync_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to search drops by semantic similarity
CREATE OR REPLACE FUNCTION search_drops(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.category,
    1 - (e.embedding <=> query_embedding) AS similarity,
    d.created_at
  FROM drops d
  JOIN embeddings e ON e.drop_id = d.id
  WHERE d.user_id = p_user_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find similar drops (for Idea Collision Detection)
CREATE OR REPLACE FUNCTION find_similar_drops(
  p_drop_id UUID,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_embedding vector(1536);
BEGIN
  -- Get the user_id and embedding for the given drop
  SELECT d.user_id, e.embedding INTO v_user_id, v_embedding
  FROM drops d
  JOIN embeddings e ON e.drop_id = d.id
  WHERE d.id = p_drop_id;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    1 - (e.embedding <=> v_embedding) AS similarity
  FROM drops d
  JOIN embeddings e ON e.drop_id = d.id
  WHERE d.user_id = v_user_id
    AND d.id != p_drop_id
    AND 1 - (e.embedding <=> v_embedding) > match_threshold
  ORDER BY e.embedding <=> v_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_drops_updated_at BEFORE UPDATE ON drops
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_memory_updated_at BEFORE UPDATE ON memory
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================
-- Schema created successfully.
-- Tables: profiles, drops, embeddings, conversations, memory, connections, sync_log
-- Functions: search_drops, find_similar_drops
-- RLS enabled on all tables
-- ============================================
