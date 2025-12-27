import { createServiceClient } from '../../lib/supabase.js';
import { generateEmbedding, formatForPostgres } from '../../lib/embeddings.js';

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { user_id, drops } = req.body;
    
    if (!user_id || !drops || !Array.isArray(drops)) {
      return res.status(400).json({ error: 'user_id and drops array required' });
    }
    
    const supabase = createServiceClient();
    const results = { synced: 0, errors: [] };
    
    for (const drop of drops) {
      try {
        // Upsert drop
        const { data: dropData, error: dropError } = await supabase
          .from('drops')
          .upsert({
            user_id,
            external_id: drop.id,
            content: drop.content || drop.text,
            category: drop.category || 'uncategorized',
            tags: drop.tags || [],
            source: 'droplit',
            metadata: drop.metadata || {},
            created_at: drop.created_at || new Date().toISOString()
          }, {
            onConflict: 'user_id,external_id'
          })
          .select()
          .single();
        
        if (dropError) throw dropError;
        
        // Generate and store embedding
        const embedding = await generateEmbedding(drop.content || drop.text);
        
        await supabase
          .from('embeddings')
          .upsert({
            drop_id: dropData.id,
            embedding: formatForPostgres(embedding)
          }, {
            onConflict: 'drop_id'
          });
        
        results.synced++;
      } catch (err) {
        results.errors.push({ id: drop.id, error: err.message });
      }
    }
    
    // Log sync
    await supabase.from('sync_log').insert({
      user_id,
      source: 'droplit',
      last_sync_at: new Date().toISOString(),
      items_synced: results.synced,
      status: results.errors.length ? 'partial' : 'success'
    });
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
