// Public values only. The publishable key is designed to be in browsers: it grants nothing on its own,
// because every table has row-level security and every admin function checks the allow-list and the
// 6-digit code step. Never put a secret or service-role key here.
export const SUPABASE_URL = 'https://bckhcixpwnrxzldynfuu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TIO92_n-baE5veioQTx6WQ_2EvF6dD8';
export const IDLE_MINUTES = 15;
