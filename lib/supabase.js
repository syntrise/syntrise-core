import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

export async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createAnonClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  return error ? null : { user, token };
}
