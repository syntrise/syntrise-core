import { createServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const user_id = req.query.user_id || req.body?.user_id;
    const key = req.query.key || req.body?.key;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }
    
    const supabase = createServiceClient();
    
    let query = supabase.from('memory').select('*').eq('user_id', user_id);
    
    if (key) {
      query = query.eq('key', key);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform to key-value object
    const memory = {};
    for (const item of data || []) {
      memory[item.key] = item.value;
    }
    
    return res.status(200).json({ memory, count: data?.length || 0 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
