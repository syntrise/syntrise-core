import { createServiceClient } from '../../lib/supabase.js';
import { generateEmbedding, formatForPostgres } from '../../lib/embeddings.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { user_id, query, limit = 5, threshold = 0.3 } = req.body;
    
    if (!user_id || !query) {
      return res.status(400).json({ error: 'user_id and query required' });
    }
    
    console.log('Search request:', { user_id, query, limit, threshold });
    
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Embedding generated, length:', queryEmbedding?.length);
    
    const formattedEmbedding = formatForPostgres(queryEmbedding);
    console.log('Formatted embedding preview:', formattedEmbedding.substring(0, 100));
    
    const supabase = createServiceClient();
    
    const { data, error } = await supabase.rpc('search_drops', {
      query_embedding: formattedEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: user_id
    });
    
    console.log('RPC result:', { data, error });
    
    if (error) throw error;
    
    return res.status(200).json({
      results: data || [],
      query,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
