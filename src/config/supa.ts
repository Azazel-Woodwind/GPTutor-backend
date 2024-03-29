import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

const supabaseDBURL: string = process.env.SUPABASE_DB_URL;
const supabaseDBKEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient<Database>(supabaseDBURL, supabaseDBKEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

export default supabase;
