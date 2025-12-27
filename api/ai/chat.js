import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '../../lib/supabase.js';
import { generateEmbedding, formatForPostgres } from '../../lib/embeddings.js';
import { buildContextPrompt } from '../../lib/prompts.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CHAT_MODEL || 'claude-sonnet-4-20250514';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { user_id, messages, use_rag = true } = req.body;
    
    if (!user_id || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'user_id and messages array required' });
    }
    
    const supabase = createServiceClient();
    let context = {};
    
    // RAG: Retrieve relevant context
    if (use_rag) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      
      if (lastUserMessage) {
        // 1. Semantic search for relevant drops
        try {
          const queryEmbedding = await generateEmbedding(lastUserMessage.content);
          const { data: relevantDrops } = await supabase.rpc('search_drops', {
            query_embedding: formatForPostgres(queryEmbedding),
            match_threshold: 0.65,
            match_count: 5,
            p_user_id: user_id
          });
          context.relevantDrops = relevantDrops;
        } catch (e) {
          console.log('RAG search skipped:', e.message);
        }
        
        // 2. Get user memory
        const { data: memoryData } = await supabase
          .from('memory')
          .select('key, value')
          .eq('user_id', user_id);
        
        if (memoryData?.length) {
          context.userMemory = {};
          for (const item of memoryData) {
            context.userMemory[item.key] = item.value;
          }
        }
        
        // 3. Get recent conversation summary
        const { data: convData } = await supabase
          .from('conversations')
          .select('summary')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (convData?.summary) {
          context.conversationHistory = { summary: convData.summary };
        }
      }
    }
    
    // Build context-aware system prompt
    const systemPrompt = buildContextPrompt(context);
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });
    
    const assistantMessage = response.content[0].text;
    
    // Store conversation
    await supabase.from('conversations').insert({
      user_id,
      messages: [...messages, { role: 'assistant', content: assistantMessage }],
      updated_at: new Date().toISOString()
    });
    
    return res.status(200).json({
      message: assistantMessage,
      context_used: {
        drops_found: context.relevantDrops?.length || 0,
        has_memory: !!context.userMemory,
        has_history: !!context.conversationHistory
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}
