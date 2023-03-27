import { createClient } from "@supabase/supabase-js";

const supabaseDBURL = process.env.SUPBASE_DB_URL;
const supabaseDBKEY = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseDBURL, supabaseDBKEY);
