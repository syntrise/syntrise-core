import { createServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { user_id, key, value, source } = req.body;
    
    if (!user_id || !key || value === undefined) {
      return res.status(400).json({ error: 'user_id, key, and value required' });
    }
    
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('memory')
      .upsert({ user_id, key, value, source: source || 'api' }, { onConflict: 'user_id,key' })
      .select()
      .single();
    
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
