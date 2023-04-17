// @ts-nocheck

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseDBURL = process.env.SUPABASE_DB_URL;
const supabaseDBKEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseDBURL, supabaseDBKEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

export default supabase;
