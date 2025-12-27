/**
 * Syntrise CORE — Memory Context API
 * POST /api/memory/context
 * 
 * Builds context for AI from user's drops and memory
 * This is the key integration point for Aski
 */

import { supabaseAdmin, verifyUser } from '../../lib/supabase.js';
import { generateEmbedding } from '../../lib/embeddings.js';
import { buildContextualPrompt } from '../../lib/prompts.js';
import { apiResponse, apiError, handleCors, extractToken } from '../../lib/utils.js';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCors(req, res)) return;
  
  // Only POST allowed
  if (req.method !== 'POST') {
    return apiError(res, 405, 'Method not allowed');
  }
  
  try {
    // Authenticate user
    const token = extractToken(req);
    if (!token) {
      return apiError(res, 401, 'Missing authorization token');
    }
    
    const { userId, error: authError } = await verifyUser(token);
    if (authError || !userId) {
      return apiError(res, 401, 'Invalid token', authError);
    }
    
    // Get the user's message for context
    const { message, include_drops = true, include_memory = true } = req.body;
    
    if (!message) {
      return apiError(res, 400, 'Missing message');
    }
    
    let relevantDrops = [];
    let userMemory = {};
    let recentConversations = [];
    
    // 1. Find relevant drops via semantic search
    if (include_drops) {
      const { embedding, error: embedError } = await generateEmbedding(message);
      
      if (!embedError && embedding) {
        const { data: drops } = await supabaseAdmin
          .rpc('search_drops', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: 5,
            p_user_id: userId
          });
        
        relevantDrops = drops || [];
      }
    }
    
    // 2. Get user memory
    if (include_memory) {
      const { data: memory } = await supabaseAdmin
        .from('memory')
        .select('key, value')
        .eq('user_id', userId);
      
      if (memory) {
        memory.forEach(m => {
          userMemory[m.key] = m.value;
        });
      }
    }
    
    // 3. Get recent conversations (last 3)
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id, title, summary, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3);
    
    recentConversations = conversations || [];
    
    // 4. Build contextual prompt
    const systemPrompt = buildContextualPrompt({
      relevantDrops,
      userMemory,
      recentConversations
    });
    
    return apiResponse(res, 200, {
      system_prompt: systemPrompt,
      context: {
        relevant_drops: relevantDrops,
        memory_keys: Object.keys(userMemory),
        recent_conversations: recentConversations.length
      }
    });
    
  } catch (error) {
    return apiError(res, 500, 'Internal server error', error);
  }
}
